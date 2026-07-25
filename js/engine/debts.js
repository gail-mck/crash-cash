/*
 * debts.js
 * Loans and owed money: student loans, auto loans, medical bills, and
 * family loans (0% interest, but still owed, which is its own lesson).
 */

import { toCents } from './format.js';

export const DEBT_KINDS = [
  { kind: 'student', label: 'Student loan', defaultApr: 6.5 },
  { kind: 'auto', label: 'Auto loan', defaultApr: 9.0 },
  { kind: 'medical', label: 'Medical bill', defaultApr: 0 },
  { kind: 'family', label: 'Family loan', defaultApr: 0 },
  { kind: 'personal', label: 'Personal loan', defaultApr: 12.0 },
];

let debtCounter = 0;

/* Create a debt. `minPayment` defaults to a 10-year-style payment or $25. */
export function createDebt({ name, kind, principal, apr, minPayment }) {
  debtCounter += 1;
  const p = toCents(principal);
  return {
    id: 'debt-' + Date.now() + '-' + debtCounter,
    name: name || kindLabel(kind),
    kind: kind || 'personal',
    principal: p,
    originalPrincipal: p,
    apr: Math.max(0, apr || 0),
    minPayment: toCents(minPayment != null ? minPayment : suggestedPayment(p, apr || 0)),
    totalInterestPaid: 0,
    totalPaid: 0,
  };
}

export function kindLabel(kind) {
  const found = DEBT_KINDS.find((k) => k.kind === kind);
  return found ? found.label : 'Loan';
}

/*
 * A reasonable default minimum payment: the payment that clears the debt in
 * about 10 years at its APR, floored at $25 (or the whole balance if tiny).
 */
export function suggestedPayment(principal, aprPct) {
  if (principal <= 0) return 0;
  if (principal <= 25) return toCents(principal);
  const months = 120;
  const r = aprPct / 100 / 12;
  const payment = r > 0
    ? principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
    : principal / months;
  return toCents(Math.max(25, payment));
}

/*
 * One month for one debt: interest accrues, then `payment` dollars go in
 * (interest first, then principal, like real amortization).
 * Returns { debt, interest, principalPaid, paid, done }.
 */
export function tickDebt(debt, payment) {
  if (debt.principal <= 0) {
    return { debt, interest: 0, principalPaid: 0, paid: 0, done: true };
  }
  const interest = toCents(debt.principal * (debt.apr / 100) / 12);
  const owedNow = toCents(debt.principal + interest);
  const paid = toCents(Math.max(0, Math.min(payment, owedNow)));
  const interestPaid = Math.min(paid, interest);
  const principalPaid = toCents(paid - interestPaid);
  const newPrincipal = toCents(owedNow - paid);
  const next = {
    ...debt,
    principal: newPrincipal,
    totalInterestPaid: toCents(debt.totalInterestPaid + interestPaid),
    totalPaid: toCents(debt.totalPaid + paid),
  };
  return { debt: next, interest, principalPaid, paid, done: newPrincipal <= 0 };
}

/* Sum of all outstanding principal. */
export function totalDebt(debts) {
  return toCents(debts.reduce((sum, d) => sum + Math.max(0, d.principal), 0));
}
