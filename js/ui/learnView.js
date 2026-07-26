/*
 * learnView.js
 * The Learn tab: your last month explained, your paycheck's path through
 * the tax brackets (with your real numbers), big-lever comparisons, the
 * glossary, and an honest list of what the simulation simplifies.
 */

import { el, mount, whyButton, statRow, segmented } from './components.js';
import { icon } from './icons.js';
import { usd, pct, toCents } from '../engine/format.js';
import { FEDERAL_BRACKETS, STANDARD_DEDUCTION, federalTaxOnTaxable } from '../engine/tax.js';
import { runPayroll } from '../engine/payroll.js';
import { monthlyInterest } from '../engine/accounts.js';
import { GLOSSARY } from '../../data/glossary.js';
import { showMonthReport } from './reportModal.js';

export function renderLearnView(ctx) {
  return el('div', {},
    renderLastMonth(ctx),
    renderTaxWalkthrough(ctx),
    renderBigLevers(ctx),
    renderGlossary(ctx),
    renderSimplifications(),
  );
}

/* 1. Reopen the last report. */

function renderLastMonth(ctx) {
  return el('div', { class: 'card' },
    el('h3', {}, icon('save', 18), ' Your last month, explained'),
    ctx.state.report
      ? el('div', {},
          el('p', { class: 'muted' }, 'Reopen the full breakdown of what happened last month and why.'),
          el('button', { class: 'btn primary', onclick: () => showMonthReport(ctx, ctx.state.report) }, 'Open last report'))
      : el('p', { class: 'muted' }, 'Play a month first. Afterward, every month gets a full plain-language report you can revisit here.'),
  );
}

/* 2. Tax brackets with the player's own numbers. */

function renderTaxWalkthrough(ctx) {
  const state = ctx.state;
  let annualTaxable;
  let intro;
  if (state.job) {
    const pay = runPayroll(state.job, {}, { extraWithholding: 0 });
    annualTaxable = toCents(pay.incomeTaxable * 12);
    intro = 'Your job pays about ' + usd(pay.gross) + ' gross per month. After pre-tax retirement and health, '
      + usd(annualTaxable, { cents: false }) + ' a year is what the IRS actually looks at.';
  } else {
    annualTaxable = 45000;
    intro = 'No job yet, so here is a worked example at ' + usd(45000, { cents: false }) + ' of taxable-eligible income a year.';
  }
  const afterDeduction = Math.max(0, annualTaxable - STANDARD_DEDUCTION);
  const rows = [];
  let lower = 0;
  for (const [rate, upper] of FEDERAL_BRACKETS) {
    if (afterDeduction <= lower) break;
    const inBracket = Math.min(afterDeduction, upper) - lower;
    rows.push(statRow(
      pct(rate * 100, 0) + ' on ' + usd(lower, { cents: false }) + ' to ' + (upper === Infinity ? 'up' : usd(Math.min(upper, afterDeduction), { cents: false })),
      usd(toCents(inBracket * rate), { cents: false }),
    ));
    lower = upper;
  }
  const total = federalTaxOnTaxable(afterDeduction);
  const effective = annualTaxable > 0 ? (total / annualTaxable) * 100 : 0;

  return el('div', { class: 'card mt' },
    el('h3', {}, icon('bank', 18), ' How your paycheck gets taxed', whyButton('tax-brackets')),
    el('p', { class: 'muted' }, intro),
    statRow('Standard deduction (tax-free off the top)', '-' + usd(STANDARD_DEDUCTION, { cents: false }), { why: 'standard-deduction' }),
    statRow('Taxed amount', usd(afterDeduction, { cents: false })),
    ...rows,
    el('div', { class: 'bigline' }, el('span', {}, 'Federal tax for the year'), el('span', {}, usd(total, { cents: false }))),
    el('p', { class: 'tiny' },
      'Notice: only the dollars inside each bracket pay that bracket\'s rate. Your top ("marginal") rate is not what you pay overall: your effective rate here is just '
      + pct(effective, 1) + '. ', whyButton('marginal-tax-rate')),
  );
}

/* 3. Big levers: live comparisons using the sim's own math. */

