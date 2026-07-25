/* Tests for deposit accounts: interest, transfers, overdraft. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  monthlyInterest, monthlyGrowth, transfer, spendFromChecking,
  OVERDRAFT_FLOOR,
} from '../../js/engine/accounts.js';

test('HYSA visibly beats regular savings on the same balance', () => {
  const regular = monthlyInterest(1000, 0.4);
  const hysa = monthlyInterest(1000, 4.0);
  assert.ok(hysa > regular * 5, 'the gap should be obvious to a student');
});

test('twelve months of monthly compounding lands on the APY', () => {
  let balance = 1000;
  for (let i = 0; i < 12; i++) balance += monthlyInterest(balance, 4.0);
  assert.ok(Math.abs(balance - 1040) < 0.25, 'ends near $1,040, got ' + balance);
});

test('no interest on zero or negative balances', () => {
  assert.equal(monthlyInterest(0, 4), 0);
  assert.equal(monthlyInterest(-50, 4), 0);
  assert.equal(monthlyGrowth(0, 7), 0);
});

test('transfers move money and validate inputs', () => {
  const start = { checking: 500, savings: 100, hysa: 0 };
  const ok = transfer(start, 'checking', 'hysa', 200);
  assert.equal(ok.ok, true);
  assert.equal(ok.accounts.checking, 300);
  assert.equal(ok.accounts.hysa, 200);
  assert.equal(start.checking, 500, 'original object untouched');

  assert.equal(transfer(start, 'checking', 'checking', 50).ok, false);
  assert.equal(transfer(start, 'checking', 'savings', 9999).ok, false);
  assert.equal(transfer(start, 'checking', 'savings', -5).ok, false);
  assert.equal(transfer(start, 'checking', 'retirement', 50).ok, false, 'retirement is locked');
});

test('spending can overdraft down to the floor, then declines', () => {
  const res = spendFromChecking(50, 120);
  assert.equal(res.spent, 120, 'within the overdraft floor');
  assert.equal(res.newBalance, -70);
  assert.equal(res.overdrafted, true);

  const res2 = spendFromChecking(0, 500);
  assert.equal(res2.spent, -OVERDRAFT_FLOOR, 'stops at the floor');
  assert.equal(res2.declined, 500 + OVERDRAFT_FLOOR);
});
