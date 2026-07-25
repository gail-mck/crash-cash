/*
 * engine.js
 * The monthly tick: one call to advanceMonth() simulates one month of
 * financial life and returns a detailed report the UI turns into the
 * Month Report screen.
 *
 * Order of operations each month:
 *   1. Payroll lands in checking (taxes, retirement, match handled).
 *   2. Loan minimums are paid automatically from checking.
 *   3. Budget spending happens (debit from checking, credit on the card).
 *   4. A random life event may fire (paid per the player's setting).
 *   5. Automatic saving transfers move money to savings / HYSA.
 *   6. Credit card: interest accrues if a balance carried, the statement
 *      cuts, then autopay runs.
 *   7. Interest and growth land (savings, HYSA, retirement).
 *   8. Overdraft fee if checking ended below zero.
 *   9. Credit score updates.
 *  10. In April, tax season reconciles last year's withholding.
 *
 * The random source is injected so tests are deterministic.
 */

import { toCents, calendarMonth } from './format.js';
import { runPayroll } from './payroll.js';
import {
  monthlyInterest, monthlyGrowth, spendFromChecking, OVERDRAFT_FEE,
} from './accounts.js';
import { accrueInterest, cutStatement, applyPayment, charge, minimumPayment } from './credit.js';
import { computeScore } from './creditScore.js';
import { tickDebt, totalDebt } from './debts.js';
import { reconcileYear } from './tax.js';
import { checkGoal } from './goals.js';
import { netWorth, emptyYtd, logTxn, DIFFICULTIES } from '../state.js';

/*
 * Advance the simulation by one month.
 * `state` is mutated via structuredClone (the original is untouched).
 * `eventsPool` is the EVENTS dataset; `rng` returns [0, 1).
 * Returns { state, report }.
 */
