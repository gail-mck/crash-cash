/*
 * accounts.js
 * Deposit account math: interest compounding, transfers, and overdraft rules
 * for checking, savings, high-yield savings, and the retirement account.
 */

import { toCents } from './format.js';

/* How far below zero checking may go before purchases start bouncing. */
export const OVERDRAFT_FLOOR = -100;
export const OVERDRAFT_FEE = 35;

/*
 * One month of interest at a given APY (annual percentage yield).
 * APY compounds monthly here: monthlyRate = (1 + apy)^(1/12) - 1.
 * `apyPct` is a percent, e.g. 4 for 4.00% APY. Returns dollars earned.
 */
export function monthlyInterest(balance, apyPct) {
  if (balance <= 0 || apyPct <= 0) return 0;
  const monthlyRate = Math.pow(1 + apyPct / 100, 1 / 12) - 1;
  return toCents(balance * monthlyRate);
}

/*
 * One month of investment growth at an expected annual return (percent).
 * Same monthly compounding as monthlyInterest but allowed on any balance.
 */
export function monthlyGrowth(balance, annualReturnPct) {
  if (balance <= 0 || annualReturnPct === 0) return 0;
  const monthlyRate = Math.pow(1 + annualReturnPct / 100, 1 / 12) - 1;
  return toCents(balance * monthlyRate);
}

/*
 * Validate and apply a transfer between two deposit accounts.
 * `accounts` is the state accounts object; keys are 'checking', 'savings',
 * 'hysa'. Retirement is deliberately not transferable (that is the lesson:
 * retirement money is locked up).
 * Returns { ok, error?, accounts } with a new accounts object on success.
 */
export function transfer(accounts, from, to, amount) {
  const valid = ['checking', 'savings', 'hysa'];
  const amt = toCents(amount);
  if (!valid.includes(from) || !valid.includes(to)) {
    return { ok: false, error: 'You can only move money between checking, savings, and high-yield savings.', accounts };
  }
  if (from === to) return { ok: false, error: 'Pick two different accounts.', accounts };
  if (amt <= 0) return { ok: false, error: 'Enter an amount above zero.', accounts };
  if ((accounts[from] || 0) < amt) {
    return { ok: false, error: 'Not enough money in that account.', accounts };
  }
  const next = { ...accounts };
  next[from] = toCents(next[from] - amt);
  next[to] = toCents((next[to] || 0) + amt);
  return { ok: true, accounts: next };
}

/*
 * Try to spend `amount` from checking, allowing overdraft down to the floor.
 * Returns { spent, overdrafted, declined } where `spent` is what actually
 * went through and `declined` is the part that bounced at the floor.
 */
export function spendFromChecking(checking, amount) {
  const amt = toCents(Math.max(0, amount));
  if (amt === 0) return { spent: 0, newBalance: checking, overdrafted: false, declined: 0 };
  const room = checking - OVERDRAFT_FLOOR;
  const spent = toCents(Math.min(amt, Math.max(0, room)));
  const newBalance = toCents(checking - spent);
  return {
    spent,
    newBalance,
    overdrafted: newBalance < 0,
    declined: toCents(amt - spent),
  };
}
