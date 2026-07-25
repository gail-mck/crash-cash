/*
 * bankView.js
 * The account center: balances, transfers, the credit card, the credit
 * score breakdown, debts, and the "when life happens, pay from" setting.
 */

import { el, whyButton, statRow, pill, meter, segmented, openModal, closeBtn } from './components.js';
import { usd, pct, toCents } from '../engine/format.js';
import { transfer } from '../engine/accounts.js';
import { openCard, minimumPayment, applyPayment } from '../engine/credit.js';
import { scoreBand } from '../engine/creditScore.js';
import { createDebt, DEBT_KINDS, suggestedPayment } from '../engine/debts.js';
import { monthlyGross } from '../engine/payroll.js';
import { canHaveCard } from '../state.js';

export function renderBankView(ctx) {
  return el('div', {},
    renderAccounts(ctx),
    renderTransferCard(ctx),
    renderCardSection(ctx),
    renderScoreDetail(ctx),
    renderDebtsSection(ctx),
    renderEventPref(ctx),
  );
}

/* 1. Balances */

function renderAccounts(ctx) {
  const { accounts: a, rates } = ctx.state;
  const item = (label, bal, sub, why) => el('div', { class: 'card acct' + (bal < 0 ? ' negative' : '') },
    el('div', { class: 'label' }, label, whyButton(why)),
    el('div', { class: 'bal' }, usd(bal)),
    el('div', { class: 'sub' }, sub));
  return el('div', { class: 'grid autofit mb' },
    item('💳 Checking', a.checking, a.checking < 0 ? 'Overdrafted! Fees apply until this is back above zero.' : 'Spending money. Earns nothing.', 'checking-account'),
    item('🏦 Savings', a.savings, pct(ctx.state.rates.savingsApy) + ' APY. Safe, slow.', 'savings-account'),
    item('🌱 High-Yield Savings', a.hysa, pct(rates.hysaApy) + ' APY. Same safety, roughly ' + Math.round(rates.hysaApy / Math.max(0.1, rates.savingsApy)) + 'x the interest.', 'high-yield-savings'),
    item('🔒 Retirement', a.retirement, 'Locked until retirement. Grows at ' + pct(rates.retirementReturn) + ' expected per year. Fed only by paychecks.', 'compound-interest'),
  );
}

/* 2. Transfers */

function renderTransferCard(ctx) {
  const names = { checking: 'Checking', savings: 'Savings', hysa: 'High-Yield Savings' };
  let from = 'checking';
  let to = 'hysa';
  const error = el('p', { class: 'tiny bad-text', style: 'min-height:1em' });
  const amount = el('input', { type: 'number', min: '0', step: '1', placeholder: '50' });

  const fromSel = el('select', { onchange: (e) => { from = e.target.value; } },
    Object.entries(names).map(([v, l]) => el('option', { value: v, selected: v === from }, l)));
  const toSel = el('select', { onchange: (e) => { to = e.target.value; } },
    Object.entries(names).map(([v, l]) => el('option', { value: v, selected: v === to }, l)));

  return el('div', { class: 'card' },
    el('h3', {}, '↔️ Move money'),
    el('div', { class: 'grid cols-3' },
      el('label', { class: 'field' }, el('span', {}, 'From'), fromSel),
      el('label', { class: 'field' }, el('span', {}, 'To'), toSel),
      el('label', { class: 'field' }, el('span', {}, 'Amount'), amount),
    ),
    el('div', { class: 'row' },
      el('button', {
        class: 'btn primary',
        onclick: () => {
          const res = transfer(ctx.state.accounts, from, to, Number(amount.value));
          if (!res.ok) { error.textContent = res.error; return; }
          ctx.update((draft) => { draft.accounts = res.accounts; });
        },
      }, 'Move it'),
      el('span', { class: 'tiny' }, 'Retirement is missing on purpose: that money only arrives through your paycheck, and it does not come back out.'),
    ),
    error,
  );
}

/* 3. Credit card */

function renderCardSection(ctx) {
  const state = ctx.state;
  if (state.card) return renderCardManager(ctx);
  if (!canHaveCard(state)) {
    return el('div', { class: 'card mt' },
      el('h3', {}, '💥 Credit card'),
      el('p', { class: 'muted' }, 'Under 18, you cannot open your own credit card: a card is a loan, and minors cannot sign loan contracts. In this run, credit unlocks when you start at 18 or older.'),
      el('p', { class: 'tiny' }, 'Real-world equivalents in the meantime: being an authorized user on a parent\'s card, or a debit card, which spends only money you have. ', whyButton('debit-card')),
    );
  }
  const gross = monthlyGross(state.job);
  const limit = !state.job ? 500 : gross < 2500 ? 1000 : 1500;
  return el('div', { class: 'card mt' },
    el('h3', {}, '💥 Open your first credit card'),
    el('p', { class: 'muted' }, 'A card builds credit history when used well, and burns money when it is not. Both are worth experiencing here, where it is free.'),
    statRow('Credit limit', usd(limit, { cents: false }), { why: 'credit-limit' }),
    statRow('APR if you carry a balance', pct(state.rates.cardApr), { why: 'apr' }),
    statRow('Annual fee', usd(0, { cents: false })),
    el('p', { class: 'tiny' }, 'Applying triggers a hard inquiry, which dips your score for a little while. ', whyButton('hard-inquiry')),
    el('button', {
      class: 'btn primary mt',
      onclick: () => ctx.update((draft) => {
        draft.card = openCard(limit, draft.rates.cardApr, draft.time.monthIndex);
      }),
    }, 'Open the card'),
  );
}

