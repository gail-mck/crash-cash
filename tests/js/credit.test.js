/* Tests for credit card mechanics: grace period, interest, minimums, lates. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  openCard, charge, accrueInterest, minimumPayment, cutStatement,
  applyPayment, LATE_FEE,
} from '../../js/engine/credit.js';

function freshCard() {
  return openCard(1000, 24, 0);
}

test('charges respect the credit limit', () => {
  let { card, charged, declined } = charge(freshCard(), 800);
  assert.equal(charged, 800);
  assert.equal(declined, 0);
  ({ card, charged, declined } = charge(card, 500));
  assert.equal(charged, 200, 'only the room left on the card');
  assert.equal(declined, 300);
  assert.equal(card.balance, 1000);
});

test('paying in full keeps the grace period: no interest next month', () => {
  let card = charge(freshCard(), 400).card;
  card = cutStatement(card);
  card = applyPayment(card, 400, 1000).card;
  assert.equal(card.balance, 0);
  assert.equal(card.paidLastStatementInFull, true);
  card = charge(card, 300).card;
  const { interest } = accrueInterest(card);
  assert.equal(interest, 0, 'grace period held');
});

test('carrying a balance loses the grace period and accrues 2% monthly at 24% APR', () => {
  let card = charge(freshCard(), 600).card;
  card = cutStatement(card);
  card = applyPayment(card, 100, 1000).card; /* partial payment */
  assert.equal(card.paidLastStatementInFull, false);
  const { interest } = accrueInterest(card);
  assert.equal(interest, 10, '500 remaining * 24% / 12 = $10');
});

test('minimum payment is max($25, 2%) but never more than the balance', () => {
  assert.equal(minimumPayment(0), 0);
  assert.equal(minimumPayment(15), 15, 'tiny balance: pay it all');
  assert.equal(minimumPayment(500), 25, '2% would be $10, floor wins');
  assert.equal(minimumPayment(5000), 100, '2% wins above $1,250');
});

test('missing the minimum adds a late fee and a late mark', () => {
  let card = charge(freshCard(), 600).card;
  card = cutStatement(card);
  const res = applyPayment(card, 0, 1000);
  assert.equal(res.status, 'late');
  assert.equal(res.lateFee, LATE_FEE);
  assert.equal(res.card.latePayments, 1);
  assert.equal(res.card.balance, 600 + LATE_FEE);
});

test('payment is limited by available cash', () => {
  let card = charge(freshCard(), 600).card;
  card = cutStatement(card);
  const res = applyPayment(card, 600, 200); /* wants full, only has $200 */
  assert.equal(res.paid, 200);
  assert.equal(res.status, 'paid_partial');
  assert.equal(res.card.onTimePayments, 1, 'still on time, above the minimum');
});
