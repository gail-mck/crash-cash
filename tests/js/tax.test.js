/* Tests for the tax module: brackets, FICA cap, withholding, reconciliation. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  federalTaxOnTaxable, federalTaxAnnual, marginalRate, ficaMonthly,
  monthlyFederalWithholding, stateTaxMonthly, reconcileYear,
  STANDARD_DEDUCTION, SS_WAGE_CAP, SS_RATE,
} from '../../js/engine/tax.js';

test('no tax on zero or negative taxable income', () => {
  assert.equal(federalTaxOnTaxable(0), 0);
  assert.equal(federalTaxOnTaxable(-500), 0);
});

test('10% bracket only, exact boundary', () => {
  /* All of the first $11,925 is taxed at 10%. */
  assert.equal(federalTaxOnTaxable(11925), 1192.5);
});

test('crossing into the 12% bracket taxes only the excess at 12%', () => {
  const atBoundary = federalTaxOnTaxable(11925);
  const above = federalTaxOnTaxable(12925);
  assert.equal(above - atBoundary, 120); /* 1000 more dollars at 12% */
});

test('known middle-income value: $50,000 taxable', () => {
  /* 11925*.10 + (48475-11925)*.12 + (50000-48475)*.22 = 5914.00 */
  assert.equal(federalTaxOnTaxable(50000), 5914.0);
});

test('standard deduction wipes out small incomes entirely', () => {
  assert.equal(federalTaxAnnual(STANDARD_DEDUCTION), 0);
  assert.equal(federalTaxAnnual(12000), 0);
});

test('pretax deductions reduce federal tax', () => {
  const without = federalTaxAnnual(60000, 0);
  const withPretax = federalTaxAnnual(60000, 6000);
  assert.ok(withPretax < without);
});

test('marginal rate lands in the right bracket', () => {
  assert.equal(marginalRate(20000), 0.1);   /* 20000 - 15000 = 5000 taxable */
  assert.equal(marginalRate(80000), 0.22);  /* 65000 taxable */
  assert.equal(marginalRate(10000), 0);     /* below the deduction */
});

test('FICA is 7.65% below the Social Security cap', () => {
  const f = ficaMonthly(4000, 0);
  assert.equal(f.ss, 248);
  assert.equal(f.medicare, 58);
  assert.equal(f.total, 306);
});

test('Social Security stops at the wage cap, Medicare does not', () => {
  const f = ficaMonthly(10000, SS_WAGE_CAP - 4000);
  /* Only $4,000 of room remains under the cap. */
  assert.equal(f.ss, Math.round(4000 * SS_RATE * 100) / 100);
  assert.equal(f.medicare, 145);
});

test('monthly withholding annualizes and divides by 12', () => {
  /* $5,000/mo taxable -> $60,000/yr -> minus deduction = $45,000 taxable. */
  const annual = federalTaxOnTaxable(45000);
  assert.equal(monthlyFederalWithholding(5000), Math.round((annual / 12) * 100) / 100);
});

test('extra withholding adds on top', () => {
  const base = monthlyFederalWithholding(5000);
  assert.equal(monthlyFederalWithholding(5000, 50), base + 50);
});

test('state tax is a flat percent', () => {
  assert.equal(stateTaxMonthly(3000, 5), 150);
  assert.equal(stateTaxMonthly(3000, 0), 0);
});

test('reconcileYear returns a refund when withholding exceeded liability', () => {
  const rec = reconcileYear({ incomeTaxable: 45000, fedWithheld: 4000 });
  const liability = federalTaxOnTaxable(45000 - STANDARD_DEDUCTION);
  assert.equal(rec.liability, liability);
  assert.equal(rec.refund, Math.round((4000 - liability) * 100) / 100);
  assert.ok(rec.refund > 0);
});

test('reconcileYear returns a negative refund (bill) when underwithheld', () => {
  const rec = reconcileYear({ incomeTaxable: 90000, fedWithheld: 2000 });
  assert.ok(rec.refund < 0);
});
