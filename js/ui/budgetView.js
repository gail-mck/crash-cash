/*
 * budgetView.js
 * Plan the month: income vs planned spending, a 50/30/20 reality check,
 * editable categories with debit/credit payment choice, and auto-save.
 */

import { el, whyButton, segmented, meter, pill } from './components.js';
import { icon } from './icons.js';
import { guideBanner, budgetStepButton } from './guide.js';
import { usd, pct, toCents } from '../engine/format.js';
import { runPayroll } from '../engine/payroll.js';

export function renderBudgetView(ctx) {
  return el('div', {},
    guideBanner(ctx),
    renderSummary(ctx),
    renderCategories(ctx),
    renderAutoSave(ctx),
    renderGuide(ctx),
    budgetStepButton(ctx),
  );
}

/* Monthly take-home for planning purposes. */
function takeHome(state) {
  if (!state.job) return 0;
  return runPayroll(state.job, state.ytd, { extraWithholding: state.settings.extraWithholding }).net;
}

function plannedTotal(state) {
  return toCents(state.budget.categories.reduce((s, c) => s + (Number(c.planned) || 0), 0));
}

function autoSaveTotal(state) {
  return toCents((Number(state.budget.autoSave.savings) || 0) + (Number(state.budget.autoSave.hysa) || 0));
}

/* 1. Income vs plan. */

function renderSummary(ctx) {
  const state = ctx.state;
  const income = takeHome(state);
  const spending = plannedTotal(state);
  const saving = autoSaveTotal(state);
  const committed = toCents(spending + saving);
  const left = toCents(income - committed);
  const ratio = income > 0 ? committed / income : (committed > 0 ? 1.5 : 0);
  const tone = ratio < 0.8 ? 'good' : ratio <= 1 ? 'warn' : 'bad';

  return el('div', { class: 'card' },
    el('h2', {}, icon('sliders', 20), ' This month\'s plan'),
    el('div', { class: 'grid cols-3' },
      bigStat('Take-home pay', usd(income), 'net-pay'),
      bigStat('Planned out', usd(committed), null, committed > 0 ? 'spending ' + usd(spending) + ' + saving ' + usd(saving) : ''),
      bigStat(left >= 0 ? 'Left over' : 'Over budget', usd(Math.abs(left)), null, null, left >= 0 ? 'good' : 'bad'),
    ),
    meter(Math.min(1, ratio), tone),
    el('p', { class: 'tiny mt' },
      income === 0 && committed > 0
        ? 'You are planning to spend with no income. Savings will drain, then checking, then the overdraft fees start. Try it if you want; that is what the sandbox is for.'
        : ratio > 1
          ? 'Your plan spends more than you make. Every month like this digs the hole ' + usd(committed - income) + ' deeper.'
          : ratio > 0.8
            ? 'Cutting it close. One surprise expense could tip you negative; a little slack absorbs life.'
            : 'Healthy gap. Leftover money piles up in checking; auto-save below puts it somewhere that grows.'),
  );
}

function bigStat(label, value, why, sub, tone) {
  return el('div', {},
    el('div', { class: 'tiny' }, label, why ? el('span', {}, ' ', whyButton(why)) : null),
    el('div', { style: 'font-size:1.35rem; font-weight:800' + (tone === 'bad' ? '; color:var(--bad)' : tone === 'good' ? '; color:var(--good)' : '') }, value),
    sub ? el('div', { class: 'tiny' }, sub) : null,
  );
}

/* 2. 50/30/20 reality check. */

function renderGuide(ctx) {
  const state = ctx.state;
  const income = takeHome(state);
  if (income <= 0) return null;
  const needs = toCents(state.budget.categories.filter((c) => c.kind === 'need').reduce((s, c) => s + (Number(c.planned) || 0), 0));
  const wants = toCents(state.budget.categories.filter((c) => c.kind === 'want').reduce((s, c) => s + (Number(c.planned) || 0), 0));
  const saves = autoSaveTotal(state);
  const row = (label, actualPct, guidePct, tone) => el('div', { class: 'mb' },
    el('div', { class: 'row between' },
      el('span', { class: 'tiny' }, label),
      el('span', { class: 'tiny' }, pct(actualPct, 0) + ' of income (guide: ' + guidePct + '%)')),
    meter(actualPct / 100, tone));
  const needsPct = (needs / income) * 100;
  const wantsPct = (wants / income) * 100;
  const savesPct = (saves / income) * 100;

  return el('div', { class: 'card mt' },
    el('h3', {}, icon('scale', 18), ' The 50/30/20 check', whyButton('5030-20-rule')),
    el('p', { class: 'tiny' }, 'A rough guide, not a law: about half for needs, under a third for wants, a fifth toward savings. Here is your plan against it:'),
    row('Needs', needsPct, 50, needsPct > 60 ? 'warn' : 'good'),
    row('Wants', wantsPct, 30, wantsPct > 40 ? 'warn' : 'good'),
    row('Saving', savesPct, 20, savesPct >= 15 ? 'good' : 'warn'),
  );
}

