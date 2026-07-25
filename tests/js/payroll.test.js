/* Tests for payroll: gross pay, pre-tax handling, employer match, net pay. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyGross, employerMatch, runPayroll, WEEKS_PER_MONTH } from '../../js/engine/payroll.js';

const hourlyJob = {
  type: 'hourly', wage: 16, hoursPerWeek: 20, maxHours: 40,
  benefitsEligible: false, contribPct: 0, matchPct: 0, matchCapPct: 0,
  healthMonthly: 0, statePct: 0,
};

const salaryJob = {
  type: 'salary', salary: 63000, hoursPerWeek: 40, maxHours: 50,
  benefitsEligible: true, contribPct: 6, matchPct: 3, matchCapPct: 6,
  healthMonthly: 150, statePct: 4, retirementKind: '403b',
};

test('hourly gross scales with hours per week', () => {
  assert.equal(monthlyGross(hourlyJob), Math.round(16 * 20 * WEEKS_PER_MONTH * 100) / 100);
  const half = monthlyGross({ ...hourlyJob, hoursPerWeek: 10 });
  assert.equal(half, Math.round(16 * 10 * WEEKS_PER_MONTH * 100) / 100);
});

test('hours are capped at the job maximum', () => {
  const capped = monthlyGross({ ...hourlyJob, hoursPerWeek: 100 });
  assert.equal(capped, Math.round(16 * 40 * WEEKS_PER_MONTH * 100) / 100);
});

test('salaried gross is one twelfth of annual', () => {
  assert.equal(monthlyGross(salaryJob), 5250);
});

test('employer match: 50 cents per dollar up to the cap', () => {
  /* matchPct 3, cap 6: contributing 6% earns a 3% of gross match. */
  assert.equal(employerMatch(5000, 6, 3, 6), 150);
  /* Contributing 3% earns half the max match. */
  assert.equal(employerMatch(5000, 3, 3, 6), 75);
  /* Contributing beyond the cap earns no extra match. */
  assert.equal(employerMatch(5000, 12, 3, 6), 150);
  /* No contribution, no match. */
  assert.equal(employerMatch(5000, 0, 3, 6), 0);
});

test('paycheck math adds up exactly', () => {
  const pay = runPayroll(salaryJob, { ficaWages: 0 });
  const rebuilt = pay.net + pay.retirement + pay.health + pay.federal + pay.fica.total + pay.state;
  assert.ok(Math.abs(rebuilt - pay.gross) < 0.02, 'components must sum back to gross');
  assert.ok(pay.net > 0 && pay.net < pay.gross);
});

test('retirement contributions reduce federal tax but not FICA', () => {
  const with401k = runPayroll(salaryJob, { ficaWages: 0 });
  const without = runPayroll({ ...salaryJob, contribPct: 0 }, { ficaWages: 0 });
  assert.ok(with401k.federal < without.federal, '401k lowers income tax');
  assert.equal(with401k.fica.total, without.fica.total, 'FICA unchanged by 401k');
});

test('benefits are ignored for jobs that are not benefits eligible', () => {
  const pay = runPayroll({ ...hourlyJob, contribPct: 10, healthMonthly: 200 });
  assert.equal(pay.retirement, 0);
  assert.equal(pay.health, 0);
});

test('a jobless month produces an all-zero paycheck', () => {
  const pay = runPayroll(null);
  assert.equal(pay.gross, 0);
  assert.equal(pay.net, 0);
});
