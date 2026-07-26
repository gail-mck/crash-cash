/*
 * Tests for the company-offer machine: generation, accepting each offer
 * kind, teaser rates expiring, scams collapsing, fees biting, and aging.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceMonth } from '../../js/engine/engine.js';
import {
  maybeGenerateOffer, acceptOffer, declineOffer, tickInvestments,
  tickHysaTeaser, offerFor,
} from '../../js/engine/offers.js';
import { createInitialState, currentAge, canHaveCard } from '../../js/state.js';

const neverEvent = () => 0.99;

function adult() {
  const state = createInitialState({ name: 'Rae', age: 23, difficulty: 'peaceful' });
  state.time.startYear = 2026;
  state.time.startMonth = 0;
  return state;
}

/* A plain $1,000 card with no history, for switch tests. */
function openCardLike() {
  return {
    limit: 1000, apr: 24, balance: 0, statementBalance: 0,
    paidLastStatementInFull: true, onTimePayments: 0, latePayments: 0,
    openedMonth: 0, feeAnniversaryMonth: 0, inquiries: [0], utilizationPct: 0,
  };
}

const CARD_OFFER = {
  id: 'test-card', kind: 'credit-card', company: 'Test Card Co.', headline: 'A card',
  pitch: '', minAge: 18, pushy: true, weight: 5, quality: 'mixed',
  terms: { limit: 2000, apr: 29.99, annualFee: 95, rewardsPct: 1.5, signupBonus: 100 },
  fineprint: [], lesson: '', glossaryId: 'apr',
};
const HYSA_TEASER = {
  id: 'test-teaser', kind: 'hysa', company: 'Teaser Bank', headline: 'HUGE rate',
  pitch: '', minAge: 12, pushy: false, weight: 5, quality: 'bad',
  terms: { apy: 5.5, teaserMonths: 3, afterApy: 0.5 },
  fineprint: [], lesson: '', glossaryId: 'apy',
};
const SCAM = {
  id: 'test-scam', kind: 'investment', company: 'MoonShot Fund', headline: 'GUARANTEED 30%',
  pitch: '', minAge: 18, pushy: true, weight: 5, quality: 'bad',
  terms: { minimum: 500, returnPct: 30, risk: 'scam', collapseMonths: 3 },
  fineprint: [], lesson: '', glossaryId: 'compound-interest',
};
const FEE_CHECKING = {
  id: 'test-checking', kind: 'checking', company: 'Fee Bank', headline: 'Premium!',
  pitch: '', minAge: 16, pushy: false, weight: 5, quality: 'bad',
  terms: { monthlyFee: 12, feeWaiverNote: '', perk: 'a shiny app' },
  fineprint: [], lesson: '', glossaryId: 'checking-account',
};

test('offers land in the mailbox, filtered by age, and never repeat', () => {
  const state = adult();
  const rig = () => 0.1; /* always under the offer chance */
  const first = maybeGenerateOffer(state, [CARD_OFFER], rig);
  assert.ok(first, 'offer generated');
  assert.equal(state.mailbox.length, 1);
  const second = maybeGenerateOffer(state, [CARD_OFFER], rig);
  assert.equal(second, null, 'same offer never sent twice');

  const kid = createInitialState({ name: 'Kid', age: 12, difficulty: 'peaceful' });
  assert.equal(maybeGenerateOffer(kid, [CARD_OFFER], rig), null, 'no card offers for a 12 year old');
});

test('accepting a card offer applies its terms, bonus, and inquiry', () => {
  const state = adult();
  state.card = null;
  maybeGenerateOffer(state, [CARD_OFFER], () => 0.1);
  const before = state.accounts.checking;
  const res = acceptOffer(state, state.mailbox[0].instanceId, [CARD_OFFER]);
  assert.equal(res.ok, true);
  assert.equal(state.card.limit, 2000);
  assert.equal(state.card.annualFee, 95);
  assert.equal(state.accounts.checking, before + 100, 'signup bonus paid');
  assert.equal(state.mailbox[0].status, 'accepted');
});

test('declining marks the offer and applies nothing', () => {
  const state = adult();
  maybeGenerateOffer(state, [FEE_CHECKING], () => 0.1);
  declineOffer(state, state.mailbox[0].instanceId);
  assert.equal(state.mailbox[0].status, 'declined');
  assert.equal(state.checkingMonthlyFee, 0);
});

test('teaser HYSA rates drop on schedule', () => {
  let state = adult();
  maybeGenerateOffer(state, [HYSA_TEASER], () => 0.1);
  acceptOffer(state, state.mailbox[0].instanceId, [HYSA_TEASER]);
  assert.equal(state.rates.hysaApy, 5.5);
  for (let i = 0; i < 4; i++) {
    ({ state } = advanceMonth(state, [], neverEvent));
  }
  assert.equal(state.rates.hysaApy, 0.5, 'teaser expired to the after rate');
  assert.equal(state.hysaTeaser, null);
});

