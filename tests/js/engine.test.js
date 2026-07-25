/*
 * Integration tests for the monthly tick: a deterministic simulated year.
 * The rng is stubbed so events are fully controlled.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceMonth, rollEvent } from '../../js/engine/engine.js';
import { createInitialState, netWorth } from '../../js/state.js';
import { startChallenge } from '../../js/engine/goals.js';
import { openCard } from '../../js/engine/credit.js';

const neverEvent = () => 0.99; /* rng that never triggers an event */

function workingAdult() {
  const state = createInitialState({ name: 'Sam', ageBand: '22-25', difficulty: 'peaceful', mode: 'explore' });
  state.job = {
    jobId: 'teacher', title: 'Teacher', type: 'salary', salary: 63000,
    hoursPerWeek: 40, maxHours: 50, benefitsEligible: true,
    contribPct: 6, matchPct: 3, matchCapPct: 6, healthMonthly: 150,
    statePct: 0, retirementKind: '403b',
  };
  state.budget.categories = [
    { id: 'housing', name: 'Rent', kind: 'need', planned: 1200, method: 'debit' },
    { id: 'food', name: 'Food', kind: 'need', planned: 400, method: 'debit' },
    { id: 'fun', name: 'Fun', kind: 'want', planned: 150, method: 'debit' },
  ];
  return state;
}

test('a paycheck lands and taxes plus retirement flow to the right places', () => {
  const start = workingAdult();
  const { state, report } = advanceMonth(start, [], neverEvent);
  assert.ok(report.paycheck.net > 0);
  const contributed = report.paycheck.retirement + report.paycheck.match;
  /* Retirement holds this month's contributions plus one month of growth. */
  assert.ok(state.accounts.retirement >= contributed);
  assert.ok(state.accounts.retirement < contributed * 1.01);
  assert.ok(state.ytd.fedWithheld > 0);
  assert.equal(start.time.monthIndex, 0, 'original state is not mutated');
  assert.equal(state.time.monthIndex, 1);
});

test('a full simulated year: balances grow, history fills, December archives the year', () => {
  let state = workingAdult();
  state.budget.autoSave.hysa = 300;
  for (let i = 0; i < 12; i++) {
    ({ state } = advanceMonth(state, [], neverEvent));
  }
  assert.equal(state.history.length, 12);
  assert.ok(state.accounts.hysa > 3600, 'auto-save plus interest beats deposits alone');
  assert.ok(state.accounts.retirement > 4700, '9% of salary plus growth');
  assert.ok(state.lastYearTax, 'December archived the tax year');
  assert.ok(netWorth(state) > netWorth(workingAdult()));
});

test('tax season in April refunds overwithholding from last year', () => {
  let state = workingAdult();
  state.settings.extraWithholding = 100; /* deliberately overpay all year */
  for (let i = 0; i < 16; i++) {
    ({ state } = advanceMonth(state, [], neverEvent));
  }
  /* Month index 15 is April of year two. */
  const refundTxn = state.ledger.find((t) => t.type === 'tax');
  assert.ok(refundTxn, 'a tax season transaction exists');
  assert.ok(refundTxn.amount >= 1150, 'roughly 12 x $100 extra came back, got ' + refundTxn.amount);
});

test('credit card autopay full keeps interest at zero all year', () => {
  let state = workingAdult();
  state.card = openCard(1500, 24, 0);
  state.settings.cardAutopay = 'full';
  state.budget.categories[2].method = 'credit';
  let totalInterest = 0;
  for (let i = 0; i < 12; i++) {
    const res = advanceMonth(state, [], neverEvent);
    state = res.state;
    totalInterest += res.report.cardStatement.interest;
  }
  assert.equal(totalInterest, 0);
  assert.ok(state.score.value > 600, 'on-time full payments build a score');
});

test('minimum payments cost real interest over a year', () => {
  let state = workingAdult();
  state.card = openCard(1500, 24, 0);
  state.settings.cardAutopay = 'min';
  state.budget.categories[2].method = 'credit'; /* $150/mo on the card */
  let totalInterest = 0;
  for (let i = 0; i < 12; i++) {
    const res = advanceMonth(state, [], neverEvent);
    state = res.state;
    totalInterest += res.report.cardStatement.interest;
  }
  assert.ok(totalInterest > 50, 'carrying a growing balance is expensive, paid ' + totalInterest);
  assert.ok(state.card.balance > 0, 'balance still owed');
});

test('events fire deterministically with a stubbed rng and get paid', () => {
  const state = workingAdult();
  const events = [{
    id: 'test-repair', title: 'Car repair', emoji: '🔧', kind: 'expense',
    amountMin: 200, amountMax: 200, minAge: 16, weight: 5,
    blurb: 'Your car needs a repair.', lesson: 'Emergency funds exist for this.',
  }];
  /* rng: first call decides event fires (0 < chance), then weight pick, then amount. */
  const rig = (() => { const seq = [0.0, 0.0, 0.5]; let i = 0; return () => seq[Math.min(i++, seq.length - 1)]; })();
  const stateWithEvents = { ...structuredClone(state), profile: { ...state.profile, difficulty: 'normal' } };
  const { state: after, report } = advanceMonth(stateWithEvents, events, rig);
  assert.ok(report.event);
  assert.equal(report.event.amount, 200);
  assert.ok(report.event.paidWith.length > 0);
  assert.ok(after.accounts.checking < state.accounts.checking + report.paycheck.net);
});

test('rollEvent filters by age band', () => {
  const kid = createInitialState({ name: 'Kai', ageBand: '12-13', difficulty: 'normal' });
  const adultOnly = [{ id: 'car', title: 'Car repair', emoji: '🚗', kind: 'expense', amountMin: 100, amountMax: 200, minAge: 18, weight: 5, blurb: '', lesson: '' }];
  const rig = () => 0.0;
  assert.equal(rollEvent(kid, adultOnly, 1.0, rig), null, 'no eligible events for a 12 year old');
});

test('challenge mode: debt destroyer completes when the loan is gone', () => {
  let state = createInitialState({ name: 'Zoe', ageBand: '18-21', difficulty: 'peaceful', mode: 'challenge' });
  state = startChallenge(state, 'debt-destroyer');
  assert.equal(state.debts.length, 1);
  state.job = { ...workingAdult().job };
  state.budget.categories = [];
  state.debts[0].minPayment = 400; /* aggressive payoff */
  let completed = false;
  for (let i = 0; i < 12 && !completed; i++) {
    const res = advanceMonth(state, [], neverEvent);
    state = res.state;
    if (res.report.goal && res.report.goal.justCompleted) completed = true;
  }
  assert.ok(completed, 'goal completes within a year at $400/mo');
});

test('overdraft charges one fee and bounces further spending', () => {
  let state = createInitialState({ name: 'Lo', ageBand: '16-17', difficulty: 'peaceful' });
  state.accounts.checking = 20;
  state.accounts.savings = 0;
  state.budget.categories = [{ id: 'x', name: 'Spend', kind: 'want', planned: 90, method: 'debit' }];
  const { state: after, report } = advanceMonth(state, [], neverEvent);
  assert.equal(report.overdraftFee, 35);
  assert.ok(after.accounts.checking < 0);
  assert.ok(after.accounts.checking >= -100 - 35, 'floor plus the fee');
});
