/* Tests for loans: amortization order, family loans, payoff. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createDebt, tickDebt, suggestedPayment, totalDebt } from '../../js/engine/debts.js';

test('interest is paid before principal, like real amortization', () => {
  const debt = createDebt({ name: 'Student loan', kind: 'student', principal: 1200, apr: 12 });
  const res = tickDebt(debt, 50);
  assert.equal(res.interest, 12, '1200 * 12% / 12');
  assert.equal(res.principalPaid, 38);
  assert.equal(res.debt.principal, 1162);
});

test('family loans accrue no interest but are still owed', () => {
  const debt = createDebt({ name: 'Loan from Mom', kind: 'family', principal: 300, apr: 0, minPayment: 25 });
  const res = tickDebt(debt, 25);
  assert.equal(res.interest, 0);
  assert.equal(res.debt.principal, 275);
});

test('overpaying clears the debt without going negative', () => {
  const debt = createDebt({ name: 'Medical bill', kind: 'medical', principal: 80, apr: 0 });
  const res = tickDebt(debt, 500);
  assert.equal(res.debt.principal, 0);
  assert.equal(res.paid, 80);
  assert.equal(res.done, true);
});

test('suggested payment actually amortizes the loan in about 10 years', () => {
  const payment = suggestedPayment(10000, 6.5);
  let debt = createDebt({ name: 'Test', kind: 'student', principal: 10000, apr: 6.5, minPayment: payment });
  let months = 0;
  while (debt.principal > 0 && months < 200) {
    debt = tickDebt(debt, payment).debt;
    months++;
  }
  assert.ok(months >= 110 && months <= 125, 'paid off near 120 months, took ' + months);
});

test('totalDebt sums outstanding principal only', () => {
  const debts = [
    createDebt({ name: 'A', kind: 'student', principal: 1000, apr: 5 }),
    createDebt({ name: 'B', kind: 'family', principal: 250, apr: 0 }),
  ];
  assert.equal(totalDebt(debts), 1250);
});