test('scam investments take the minimum, then collapse to zero', () => {
  let state = adult();
  maybeGenerateOffer(state, [SCAM], () => 0.1);
  const before = state.accounts.checking;
  const res = acceptOffer(state, state.mailbox[0].instanceId, [SCAM]);
  assert.equal(res.ok, true);
  assert.equal(state.accounts.checking, before - 500);
  assert.equal(state.investments.length, 1);

  let sawCollapse = false;
  for (let i = 0; i < 4; i++) {
    const r = advanceMonth(state, [], neverEvent);
    state = r.state;
    if (r.report.investments.some((inv) => inv.collapsed)) sawCollapse = true;
  }
  assert.ok(sawCollapse, 'the collapse was reported');
  assert.equal(state.investments[0].balance, 0, 'money gone');
});

test('investments need enough cash in checking', () => {
  const state = adult();
  state.accounts.checking = 100;
  maybeGenerateOffer(state, [SCAM], () => 0.1);
  const res = acceptOffer(state, state.mailbox[0].instanceId, [SCAM]);
  assert.equal(res.ok, false);
  assert.equal(state.mailbox[0].status, 'new', 'offer stays open');
});

test('fee checking accounts drain a little every month', () => {
  let state = adult();
  maybeGenerateOffer(state, [FEE_CHECKING], () => 0.1);
  acceptOffer(state, state.mailbox[0].instanceId, [FEE_CHECKING]);
  const before = state.accounts.checking;
  const { state: after, report } = advanceMonth(state, [], neverEvent);
  assert.equal(report.checkingFee, 12);
  assert.ok(after.accounts.checking <= before - 12 + 0.01);
});

test('characters age one year every twelve simulated months', () => {
  let state = createInitialState({ name: 'Teen', age: 17, difficulty: 'peaceful' });
  state.time.startYear = 2026;
  state.time.startMonth = 0;
  assert.equal(currentAge(state), 17);
  assert.equal(canHaveCard(state), false);
  for (let i = 0; i < 12; i++) {
    ({ state } = advanceMonth(state, [], neverEvent));
  }
  assert.equal(currentAge(state), 18, 'a year passed, a birthday happened');
  assert.equal(canHaveCard(state), true, 'credit unlocked at 18 mid-run');
});

test('switching cards carries the statement and the lost grace period', () => {
  const state = adult();
  /* Carrying a balance: grace period already lost, statement owed. */
  state.card = {
    limit: 1000, apr: 24, balance: 600, statementBalance: 600,
    paidLastStatementInFull: false, onTimePayments: 3, latePayments: 1,
    openedMonth: 0, feeAnniversaryMonth: 0, inquiries: [0], utilizationPct: 60,
  };
  state.time.monthIndex = 6;
  maybeGenerateOffer(state, [CARD_OFFER], () => 0.1);
  acceptOffer(state, state.mailbox[0].instanceId, [CARD_OFFER]);
  assert.equal(state.card.balance, 600, 'balance follows you');
  assert.equal(state.card.statementBalance, 600, 'so does what you already owe');
  assert.equal(state.card.paidLastStatementInFull, false, 'no free grace period reset');
  assert.equal(state.card.latePayments, 1, 'history follows you too');
  assert.equal(state.card.openedMonth, 0, 'credit age is preserved');
  assert.equal(state.card.feeAnniversaryMonth, 6, 'but the fee clock restarts');
});

test('a card offer is refused when the balance exceeds its limit', () => {
  const state = adult();
  state.card = { ...openCardLike(), balance: 1400 };
  const tinyCard = { ...CARD_OFFER, id: 'tiny-card', terms: { ...CARD_OFFER.terms, limit: 300 } };
  maybeGenerateOffer(state, [tinyCard], () => 0.1);
  const res = acceptOffer(state, state.mailbox[0].instanceId, [tinyCard]);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('limit'));
  assert.equal(state.card.limit, 1000, 'the old card is untouched');
});

test('reading mail without deciding does not block future offers', () => {
  const state = adult();
  const pool = [1, 2, 3, 4].map((n) => ({ ...CARD_OFFER, id: 'card-' + n }));
  for (let i = 0; i < 3; i++) maybeGenerateOffer(state, pool, () => 0.1);
  assert.equal(state.mailbox.length, 3);
  assert.equal(maybeGenerateOffer(state, pool, () => 0.1), null, 'three unread offers block a fourth');
  /* Opening them (what showOffer does) frees the queue again. */
  state.mailbox.forEach((m) => { m.seen = true; });
  assert.ok(maybeGenerateOffer(state, pool, () => 0.1), 'read but undecided mail does not block');
});

test('card annual fees land on the anniversary month', () => {
  let state = adult();
  maybeGenerateOffer(state, [CARD_OFFER], () => 0.1);
  acceptOffer(state, state.mailbox[0].instanceId, [CARD_OFFER]);
  let feeMonths = 0;
  /* 25 ticks cover both anniversaries: month 12 and month 24. */
  for (let i = 0; i < 25; i++) {
    const r = advanceMonth(state, [], neverEvent);
    state = r.state;
    if (r.report.cardAnnualFee > 0) feeMonths++;
  }
  assert.equal(feeMonths, 2, 'one fee per year over two years');
});
