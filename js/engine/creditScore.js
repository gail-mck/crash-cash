/*
 * creditScore.js
 * A simplified FICO-style score from 300 to 850.
 *
 * Real scores are proprietary; this model keeps the same factor weights the
 * bureaus publish so the lessons transfer:
 *   payment history 35%, utilization 30%, credit age 15%,
 *   new credit (inquiries) 10%, credit mix 10%.
 * A player with no credit accounts has no score at all (null), which is
 * itself a lesson: you start invisible, not at zero.
 */

import { clamp } from './format.js';

export const SCORE_MIN = 300;
export const SCORE_MAX = 850;
const RANGE = SCORE_MAX - SCORE_MIN;

/*
 * Compute the score.
 * `profile`:
 *   hasCard: boolean, card: card object or null,
 *   debts: array of debt objects (each with kind),
 *   monthIndex: current sim month (for account age and inquiry recency).
 * Returns { score: number|null, parts } where parts shows each factor's
 * contribution as a 0-1 quality figure for the UI to explain.
 */
export function computeScore(profile) {
  const { card, debts = [], monthIndex = 0 } = profile;
  const hasAnyCredit = !!card || debts.length > 0;
  if (!hasAnyCredit) return { score: null, parts: null };

  /* Payment history: share of on-time payments; no history yet reads as ok. */
  const onTime = card ? card.onTimePayments : 0;
  const late = card ? card.latePayments : 0;
  const totalPayments = onTime + late;
  let history;
  if (totalPayments === 0) {
    history = 0.72;
  } else {
    const rate = onTime / totalPayments;
    /* Late marks hurt more than the raw rate suggests, like real scores. */
    history = clamp(Math.pow(rate, 3), 0, 1);
  }

  /* Utilization: best under 10%, fine under 30%, painful as it climbs. */
  let utilization = 0.85;
  if (card && card.limit > 0) {
    const u = clamp(card.balance / card.limit, 0, 1) * 100;
    if (u <= 10) utilization = 1 - (u / 10) * 0.05;
    else if (u <= 30) utilization = 0.95 - ((u - 10) / 20) * 0.25;
    else if (u <= 70) utilization = 0.70 - ((u - 30) / 40) * 0.40;
    else utilization = 0.30 - ((u - 70) / 30) * 0.25;
    utilization = clamp(utilization, 0.05, 1);
  }

  /* Credit age: saturates around five years of history. */
  const openedMonth = card ? card.openedMonth : monthIndex;
  const ageMonths = Math.max(0, monthIndex - openedMonth);
  const age = clamp(ageMonths / 60, 0, 1) * 0.8 + (ageMonths > 0 ? 0.2 : 0.05);

  /* New credit: each inquiry in the last 12 months stings a little. */
  const inquiries = card
    ? card.inquiries.filter((m) => monthIndex - m < 12).length
    : 0;
  const newCredit = clamp(1 - inquiries * 0.25, 0.2, 1);

  /* Mix: having different kinds of credit (card plus a loan) helps a bit. */
  const kinds = new Set(debts.map((d) => d.kind));
  if (card) kinds.add('card');
  const mix = clamp(0.4 + kinds.size * 0.2, 0.4, 1);

  const quality =
    history * 0.35 +
    utilization * 0.30 +
    clamp(age, 0, 1) * 0.15 +
    newCredit * 0.10 +
    mix * 0.10;

  const score = Math.round(SCORE_MIN + RANGE * clamp(quality, 0, 1));
  return {
    score,
    parts: { history, utilization, age: clamp(age, 0, 1), newCredit, mix },
  };
}

/* Human label for a score band, matching common industry language. */
export function scoreBand(score) {
  if (score == null) return 'No score yet';
  if (score >= 800) return 'Exceptional';
  if (score >= 740) return 'Very good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
}