/* 3. Categories. */

function renderCategories(ctx) {
  const state = ctx.state;
  return el('div', { class: 'card mt' },
    el('div', { class: 'row between' },
      el('h3', {}, icon('wallet', 18), ' Spending categories'),
      el('button', {
        class: 'btn small',
        onclick: () => ctx.update((d) => {
          d.budget.categories.push({
            id: 'cat-' + Date.now(), name: 'New category', kind: 'want', planned: 25, method: 'debit',
          });
        }),
      }, '+ Add category')),
    state.budget.categories.length === 0
      ? el('p', { class: 'muted' }, 'No categories yet. Add what you actually spend on; the sim spends it every month.')
      : state.budget.categories.map((cat, i) => renderCategoryRow(ctx, cat, i)),
    el('p', { class: 'tiny mt' }, 'Each Next Month, these amounts are spent automatically using the payment method you chose. Needs vs wants only affects your 50/30/20 check, not the math.'),
  );
}

function renderCategoryRow(ctx, cat, index) {
  const nameIn = el('input', {
    type: 'text', value: cat.name,
    onchange: (e) => ctx.update((d) => { d.budget.categories[index].name = e.target.value.trim() || cat.name; }),
  });
  const amountIn = el('input', {
    type: 'number', min: '0', step: '5', value: cat.planned,
    onchange: (e) => ctx.update((d) => { d.budget.categories[index].planned = Math.max(0, Number(e.target.value) || 0); }),
  });
  const hasCard = !!ctx.state.card;
  return el('div', { style: 'padding:12px 0; border-top:1px dashed var(--line)' },
    el('div', { class: 'grid cols-3' },
      el('label', { class: 'field', style: 'margin:0' }, el('span', {}, 'Category'), nameIn),
      el('label', { class: 'field', style: 'margin:0' }, el('span', {}, 'Per month'), amountIn),
      el('div', { class: 'field', style: 'margin:0' },
        el('span', { style: 'display:block; margin-bottom:5px; font-size:.84rem; font-weight:600; color:var(--text-soft)' }, 'Details'),
        el('div', { class: 'row' },
          segmented([
            { value: 'need', label: 'Need' },
            { value: 'want', label: 'Want' },
          ], cat.kind, (v) => ctx.update((d) => { d.budget.categories[index].kind = v; })),
          segmented(
            hasCard
              ? [{ value: 'debit', label: 'Debit' }, { value: 'credit', label: 'Credit' }]
              : [{ value: 'debit', label: 'Debit' }],
            cat.method === 'credit' && !hasCard ? 'debit' : cat.method,
            (v) => ctx.update((d) => { d.budget.categories[index].method = v; })),
          el('button', {
            class: 'btn small danger', 'aria-label': 'Delete category',
            onclick: () => ctx.update((d) => { d.budget.categories.splice(index, 1); }),
          }, '✕'))),
    ),
    !hasCard && cat.method !== 'credit'
      ? null
      : cat.method === 'credit'
        ? el('p', { class: 'tiny', style: 'margin:6px 0 0' }, 'Goes on the credit card: builds history if you pay it off, builds a balance if you do not.')
        : null,
    !hasCard ? el('p', { class: 'tiny', style: 'margin:6px 0 0' }, '') : null,
  );
}

/* 4. Auto-save. */

function renderAutoSave(ctx) {
  const state = ctx.state;
  const field = (key, label, hint) => el('label', { class: 'field' },
    el('span', {}, label),
    el('input', {
      type: 'number', min: '0', step: '10', value: state.budget.autoSave[key],
      onchange: (e) => ctx.update((d) => { d.budget.autoSave[key] = Math.max(0, Number(e.target.value) || 0); }),
    }),
    el('span', { class: 'tiny' }, hint));
  return el('div', { class: 'card mt' },
    el('h3', {}, icon('sprout', 18), ' Pay yourself first', whyButton('emergency-fund')),
    el('p', { class: 'tiny' }, 'Every month, right after spending, these transfers happen automatically. Saving that runs itself is saving that actually happens.'),
    el('div', { class: 'grid cols-2' },
      field('savings', 'To savings (' + pct(state.rates.savingsApy) + ' APY)', 'Easy access, barely grows.'),
      field('hysa', 'To high-yield savings (' + pct(state.rates.hysaApy) + ' APY)', 'Same safety, ' + Math.round(state.rates.hysaApy / Math.max(0.1, state.rates.savingsApy)) + 'x the growth.'),
    ),
    el('p', { class: 'tiny' }, 'If checking cannot cover a transfer that month, it simply skips instead of overdrafting.'),
  );
}
