/* Tests for the credit score model's teaching behaviors. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { computeScore, scoreBand, SCORE_MIN, SCORE_MAX } from '../../js/engine/creditScore.js';
import { openCard } from '../../js/engine/credit.js';

test('no credit accounts means no score at all, not a low score', () => {
  const { score } = computeScore({ card: null, debts: [], monthIndex: 12 });
  assert.equal(score, null);
  assert.equal(scoreBand(null), 'No score yet');
});

test('scores stay inside 300 to 850', () => {
  const awful = openCard(500, 24, 0);
  awful.balance = 500;
  awful.latePayments = 24;
  awful.inquiries = [0, 1, 2, 3];
  const low = computeScore({ card: awful, debts: [], monthIndex: 4 });
  assert.ok(low.score >= SCORE_MIN && low.score <= SCORE_MAX);

  const great = openCard(5000, 24, 0);
  great.balance = 100;
  great.onTimePayments = 60;
  great.inquiries = [0];
  const high = computeScore({ card: great, debts: [{ kind: 'student', principal: 100 }], monthIndex: 70 });
  assert.ok(high.score >= SCORE_MIN && high.score <= SCORE_MAX);
  assert.ok(high.score > low.score + 150, 'good habits clearly beat bad ones');
});

test('high utilization drags the score down', () => {
  const base = openCard(1000, 24, 0);
  base.onTimePayments = 12;
  const lowUtil = computeScore({ card: { ...base, balance: 50 }, debts: [], monthIndex: 12 });
  const highUtil = computeScore({ card: { ...base, balance: 950 }, debts: [], monthIndex: 12 });
  assert.ok(lowUtil.score > highUtil.score, 'low utilization scores higher');
});

test('late payments hurt more than their share of history', () => {
  const clean = openCard(1000, 24, 0);
  clean.onTimePayments = 11;
  clean.balance = 100;
  const dirty = { ...clean, onTimePayments: 10, latePayments: 1 };
  const a = computeScore({ card: clean, debts: [], monthIndex: 12 });
  const b = computeScore({ card: dirty, debts: [], monthIndex: 12 });
  assert.ok(a.score - b.score >= 20, 'one late mark costs real points, cost ' + (a.score - b.score));
});

test('credit age helps as the account matures', () => {
  const card = openCard(1000, 24, 0);
  card.onTimePayments = 6;
  card.balance = 100;
  const young = computeScore({ card, debts: [], monthIndex: 3 });
  const older = computeScore({ card: { ...card, onTimePayments: 48 }, debts: [], monthIndex: 48 });
  assert.ok(older.score > young.score);
});

test('score bands use industry language', () => {
  assert.equal(scoreBand(820), 'Exceptional');
  assert.equal(scoreBand(750), 'Very good');
  assert.equal(scoreBand(700), 'Good');
  assert.equal(scoreBand(600), 'Fair');
  assert.equal(scoreBand(450), 'Poor');
});