export function advanceMonth(prevState, eventsPool = [], rng = Math.random) {
  const state = structuredClone(prevState);
  const report = {
    monthIndex: state.time.monthIndex,
    paycheck: null,
    debts: [],
    spending: [],
    spendingTotals: { debit: 0, credit: 0, declined: 0 },
    event: null,
    autoSave: { savings: 0, hysa: 0 },
    cardStatement: null,
    interest: { savings: 0, hysa: 0, retirement: 0 },
    overdraftFee: 0,
    taxSeason: null,
    score: { before: state.score.value, after: null },
    netWorth: { before: netWorth(state), after: 0 },
  };

  /* 1. Payroll. */
  if (state.job) {
    const pay = runPayroll(state.job, state.ytd, {
      extraWithholding: state.settings.extraWithholding,
    });
    report.paycheck = pay;
    state.accounts.checking = toCents(state.accounts.checking + pay.net);
    state.accounts.retirement = toCents(state.accounts.retirement + pay.retirement + pay.match);
    state.ytd.gross = toCents(state.ytd.gross + pay.gross);
    state.ytd.incomeTaxable = toCents(state.ytd.incomeTaxable + pay.incomeTaxable);
    state.ytd.ficaWages = toCents(state.ytd.ficaWages + pay.ficaWages);
    state.ytd.fedWithheld = toCents(state.ytd.fedWithheld + pay.federal);
    state.ytd.stateWithheld = toCents(state.ytd.stateWithheld + pay.state);
    state.ytd.fica = toCents(state.ytd.fica + pay.fica.total);
    state.ytd.retirement = toCents(state.ytd.retirement + pay.retirement);
    state.ytd.match = toCents(state.ytd.match + pay.match);
    if (pay.net > 0) logTxn(state, { type: 'income', label: 'Paycheck (direct deposit)', amount: pay.net, account: 'checking' });
  }

  /* 2. Loan minimum payments, oldest first. */
  for (let i = 0; i < state.debts.length; i++) {
    const debt = state.debts[i];
    if (debt.principal <= 0) continue;
    const wanted = Math.min(debt.minPayment, toCents(debt.principal + debt.principal * (debt.apr / 100) / 12));
    const attempt = spendFromChecking(state.accounts.checking, wanted);
    const result = tickDebt(debt, attempt.spent);
    state.accounts.checking = attempt.newBalance;
    state.debts[i] = result.debt;
    report.debts.push({
      name: debt.name, kind: debt.kind, paid: result.paid,
      interest: result.interest, principalPaid: result.principalPaid,
      done: result.done, shortfall: attempt.declined > 0 || attempt.spent < wanted,
    });
    if (result.paid > 0) logTxn(state, { type: 'debt', label: 'Payment: ' + debt.name, amount: -result.paid, account: 'checking' });
  }

  /* 3. Budget spending. */
  for (const cat of state.budget.categories) {
    const planned = toCents(cat.planned);
    if (planned <= 0) continue;
    let paidByCredit = 0;
    let paidByDebit = 0;
    let declined = 0;
    if (cat.method === 'credit' && state.card) {
      const res = charge(state.card, planned);
      state.card = res.card;
      paidByCredit = res.charged;
      /* Anything over the card limit falls back to checking. */
      if (res.declined > 0) {
        const fallback = spendFromChecking(state.accounts.checking, res.declined);
        state.accounts.checking = fallback.newBalance;
        paidByDebit = fallback.spent;
        declined = fallback.declined;
      }
    } else {
      const res = spendFromChecking(state.accounts.checking, planned);
      state.accounts.checking = res.newBalance;
      paidByDebit = res.spent;
      declined = res.declined;
    }
    report.spending.push({ name: cat.name, kind: cat.kind, planned, paidByDebit, paidByCredit, declined });
    report.spendingTotals.debit = toCents(report.spendingTotals.debit + paidByDebit);
    report.spendingTotals.credit = toCents(report.spendingTotals.credit + paidByCredit);
    report.spendingTotals.declined = toCents(report.spendingTotals.declined + declined);
    const spentTotal = toCents(paidByDebit + paidByCredit);
    if (spentTotal > 0) {
      logTxn(state, {
        type: 'spend', label: cat.name, amount: -spentTotal,
        account: paidByCredit > 0 ? 'card' : 'checking',
      });
    }
  }

  /* 4. Random life event. */
  const difficulty = DIFFICULTIES.find((d) => d.id === state.profile.difficulty) || DIFFICULTIES[1];
  const event = rollEvent(state, eventsPool, difficulty.eventChance, rng);
  if (event) {
    report.event = event;
    if (event.kind === 'windfall') {
      state.accounts.checking = toCents(state.accounts.checking + event.amount);
      logTxn(state, { type: 'event', label: event.title, amount: event.amount, account: 'checking' });
    } else {
      applyEventExpense(state, report, event);
    }
  }

  /* 5. Automatic saving. Transfers skip when checking cannot cover them. */
  for (const target of ['savings', 'hysa']) {
    const amount = toCents(state.budget.autoSave[target] || 0);
    if (amount > 0 && state.accounts.checking >= amount) {
      state.accounts.checking = toCents(state.accounts.checking - amount);
      state.accounts[target] = toCents(state.accounts[target] + amount);
      report.autoSave[target] = amount;
      logTxn(state, { type: 'save', label: 'Auto-save to ' + (target === 'hysa' ? 'high-yield savings' : 'savings'), amount, account: target });
    }
  }

  /* 6. Credit card interest, statement, autopay. */
  if (state.card) {
    const accrued = accrueInterest(state.card);
    state.card = cutStatement(accrued.card);
    const minDue = minimumPayment(state.card.statementBalance);
    const requested = autopayAmount(state.settings.cardAutopay, state.card.statementBalance, minDue);
    const available = Math.max(0, state.accounts.checking);
    const payRes = applyPayment(state.card, requested, available);
    state.accounts.checking = toCents(state.accounts.checking - payRes.paid);
    state.card = payRes.card;
    report.cardStatement = {
      statementBalance: cutStatementBalance(payRes, state.card),
      interest: accrued.interest,
      minDue,
      paid: payRes.paid,
      lateFee: payRes.lateFee,
      status: payRes.status,
      endingBalance: state.card.balance,
      utilizationPct: state.card.limit > 0 ? Math.round((state.card.balance / state.card.limit) * 1000) / 10 : 0,
    };
    if (payRes.paid > 0) logTxn(state, { type: 'card', label: 'Credit card payment', amount: -payRes.paid, account: 'checking' });
    if (payRes.lateFee > 0) logTxn(state, { type: 'fee', label: 'Credit card late fee', amount: -payRes.lateFee, account: 'card' });
  }

  /* 7. Interest and growth. */
  report.interest.savings = monthlyInterest(state.accounts.savings, state.rates.savingsApy);
  report.interest.hysa = monthlyInterest(state.accounts.hysa, state.rates.hysaApy);
  report.interest.retirement = monthlyGrowth(state.accounts.retirement, state.rates.retirementReturn);
  state.accounts.savings = toCents(state.accounts.savings + report.interest.savings);
  state.accounts.hysa = toCents(state.accounts.hysa + report.interest.hysa);
  state.accounts.retirement = toCents(state.accounts.retirement + report.interest.retirement);
  if (report.interest.hysa > 0) logTxn(state, { type: 'interest', label: 'High-yield interest earned', amount: report.interest.hysa, account: 'hysa' });
  if (report.interest.savings > 0) logTxn(state, { type: 'interest', label: 'Savings interest earned', amount: report.interest.savings, account: 'savings' });

  /* 8. Overdraft fee: one per month spent below zero. */
  if (state.accounts.checking < 0) {
    state.accounts.checking = toCents(state.accounts.checking - OVERDRAFT_FEE);
    report.overdraftFee = OVERDRAFT_FEE;
    logTxn(state, { type: 'fee', label: 'Overdraft fee', amount: -OVERDRAFT_FEE, account: 'checking' });
  }

  /* 9. Credit score. */
  const scored = computeScore({ card: state.card, debts: state.debts, monthIndex: state.time.monthIndex });
  state.score.value = scored.score;
  state.score.parts = scored.parts;
  if (scored.score != null) {
    state.score.history.push({ monthIndex: state.time.monthIndex, score: scored.score });
    if (state.score.history.length > 120) state.score.history.shift();
  }
  report.score.after = scored.score;

  /* 10. Tax season each April (skipped in the sim's very first April if no
     full prior year exists; ytd resets every January regardless). */
  const calMonth = calendarMonth(state.time.monthIndex, state.time.startMonth);
  if (calMonth === 11) {
    /* December: archive the year for April's reconciliation. */
    state.lastYearTax = { ...state.ytd };
  }
  if (calMonth === 0 && state.time.monthIndex > 0) {
    state.ytd = emptyYtd();
  }
  if (calMonth === 3 && state.lastYearTax && !state.lastYearTax.settled) {
    const rec = reconcileYear(state.lastYearTax);
    report.taxSeason = rec;
    state.accounts.checking = toCents(state.accounts.checking + rec.refund);
    state.lastYearTax = { ...state.lastYearTax, settled: true, refund: rec.refund };
    logTxn(state, {
      type: 'tax',
      label: rec.refund >= 0 ? 'Tax refund' : 'Tax bill paid',
      amount: rec.refund,
      account: 'checking',
    });
  }

  /* 11. Challenge goal progress (challenge mode only; null otherwise). */
  report.goal = checkGoal(state);

  /* Wrap up: history snapshot and month advance. */
  report.netWorth.after = netWorth(state);
  state.history.push({
    monthIndex: state.time.monthIndex,
    netWorth: report.netWorth.after,
    checking: state.accounts.checking,
    savings: state.accounts.savings,
    hysa: state.accounts.hysa,
    retirement: state.accounts.retirement,
    cardBalance: state.card ? state.card.balance : 0,
    debtTotal: totalDebt(state.debts),
    score: state.score.value,
  });
  if (state.history.length > 240) state.history.shift();
  state.time.monthIndex += 1;
  state.report = report;
  return { state, report };
}