function renderCardManager(ctx) {
  const state = ctx.state;
  const card = state.card;
  const util = card.limit > 0 ? (card.balance / card.limit) * 100 : 0;
  const minDue = minimumPayment(card.statementBalance);
  const payInput = el('input', { type: 'number', min: '0', step: '1', placeholder: '25' });
  const payNote = el('span', { class: 'tiny' });

  return el('div', { class: 'card mt' },
    el('div', { class: 'row between' },
      el('h3', {}, '💥 Credit card'),
      pill(usd(card.limit - card.balance) + ' available', util > 70 ? 'bad' : util > 30 ? 'warn' : 'good')),
    statRow('Balance', usd(card.balance)),
    statRow('Limit', usd(card.limit, { cents: false }), { why: 'credit-limit' }),
    statRow('Last statement', usd(card.statementBalance), { why: 'statement-balance' }),
    statRow('Minimum due', usd(minDue), { why: 'minimum-payment' }),
    el('div', { class: 'mt' },
      el('div', { class: 'row between' },
        el('span', { class: 'tiny' }, 'Utilization: ' + Math.round(util) + '% ', whyButton('credit-utilization')),
        el('span', { class: 'tiny' }, 'under 30% keeps scores happy')),
      meter(util / 100, util > 70 ? 'bad' : util > 30 ? 'warn' : 'good')),
    el('div', { class: 'mt' },
      el('span', { class: 'tiny', style: 'display:block; margin-bottom:6px' }, 'Each month, automatically pay:'),
      segmented([
        { value: 'full', label: 'Full balance' },
        { value: 'min', label: 'Minimum only' },
        { value: 'none', label: 'Nothing' },
      ], state.settings.cardAutopay, (v) => ctx.update((d) => { d.settings.cardAutopay = v; })),
      el('p', { class: 'tiny mt' }, state.settings.cardAutopay === 'full'
        ? 'Paying in full every month means the card never charges you a cent of interest.'
        : state.settings.cardAutopay === 'min'
          ? 'Minimum payments keep you "on time" but the rest of the balance grows at ' + pct(state.rates.cardApr) + ' APR. Watch what that costs.'
          : 'Paying nothing means late fees, a hurt score, and compounding interest. Try it here, never out there.')),
    el('div', { class: 'row mt' },
      el('span', { style: 'max-width:140px' }, payInput),
      el('button', {
        class: 'btn',
        onclick: () => {
          const want = Number(payInput.value);
          if (!(want > 0)) { payNote.textContent = 'Enter an amount first.'; return; }
          if (card.balance <= 0) { payNote.textContent = 'Nothing to pay. Nice.'; return; }
          ctx.update((draft) => {
            const res = applyPayment(draft.card, want, Math.max(0, draft.accounts.checking));
            draft.card = res.card;
            draft.accounts.checking = toCents(draft.accounts.checking - res.paid);
          });
        },
      }, 'Pay from checking now'),
      payNote),
  );
}

/* 4. Credit score breakdown */

function renderScoreDetail(ctx) {
  const { score } = ctx.state;
  if (score.value == null) {
    return el('div', { class: 'card mt' },
      el('h3', {}, '📈 Credit score', whyButton('credit-score')),
      el('p', { class: 'muted' }, 'No score yet: scores only exist once you have credit (a card or a loan) reporting on you.'),
    );
  }
  const parts = score.parts || {};
  const factors = [
    ['Payment history (35%)', parts.history, 'Every on-time payment builds this. Late marks crush it.'],
    ['Utilization (30%)', parts.utilization, 'How much of your limit you are using. Lower is better.'],
    ['Credit age (15%)', parts.age, 'Time does this one for you. Keep old accounts alive.'],
    ['New credit (10%)', parts.newCredit, 'Hard inquiries from new applications sting briefly.'],
    ['Credit mix (10%)', parts.mix, 'Different kinds of credit, handled well, help a little.'],
  ];
  const weakest = factors.reduce((worst, f) => (f[1] != null && (worst == null || f[1] < worst[1]) ? f : worst), null);
  return el('div', { class: 'card mt' },
    el('div', { class: 'row between' },
      el('h3', {}, '📈 Credit score: ' + score.value),
      pill(scoreBand(score.value), score.value >= 670 ? 'good' : score.value >= 580 ? 'warn' : 'bad')),
    factors.map(([label, val, tip]) => el('div', { class: 'mb' },
      el('div', { class: 'row between' },
        el('span', { class: 'tiny' }, label),
        el('span', { class: 'tiny' }, val != null ? Math.round(val * 100) + '/100' : '')),
      meter(val || 0, (val || 0) > 0.7 ? 'good' : (val || 0) > 0.4 ? 'warn' : 'bad'))),
    weakest ? el('p', { class: 'tiny' }, '💡 Biggest opportunity: ' + weakest[0].replace(/ \(\d+%\)/, '') + '. ' + weakest[2]) : null,
  );
}

