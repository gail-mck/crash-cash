/*
 * credit.js
 * Credit card mechanics: charges, interest on carried balances, statements,
 * minimum payments, and late fees.
 *
 * Model (simplified on purpose):
 *  - One statement per month. If the previous statement was paid in full,
 *    no interest is charged this month (that is the grace period).
 *  - If any statement balance carried over, interest = balance * APR / 12.
 *  - Minimum payment = max($25, 2% of the statement balance), or the whole
 *    balance if it is under $25.
 *  - Missing the minimum adds a late fee and a late mark for the score.
 */

import { toCents } from './format.js';

export const LATE_FEE = 30;
export const MIN_PAYMENT_FLOOR = 25;
export const MIN_PAYMENT_PCT = 2;

/* A brand new card object. `monthIndex` is when it was opened. */
export function openCard(limit, aprPct, monthIndex) {
  return {
    limit: toCents(limit),
    apr: aprPct,
    balance: 0,
    statementBalance: 0,
    paidLastStatementInFull: true,
    onTimePayments: 0,
    latePayments: 0,
    openedMonth: monthIndex,
    /* Annual fees (offer cards) bill from this month, even if credit age
       later carries over from an older card on a switch. */
    feeAnniversaryMonth: monthIndex,
    inquiries: [monthIndex],
    utilizationPct: 0,
  };
}

/*
 * A voluntary mid-cycle payment: reduces the balance (and what is left of
 * the statement) but is never judged against the minimum. Late fees and
 * on-time credit belong to the monthly statement cycle only.
 */
export function extraPayment(card, requested, available) {
  const paid = toCents(Math.max(0, Math.min(requested, available, card.balance)));
  return {
    card: {
      ...card,
      balance: toCents(card.balance - paid),
      statementBalance: toCents(Math.max(0, card.statementBalance - paid)),
    },
    paid,
  };
}

/*
 * Charge a purchase to the card. Charges above the limit are declined.
 * Returns { card, charged, declined }.
 */
export function charge(card, amount) {
  const amt = toCents(Math.max(0, amount));
  const room = toCents(Math.max(0, card.limit - card.balance));
  const charged = Math.min(amt, room);
  return {
    card: { ...card, balance: toCents(card.balance + charged) },
    charged,
    declined: toCents(amt - charged),
  };
}

/*
 * Interest step, run once per month before the new statement cuts.
 * Interest only applies when the player carried a balance (lost the grace
 * period). Returns { card, interest }.
 */
export function accrueInterest(card) {
  if (card.paidLastStatementInFull || card.balance <= 0) {
    return { card, interest: 0 };
  }
  const interest = toCents(card.balance * (card.apr / 100) / 12);
  return { card: { ...card, balance: toCents(card.balance + interest) }, interest };
}

/* Minimum payment for a given statement balance. */
export function minimumPayment(statementBalance) {
  if (statementBalance <= 0) return 0;
  const pctPart = toCents(statementBalance * MIN_PAYMENT_PCT / 100);
  return toCents(Math.min(statementBalance, Math.max(MIN_PAYMENT_FLOOR, pctPart)));
}

/* Cut this month's statement: snapshot the balance the player must address. */
export function cutStatement(card) {
  return {
    ...card,
    statementBalance: card.balance,
    utilizationPct: card.limit > 0
      ? Math.round((card.balance / card.limit) * 1000) / 10
      : 0,
  };
}

/*
 * Apply a payment against the card from available cash.
 * `requested` is what the player wants to pay; `available` is the cash they
 * actually have. Pays the smaller of the two (and never more than the
 * balance). Judges the payment against the statement's minimum:
 *  - paid >= statement balance: paid in full, keeps the grace period.
 *  - paid >= minimum: on time, but the rest carries and will accrue interest.
 *  - paid < minimum: late mark plus a late fee.
 * Returns { card, paid, lateFee, status } where status is
 * 'paid_full' | 'paid_partial' | 'late' | 'no_balance'.
 */
export function applyPayment(card, requested, available) {
  if (card.statementBalance <= 0 && card.balance <= 0) {
    return { card: { ...card, paidLastStatementInFull: true }, paid: 0, lateFee: 0, status: 'no_balance' };
  }
  const minDue = minimumPayment(card.statementBalance);
  const paid = toCents(Math.max(0, Math.min(requested, available, card.balance)));
  let next = { ...card, balance: toCents(card.balance - paid) };
  let lateFee = 0;
  let status;

  if (paid >= card.statementBalance && card.statementBalance > 0) {
    status = 'paid_full';
    next.paidLastStatementInFull = true;
    next.onTimePayments += 1;
  } else if (paid >= minDue && minDue > 0) {
    status = 'paid_partial';
    next.paidLastStatementInFull = false;
    next.onTimePayments += 1;
  } else if (minDue > 0) {
    status = 'late';
    lateFee = LATE_FEE;
    next.paidLastStatementInFull = false;
    next.latePayments += 1;
    next.balance = toCents(next.balance + LATE_FEE);
  } else {
    status = 'no_balance';
    next.paidLastStatementInFull = true;
  }
  return { card: next, paid, lateFee, status };
}