/* Pick this month's event, if any. Exported for tests. */
export function rollEvent(state, eventsPool, chance, rng) {
  if (!eventsPool.length || rng() >= chance) return null;
  const minAge = parseInt(String(state.profile.ageBand).split('-')[0], 10) || 12;
  const eligible = eventsPool.filter((e) => minAge >= e.minAge);
  if (!eligible.length) return null;
  const totalWeight = eligible.reduce((s, e) => s + e.weight, 0);
  let roll = rng() * totalWeight;
  let picked = eligible[eligible.length - 1];
  for (const e of eligible) {
    roll -= e.weight;
    if (roll <= 0) { picked = e; break; }
  }
  const span = picked.amountMax - picked.amountMin;
  const amount = toCents(picked.amountMin + rng() * span);
  return {
    id: picked.id, title: picked.title, emoji: picked.emoji,
    kind: picked.kind, amount, blurb: picked.blurb, lesson: picked.lesson,
  };
}

/* Pay an expense event using the player's chosen method with fallbacks. */
function applyEventExpense(state, report, event) {
  let remaining = event.amount;
  const method = state.settings.eventPayMethod;
  event.paidWith = [];

  if (method === 'credit' && state.card) {
    const res = charge(state.card, remaining);
    state.card = res.card;
    if (res.charged > 0) event.paidWith.push({ source: 'card', amount: res.charged });
    remaining = res.declined;
  } else if (method === 'savings') {
    const fromSavings = toCents(Math.min(state.accounts.savings, remaining));
    if (fromSavings > 0) {
      state.accounts.savings = toCents(state.accounts.savings - fromSavings);
      event.paidWith.push({ source: 'savings', amount: fromSavings });
      remaining = toCents(remaining - fromSavings);
    }
  }
  if (remaining > 0) {
    const res = spendFromChecking(state.accounts.checking, remaining);
    state.accounts.checking = res.newBalance;
    if (res.spent > 0) event.paidWith.push({ source: 'checking', amount: res.spent });
    /* If checking hits its floor the rest lands on savings, then is forgiven.
       Kids' games should not create unpayable holes; the lesson still lands. */
    if (res.declined > 0) {
      const fromSavings = toCents(Math.min(state.accounts.savings, res.declined));
      if (fromSavings > 0) {
        state.accounts.savings = toCents(state.accounts.savings - fromSavings);
        event.paidWith.push({ source: 'savings', amount: fromSavings });
      }
      event.unpaid = toCents(res.declined - fromSavings);
    }
  }
  logTxn(state, { type: 'event', label: event.title, amount: -toCents(event.amount - (event.unpaid || 0)), account: 'checking' });
}

/* Resolve the autopay setting into a requested payment amount. */
function autopayAmount(setting, statementBalance, minDue) {
  if (setting === 'full') return statementBalance;
  if (setting === 'min') return minDue;
  if (setting === 'none') return 0;
  const custom = Number(setting);
  return Number.isFinite(custom) ? Math.max(0, custom) : statementBalance;
}

/* The statement balance as it stood when the statement cut this month. */
function cutStatementBalance(payRes, card) {
  return card.statementBalance;
}
