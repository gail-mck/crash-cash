/*
 * dashboard.js
 * The home screen: account cards, net worth chart, goal progress
 * (challenge mode), latest insights, and recent activity.
 */

import { el, whyButton, pill, meter, money, statRow } from './components.js';
import { icon } from './icons.js';
import { guideBanner } from './guide.js';
import { lineChart, historySeries } from './charts.js';
import { usd, pct, monthLabel } from '../engine/format.js';
import { runPayroll } from '../engine/payroll.js';
import { scoreBand } from '../engine/creditScore.js';
import { totalDebt } from '../engine/debts.js';
import { generateInsights } from '../engine/insights.js';
import { netWorth, canHaveCard } from '../state.js';
import { CHALLENGES } from '../engine/goals.js';

export function renderDashboard(ctx) {
  const state = ctx.state;
  const a = state.accounts;

  return el('div', {},
    guideBanner(ctx),
    renderGoalCard(ctx),
    renderAccountsGrid(ctx),
    el('div', { class: 'grid cols-2 mt' },
      renderNetWorthCard(state),
      renderScoreCard(ctx),
    ),
    el('div', { class: 'grid cols-2 mt' },
      renderInsightsCard(ctx),
      renderActivityCard(state),
    ),
    !state.job && state.flags.setupStep === 'done' ? renderNudge(ctx) : null,
  );
}

/* Challenge goal progress, only in challenge mode with an active goal. */
function renderGoalCard(ctx) {
  const state = ctx.state;
  if (!state.goal) return null;
  const challenge = CHALLENGES.find((c) => c.id === state.goal.id);
  if (!challenge) return null;
  const progress = challenge.progress(state);
  return el('div', { class: 'card mb' },
    el('div', { class: 'row between' },
      el('h2', {}, icon(challenge.icon, 20), ' ' + challenge.title),
      state.goal.done ? pill('Complete!', 'good') : pill(Math.round(progress * 100) + '%', 'brand'),
    ),
    el('p', { class: 'muted' }, challenge.blurb),
    meter(progress, state.goal.done ? 'good' : ''),
    el('p', { class: 'tiny mt' }, challenge.describeProgress(state)),
  );
}

function renderAccountsGrid(ctx) {
  const state = ctx.state;
  const a = state.accounts;
  const cards = [
    acctCard('wallet', 'Checking', a.checking, 'Money for everyday spending', a.checking < 0 ? 'overdraft' : null, 'checking-account'),
    acctCard('bank', 'Savings', a.savings, pct(state.rates.savingsApy) + ' APY', null, 'savings-account'),
    acctCard('sprout', 'High-Yield Savings', a.hysa, pct(state.rates.hysaApy) + ' APY', null, 'high-yield-savings'),
    acctCard('vault', 'Retirement', a.retirement,
      (state.job && state.job.retirementKind ? state.job.retirementKind + ' · ' : '') + pct(state.rates.retirementReturn) + ' expected return',
      null, state.job && state.job.retirementKind === '403b' ? '403b' : '401k'),
  ];
  if (state.card) {
    const util = state.card.limit > 0 ? (state.card.balance / state.card.limit) * 100 : 0;
    cards.push(acctCard('card', 'Credit Card', -state.card.balance,
      usd(state.card.limit - state.card.balance) + ' available of ' + usd(state.card.limit, { cents: false }),
      util > 30 ? Math.round(util) + '% used' : null, 'credit-card'));
  }
  for (const inv of state.investments || []) {
    if (inv.balance > 0 || inv.collapsed) {
      cards.push(acctCard('trendup', inv.name, inv.balance,
        inv.collapsed ? 'Collapsed. The lesson survives.' : 'Invested ' + usd(inv.invested, { cents: false }),
        inv.collapsed ? 'gone' : null, 'compound-interest'));
    }
  }
  const debt = totalDebt(state.debts);
  if (debt > 0) {
    cards.push(acctCard('scale', 'Debts', -debt, state.debts.filter((d) => d.principal > 0).length + ' open', null, 'debt'));
  }
  return el('div', { class: 'grid autofit' }, cards);
}

function acctCard(iconName, label, balance, sub, warnBadge, glossaryId) {
  return el('div', { class: 'card acct' + (balance < 0 ? ' negative' : '') },
    el('div', { class: 'label' }, icon(iconName, 16), ' ', label, glossaryId ? whyButton(glossaryId) : null,
      warnBadge ? el('span', { class: 'pill warn' }, warnBadge) : null),
    el('div', { class: 'bal' }, usd(balance)),
    el('div', { class: 'sub' }, sub),
  );
}