function renderBigLevers(ctx) {
  const rates = ctx.state.rates;

  /* Lever A: where $1,000 sits for 5 years. */
  let regular = 1000;
  let hysa = 1000;
  for (let i = 0; i < 60; i++) {
    regular = toCents(regular + monthlyInterest(regular, rates.savingsApy));
    hysa = toCents(hysa + monthlyInterest(hysa, rates.hysaApy));
  }

  /* Lever B: $500 card balance, minimum vs full. */
  const apr = rates.cardApr / 100 / 12;
  let balance = 500;
  let interestPaid = 0;
  for (let i = 0; i < 12; i++) {
    const interest = toCents(balance * apr);
    interestPaid = toCents(interestPaid + interest);
    balance = toCents(balance + interest - Math.max(25, toCents(balance * 0.02)));
  }

  const lever = (title, lines) => el('div', { class: 'mb' },
    el('b', {}, title),
    lines.map((l) => el('p', { class: 'muted', style: 'margin:2px 0' }, l)));

  return el('div', { class: 'card mt' },
    el('h3', {}, icon('sliders', 18), ' The big levers'),
    el('p', { class: 'tiny' }, 'Computed live with this sim\'s current rates. Change the rates in Settings and watch these change.'),
    lever('Where money sleeps matters', [
      '$1,000 left for 5 years in regular savings (' + pct(rates.savingsApy) + ') becomes ' + usd(regular) + '.',
      'The same $1,000 in high-yield (' + pct(rates.hysaApy) + ') becomes ' + usd(hysa) + '. Zero extra effort.',
    ]),
    lever('Minimum payments are a treadmill', [
      'Carry a $500 card balance at ' + pct(rates.cardApr) + ' APR paying only minimums, and after a year you have paid ' + usd(interestPaid) + ' in pure interest',
      'and you still owe ' + usd(Math.max(0, balance)) + '. Paying in full skips the whole treadmill.',
    ]),
    lever('The employer match is free money', [
      'A 50% match means every $1 you put in instantly becomes $1.50 before any market growth.',
      'There is no other legal 50% same-day return. Take the match.',
    ]),
  );
}

/* 4. Glossary with search and category filter. */

function renderGlossary(ctx) {
  const categories = ['All', ...new Set(GLOSSARY.map((g) => g.category))];
  /* A "Read more in Learn" click seeds the search box with that term. */
  let query = typeof window !== 'undefined' && window.__learnSearch ? window.__learnSearch : '';
  if (typeof window !== 'undefined') window.__learnSearch = null;
  let category = 'All';
  const listWrap = el('div', { class: 'glossary-grid mt' });

  function renderList() {
    const q = query.toLowerCase();
    const items = GLOSSARY.filter((g) =>
      (category === 'All' || g.category === category) &&
      (!q || g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q)));
    mount(listWrap,
      ...(items.length ? items : []).map((g) => el('div', { class: 'term-card' },
        el('div', { class: 'c' }, g.category),
        el('div', { class: 't' }, g.term),
        el('p', {}, g.definition))),
      items.length === 0 ? el('p', { class: 'muted' }, 'Nothing matches. Try another word?') : null,
    );
  }

  const search = el('input', {
    type: 'text', placeholder: 'Search 50 money words...', value: query,
    oninput: (e) => { query = e.target.value; renderList(); },
  });
  const seg = el('div', { class: 'mt' });
  function renderSeg() {
    mount(seg, segmented(
      categories.map((c) => ({ value: c, label: c })),
      category,
      (v) => { category = v; renderSeg(); renderList(); },
    ));
  }
  renderSeg();
  renderList();

  return el('div', { class: 'card mt' },
    el('h3', {}, icon('book', 18), ' Glossary'),
    search, seg, listWrap,
  );
}

/* 5. Honesty card. */

function renderSimplifications() {
  const items = [
    'Taxes assume one person filing alone, using 2025 federal rules every simulated year.',
    'State tax is a single flat rate you pick; real states have their own brackets and rules.',
    'A month is treated as 4.33 weeks of work, and one card statement happens per month.',
    'The credit score is a simplified model with the real factor weights, not a real FICO formula.',
    'Retirement growth uses a steady expected return; real markets swing up and down along the way.',
    'Nothing here is financial advice. It is a sandbox for building intuition safely.',
  ];
  return el('div', { class: 'card mt' },
    el('h3', {}, icon('info', 18), ' What Crash Cash simplifies'),
    el('p', { class: 'muted' }, 'Real life has more fine print. Knowing what we smoothed over is part of the learning:'),
    el('ul', {}, items.map((i) => el('li', { class: 'muted' }, i))),
  );
}
