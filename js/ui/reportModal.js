/*
 * reportModal.js
 * The Month Report: the teaching moment after every Next Month.
 * Walks through the paycheck, spending, events, card statement, interest,
 * tax season, goal progress, and the generated insights.
 */

import { el, openModal, closeBtn, statRow, whyButton, pill } from './components.js';
import { usd, monthLabel } from '../engine/format.js';
import { generateInsights } from '../engine/insights.js';

/*
 * Show the report for a finished month.
 * opts.fastForwarded: number of months skipped (0/false for a single step).
 * opts.goalCelebration: goal object when a challenge completed this batch.
 */
export function showMonthReport(ctx, report, opts = {}) {
  const state = ctx.state;
  const insights = generateInsights(report, state);
  const label = monthLabel(report.monthIndex, state.time.startYear, state.time.startMonth);

  openModal((close) => [
    closeBtn(close),
    opts.goalCelebration ? el('div', { class: 'confetti' }, '🎉🏆🎉') : null,
    opts.goalCelebration
      ? el('h2', {}, 'Challenge complete: ' + opts.goalCelebration.title + '!')
      : el('h2', {}, label + ' report'),
    opts.fastForwarded
      ? el('p', { class: 'muted' }, 'Fast-forwarded ' + opts.fastForwarded + ' months. Here is how the last one went.')
      : null,

    section('Paycheck', report.paycheck && report.paycheck.gross > 0 ? [
      statRow('Gross pay', usd(report.paycheck.gross), { why: 'gross-pay' }),
      report.paycheck.retirement > 0 ? statRow('Retirement (pre-tax)', '-' + usd(report.paycheck.retirement), { why: 'employer-match' }) : null,
      report.paycheck.health > 0 ? statRow('Health premium', '-' + usd(report.paycheck.health)) : null,
      statRow('Federal income tax', '-' + usd(report.paycheck.federal), { why: 'federal-income-tax' }),
      statRow('FICA (Social Security + Medicare)', '-' + usd(report.paycheck.fica.total), { why: 'fica' }),
      report.paycheck.state > 0 ? statRow('State income tax', '-' + usd(report.paycheck.state), { why: 'state-income-tax' }) : null,
      el('div', { class: 'bigline' }, el('span', {}, 'Take-home pay'), el('span', { class: 'good-text' }, '+' + usd(report.paycheck.net))),
      report.paycheck.match > 0
        ? el('p', { class: 'tiny' }, 'Plus your employer quietly added ' + usd(report.paycheck.match) + ' to your retirement. Free money.')
        : null,
    ] : [el('p', { class: 'muted' }, 'No paycheck this month. No job, no income; the bills do not care.')]),

    section('Spending', report.spending.length ? [
      ...report.spending.map((s) => statRow(
        s.name + (s.paidByCredit > 0 ? ' (credit)' : ''),
        '-' + usd(s.paidByDebit + s.paidByCredit))),
      report.spendingTotals.declined > 0
        ? el('p', { class: 'tiny bad-text' }, usd(report.spendingTotals.declined) + ' of planned spending bounced: the money simply was not there.')
        : null,
    ] : [el('p', { class: 'muted' }, 'No budgeted spending this month.')]),

    report.event ? section('Life happened', [
      el('p', {}, report.event.emoji + ' ' + report.event.blurb + ' ',
        el('b', { class: report.event.kind === 'windfall' ? 'good-text' : 'bad-text' },
          (report.event.kind === 'windfall' ? '+' : '-') + usd(report.event.amount))),
      report.event.paidWith && report.event.paidWith.length
        ? el('p', { class: 'tiny' }, 'Paid from: ' + report.event.paidWith.map((p) => p.source + ' ' + usd(p.amount)).join(', ') + '.')
        : null,
      report.event.unpaid > 0
        ? el('p', { class: 'tiny bad-text' }, usd(report.event.unpaid) + ' could not be covered and was waved off. In real life it would become debt.')
        : null,
    ]) : null,

    report.cardStatement ? section('Credit card statement', [
      statRow('Statement balance', usd(report.cardStatement.statementBalance), { why: 'statement-balance' }),
      report.cardStatement.interest > 0 ? statRow('Interest charged', '-' + usd(report.cardStatement.interest), { why: 'apr', tone: 'bad' }) : null,
      statRow('You paid', usd(report.cardStatement.paid)),
      report.cardStatement.lateFee > 0 ? statRow('Late fee', '-' + usd(report.cardStatement.lateFee), { tone: 'bad' }) : null,
      statRow('Card balance now', usd(report.cardStatement.endingBalance)),
      el('div', { class: 'row' },
        pill(statusLabel(report.cardStatement.status), statusTone(report.cardStatement.status)),
        pill(report.cardStatement.utilizationPct + '% of limit used', report.cardStatement.utilizationPct > 30 ? 'warn' : 'good')),
    ]) : null,

    section('Money that grew while you slept', [
      report.interest.savings > 0 ? statRow('Savings interest', '+' + usd(report.interest.savings), { tone: 'good' }) : null,
      report.interest.hysa > 0 ? statRow('High-yield interest', '+' + usd(report.interest.hysa), { tone: 'good', why: 'apy' }) : null,
      report.interest.retirement > 0 ? statRow('Retirement growth', '+' + usd(report.interest.retirement), { tone: 'good', why: 'compound-interest' }) : null,
      (report.interest.savings + report.interest.hysa + report.interest.retirement) === 0
        ? el('p', { class: 'muted' }, 'Nothing earned interest this month. Money has to be parked somewhere that pays to grow on its own.')
        : null,
    ]),

    report.taxSeason ? section('🏛️ Tax season', [
      statRow('Your real tax bill for last year', usd(report.taxSeason.liability)),
      statRow('What your paychecks withheld', usd(report.taxSeason.withheld), { why: 'withholding' }),
      el('div', { class: 'bigline' },
        el('span', {}, report.taxSeason.refund >= 0 ? 'Refund' : 'You owe'),
        el('span', { class: report.taxSeason.refund >= 0 ? 'good-text' : 'bad-text' }, usd(Math.abs(report.taxSeason.refund)))),
      el('p', { class: 'tiny' }, report.taxSeason.refund >= 0
        ? 'A refund is not a bonus: it is your own money coming back after an interest-free loan to the government.'
        : 'Withholding came up short, so the rest is due now. Adjusting withholding spreads it across the year instead.'),
    ]) : null,

    report.overdraftFee > 0 ? section('Ouch', [
      el('p', { class: 'bad-text' }, 'Checking went negative, so the bank took a ' + usd(report.overdraftFee) + ' overdraft fee on top. ',
        whyButton('overdraft')),
    ]) : null,

    report.goal && !opts.goalCelebration ? section('Goal check', [
      el('p', {}, report.goal.emoji + ' ' + report.goal.title + ': ' + report.goal.label),
    ]) : null,

    insights.length ? section('💡 The takeaways', insights.map((ins) =>
      el('div', { class: 'insight ' + ins.tone },
        el('span', { class: 'em' }, ins.tone === 'good' ? '✅' : ins.tone === 'warn' ? '⚠️' : 'ℹ️'),
        el('span', {}, ins.text)))) : null,

    el('div', { class: 'row mt' },
      el('button', { class: 'btn primary big', onclick: close }, 'Got it'),
    ),
  ]);
}

function section(title, children) {
  const kids = (children || []).filter(Boolean);
  if (!kids.length) return null;
  return el('div', { class: 'report-section' }, el('h3', {}, title), ...kids);
}

function statusLabel(status) {
  return {
    paid_full: 'Paid in full', paid_partial: 'Paid, balance carried',
    late: 'Missed minimum!', no_balance: 'Nothing due',
  }[status] || status;
}

function statusTone(status) {
  return { paid_full: 'good', paid_partial: 'warn', late: 'bad', no_balance: 'good' }[status] || '';
}