function renderNetWorthCard(state) {
  const nw = netWorth(state);
  return el('div', { class: 'card' },
    el('h3', {}, 'Net worth', whyButton('net-worth', [
      'Yours right now: everything you own minus everything you owe = ' + usd(nw) + '.',
    ])),
    el('div', { class: 'bal', style: 'font-size:1.5rem; font-weight:800' }, usd(nw)),
    lineChart(
      historySeries(state.history, [
        { key: 'netWorth', label: 'Net worth', color: 'var(--brand)' },
        { key: 'retirement', label: 'Retirement', color: 'var(--good)' },
      ]),
      { xLabel: (m) => monthLabel(m, state.time.startYear, state.time.startMonth) },
    ),
  );
}

function renderScoreCard(ctx) {
  const state = ctx.state;
  const score = state.score.value;
  return el('div', { class: 'card' },
    el('h3', {}, 'Credit score', whyButton('credit-score')),
    score == null
      ? el('div', {},
          el('p', { class: 'muted' }, 'No score yet. You are credit-invisible: lenders have nothing to judge you by.'),
          canHaveCard(state)
            ? el('button', { class: 'btn small', onclick: () => ctx.go('bank') }, 'Start building in the Bank tab')
            : el('p', { class: 'tiny' }, 'Credit unlocks when you turn 18 (you age a year every 12 sim months). For now, savings habits are your superpower.'))
      : el('div', {},
          el('div', { class: 'gauge' },
            el('span', { class: 'num' }, score),
            el('span', {},
              el('span', { class: 'band ' + (score >= 670 ? 'good-text' : score >= 580 ? '' : 'bad-text') }, scoreBand(score)),
              el('div', { class: 'tiny' }, 'range 300 to 850'))),
          meter((score - 300) / 550, score >= 670 ? 'good' : score >= 580 ? 'warn' : 'bad'),
          state.score.history.length > 1
            ? lineChart(
                [{ label: 'Score', color: 'var(--accent)', points: state.score.history.map((h) => ({ x: h.monthIndex, y: h.score })) }],
                { yFormat: (v) => String(Math.round(v)), zeroBase: false, xLabel: (m) => monthLabel(m, state.time.startYear, state.time.startMonth) })
            : null),
  );
}

function renderInsightsCard(ctx) {
  const state = ctx.state;
  const insights = state.report ? generateInsights(state.report, state) : [];
  return el('div', { class: 'card' },
    el('h3', {}, icon('bulb', 18), ' What just happened'),
    insights.length === 0
      ? el('p', { class: 'muted' }, 'Hit Next Month and this space will explain what happened to your money and why.')
      : insights.map((ins) => el('div', { class: 'insight ' + ins.tone },
          el('span', { class: 'em', style: 'color:' + (ins.tone === 'good' ? 'var(--good)' : ins.tone === 'warn' ? 'var(--warn)' : 'var(--brand-text)') }, icon(ins.tone === 'good' ? 'check' : ins.tone === 'warn' ? 'alert' : 'info', 16)),
          el('span', {}, ins.text, ' ', ins.glossaryId ? whyButton(ins.glossaryId) : null))),
  );
}

function renderActivityCard(state) {
  const recent = state.ledger.slice(-8).reverse();
  const typeIcons = {
    income: 'download', spend: 'wallet', save: 'bank', interest: 'sprout', fee: 'alert',
    debt: 'scale', card: 'card', event: 'dice', tax: 'bank', offer: 'mail',
  };
  return el('div', { class: 'card' },
    el('h3', {}, 'Recent activity'),
    recent.length === 0
      ? el('p', { class: 'muted' }, 'Transactions will show up here once time starts moving.')
      : recent.map((t) => el('div', { class: 'txn' },
          el('span', { class: 'dot' }, icon(typeIcons[t.type] || 'info', 16)),
          el('span', { class: 'what' },
            el('div', { class: 'l1' }, t.label),
            el('div', { class: 'l2' }, monthLabel(t.monthIndex, state.time.startYear, state.time.startMonth))),
          money(t.amount))),
  );
}

function renderNudge(ctx) {
  return el('div', { class: 'card mt', style: 'border-color: var(--brand)' },
    el('h3', {}, icon('briefcase', 18), ' First step: get money flowing'),
    el('p', { class: 'muted' }, 'You have no income yet. Grab a job (or invent one) and every Next Month will bring a paycheck, taxes and all.'),
    el('button', { class: 'btn primary', onclick: () => ctx.go('job') }, 'Browse jobs'),
  );
}