/* 5. Debts */

function renderDebtsSection(ctx) {
  const debts = ctx.state.debts;
  return el('div', { class: 'card mt' },
    el('div', { class: 'row between' },
      el('h3', {}, '⚖️ Debts', whyButton('debt')),
      el('button', { class: 'btn small', onclick: () => openAddDebt(ctx) }, '+ Add a debt')),
    debts.filter((d) => d.principal > 0).length === 0
      ? el('p', { class: 'muted' }, 'No debts. If you want to feel what a student loan or a family loan does to a budget, add one: this is the safe place to find out.')
      : debts.map((d, i) => d.principal > 0 ? renderDebtRow(ctx, d, i) : null),
  );
}

function renderDebtRow(ctx, d, index) {
  const progress = d.originalPrincipal > 0 ? 1 - d.principal / d.originalPrincipal : 0;
  const extraInput = el('input', { type: 'number', min: '0', step: '5', placeholder: '25', style: 'max-width:110px' });
  return el('div', { class: 'mb', style: 'padding:10px 0; border-top:1px dashed var(--line)' },
    el('div', { class: 'row between' },
      el('b', {}, d.name),
      el('span', {}, usd(d.principal), ' ', pill(d.apr > 0 ? pct(d.apr) + ' APR' : 'no interest', d.apr > 0 ? 'warn' : 'good'))),
    meter(progress, 'good'),
    el('div', { class: 'row mt' },
      el('span', { class: 'tiny' }, 'Auto-pays ' + usd(d.minPayment) + '/month.' + (d.kind === 'family' ? ' Family loans charge no interest, but they are still owed to someone who trusts you.' : '')),
      el('span', { class: 'spacer' }),
      extraInput,
      el('button', {
        class: 'btn small',
        onclick: () => {
          const amt = Number(extraInput.value);
          if (!(amt > 0)) return;
          ctx.update((draft) => {
            const debt = draft.debts[index];
            const pay = toCents(Math.min(amt, Math.max(0, draft.accounts.checking), debt.principal));
            debt.principal = toCents(debt.principal - pay);
            debt.totalPaid = toCents(debt.totalPaid + pay);
            draft.accounts.checking = toCents(draft.accounts.checking - pay);
          });
        },
      }, 'Pay extra')),
  );
}

function openAddDebt(ctx) {
  let kind = 'student';
  openModal((close) => {
    const nameIn = el('input', { type: 'text', placeholder: 'e.g. Student loan' });
    const amountIn = el('input', { type: 'number', min: '1', placeholder: '3500' });
    const aprIn = el('input', { type: 'number', min: '0', step: '0.5', value: '6.5' });
    const err = el('p', { class: 'tiny bad-text' });
    const kindSel = el('select', {
      onchange: (e) => {
        kind = e.target.value;
        const dk = DEBT_KINDS.find((k) => k.kind === kind);
        if (dk) { aprIn.value = dk.defaultApr; if (!nameIn.value) nameIn.placeholder = dk.label; }
      },
    }, DEBT_KINDS.map((k) => el('option', { value: k.kind }, k.label)));
    return [
      closeBtn(close),
      el('h2', {}, 'Add a debt'),
      el('p', { class: 'muted' }, 'Simulate owing money and feel what it does to every month after.'),
      el('label', { class: 'field' }, el('span', {}, 'Kind'), kindSel),
      el('label', { class: 'field' }, el('span', {}, 'Name'), nameIn),
      el('label', { class: 'field' }, el('span', {}, 'Amount owed'), amountIn),
      el('label', { class: 'field' }, el('span', {}, 'APR %'), aprIn),
      err,
      el('button', {
        class: 'btn primary',
        onclick: () => {
          const principal = Number(amountIn.value);
          const apr = Number(aprIn.value);
          if (!(principal > 0)) { err.textContent = 'Enter how much is owed.'; return; }
          ctx.update((draft) => {
            draft.debts.push(createDebt({
              name: nameIn.value.trim() || undefined, kind,
              principal, apr: Math.max(0, apr || 0),
              minPayment: suggestedPayment(principal, Math.max(0, apr || 0)),
            }));
          });
          close();
        },
      }, 'Take on this debt'),
    ];
  });
}

/* 6. Event payment preference */

function renderEventPref(ctx) {
  const options = [
    { value: 'checking', label: 'Checking' },
    { value: 'savings', label: 'Savings first' },
  ];
  if (ctx.state.card) options.push({ value: 'credit', label: 'Credit card' });
  return el('div', { class: 'card mt' },
    el('h3', {}, '🎲 When life surprises you, pay from...'),
    segmented(options, ctx.state.settings.eventPayMethod, (v) => ctx.update((d) => { d.settings.eventPayMethod = v; })),
    el('p', { class: 'tiny mt' }, 'Surprise expenses will hit this first, then fall back to checking. Each choice teaches something different about buffers.'),
  );
}
