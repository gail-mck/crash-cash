/*
 * hud.js
 * The always-visible stats card (top right on desktop, top of page on
 * mobile). Compact by default: month, age, expected income, expected
 * expenses, planned savings, credit score. Click to expand for net worth,
 * card utilization, debt, and the next tax season.
 */

import { el } from './components.js';
import { icon } from './icons.js';
import { usd, monthLabel, calendarMonth } from '../engine/format.js';
import { runPayroll } from '../engine/payroll.js';
import { totalDebt } from '../engine/debts.js';
import { netWorth, currentAge } from '../state.js';

let expanded = false;

export function renderHud(ctx) {
  const state = ctx.state;
  const s = hudStats(state);

  const row = (k, v, tone) => el('div', { class: 'hudrow' },
    el('span', { class: 'k' }, k),
    el('span', { class: 'v' + (tone ? ' ' + tone + '-text' : '') }, v));

  return el('aside', { class: 'hud', 'aria-label': 'Key stats' },
    el('button', {
      class: 'hud-head',
      onclick: () => { expanded = !expanded; ctx.refresh(); },
      'aria-expanded': String(expanded),
    },
      el('span', {},
        monthLabel(state.time.monthIndex, state.time.startYear, state.time.startMonth),
        el('span', { class: 'sub', style: 'display:block' }, 'Age ' + s.age + ' · ' + state.profile.name)),
      icon(expanded ? 'x' : 'plus', 14)),
    el('div', { class: 'hud-body' },
      row('Income (expected)', usd(s.income, { cents: false }), s.income > 0 ? 'good' : null),
      row('Expenses (planned)', usd(s.expenses, { cents: false }), s.expenses > s.income ? 'bad' : null),
      row('Auto-saving', usd(s.saving, { cents: false })),
      row('Credit score', s.score == null ? 'none yet' : String(s.score)),
      expanded ? el('div', { class: 'hud-extra' },
        row('Net worth', usd(s.netWorth, { cents: false })),
        row('Cash (checking)', usd(state.accounts.checking, { cents: false })),
        state.card ? row('Card used', s.utilization + '%', s.utilization > 30 ? 'bad' : null) : null,
        s.debt > 0 ? row('Debt', usd(s.debt, { cents: false }), 'bad') : null,
        s.investTotal > 0 ? row('Invested', usd(s.investTotal, { cents: false })) : null,
        row('Next tax season', s.nextTax),
      ) : null),
  );
}

/* All the derived numbers the HUD shows. Exported for tests. */
export function hudStats(state) {
  const pay = state.job
    ? runPayroll(state.job, state.ytd, { extraWithholding: state.settings.extraWithholding })
    : null;
  const income = pay ? pay.net : 0;
  const planned = state.budget.categories.reduce((sum, c) => sum + (Number(c.planned) || 0), 0);
  const debtMinimums = state.debts.reduce((sum, d) => sum + (d.principal > 0 ? d.minPayment : 0), 0);
  const expenses = planned + debtMinimums + (state.checkingMonthlyFee || 0);
  const saving = (Number(state.budget.autoSave.savings) || 0) + (Number(state.budget.autoSave.hysa) || 0);
  const investTotal = (state.investments || []).reduce((sum, i) => sum + Math.max(0, i.balance), 0);
  const calNow = calendarMonth(state.time.monthIndex, state.time.startMonth);
  const monthsToApril = (3 - calNow + 12) % 12 || 12;
  return {
    age: currentAge(state),
    income,
    expenses,
    saving,
    score: state.score.value,
    netWorth: netWorth(state),
    utilization: state.card && state.card.limit > 0
      ? Math.round((state.card.balance / state.card.limit) * 100) : 0,
    debt: totalDebt(state.debts),
    investTotal,
    nextTax: monthsToApril === 12 ? 'this month!' : 'in ' + monthsToApril + ' mo',
  };
}
