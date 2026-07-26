/*
 * offers.js
 * The company-offer machine: every so often a fictional company pitches the
 * player a credit card, bank account, or investment. Some offers are good,
 * some are traps; the fine print always tells the truth for careful readers.
 *
 * Offers live in state.mailbox as instances:
 *   { instanceId, offerId, monthIndex, status: 'new'|'accepted'|'declined',
 *     pushy }
 * Accepting applies the offer's terms to the state (this module owns that).
 */

import { toCents, usd } from './format.js';
import { openCard } from './credit.js';

export const MAX_UNREAD = 3;
export const OFFER_CHANCE = 0.4;

let instanceCounter = 0;

/*
 * Maybe generate one offer for the month that just ran. Returns the new
 * mailbox instance (already pushed onto state.mailbox) or null.
 * Pool entries the player already has pending or accepted are skipped so
 * the mailbox stays varied.
 */
export function maybeGenerateOffer(state, pool, rng) {
  if (!state.settings.offersEnabled || !pool.length) return null;
  /* Only unopened mail blocks new offers. Mail the player has read but not
     decided on ("I'll think about it") never stops the flow. */
  const unread = state.mailbox.filter((m) => m.status === 'new' && !m.seen).length;
  if (unread >= MAX_UNREAD) return null;
  if (rng() >= OFFER_CHANCE) return null;

  const age = state.profile.age + Math.floor(state.time.monthIndex / 12);
  const seen = new Set(state.mailbox.map((m) => m.offerId));
  const eligible = pool.filter((o) => age >= o.minAge && !seen.has(o.id));
  if (!eligible.length) return null;

  const totalWeight = eligible.reduce((s, o) => s + o.weight, 0);
  let roll = rng() * totalWeight;
  let picked = eligible[eligible.length - 1];
  for (const o of eligible) {
    roll -= o.weight;
    if (roll <= 0) { picked = o; break; }
  }
  instanceCounter += 1;
  const instance = {
    instanceId: 'offer-' + state.time.monthIndex + '-' + instanceCounter,
    offerId: picked.id,
    monthIndex: state.time.monthIndex,
    status: 'new',
    pushy: !!picked.pushy,
  };
  state.mailbox.push(instance);
  if (state.mailbox.length > 40) state.mailbox.splice(0, state.mailbox.length - 40);
  return instance;
}

/* Find the full offer template for a mailbox instance. */
export function offerFor(instance, pool) {
  return pool.find((o) => o.id === instance.offerId) || null;
}

/*
 * Accept an offer: applies its effects to the (draft) state and marks the
 * instance. Returns { ok, error? } with a friendly error when the offer
 * cannot be applied (e.g. not enough cash for an investment minimum).
 */
export function acceptOffer(state, instanceId, pool) {
  const instance = state.mailbox.find((m) => m.instanceId === instanceId);
  if (!instance || instance.status !== 'new') return { ok: false, error: 'This offer is no longer open.' };
  const offer = offerFor(instance, pool);
  if (!offer) return { ok: false, error: 'This offer has expired.' };

  if (offer.kind === 'credit-card') {
    const t = offer.terms;
    if (state.card && state.card.balance > t.limit) {
      return {
        ok: false,
        error: 'Your current balance is bigger than this card\'s limit, so the issuer will not take the transfer. Pay the balance down first. (Real issuers check this too.)',
      };
    }
    const newCard = openCard(t.limit, t.apr, state.time.monthIndex);
    newCard.annualFee = t.annualFee || 0;
    newCard.rewardsPct = t.rewardsPct || 0;
    /* Annual fees bill from when THIS card was accepted, even though credit
       age (openedMonth) carries over from the old card. */
    newCard.feeAnniversaryMonth = state.time.monthIndex;
    if (state.card) {
      /* Switching cards: the balance, the statement you already owe, and
         your payment history all move with you; the fresh application is
         another hard inquiry. The grace period does not reset. */
      newCard.balance = state.card.balance;
      newCard.statementBalance = state.card.statementBalance;
      newCard.paidLastStatementInFull = state.card.paidLastStatementInFull;
      newCard.onTimePayments = state.card.onTimePayments;
      newCard.latePayments = state.card.latePayments;
      newCard.openedMonth = state.card.openedMonth;
      newCard.inquiries = [...state.card.inquiries, state.time.monthIndex];
    }
    if (t.signupBonus) {
      state.accounts.checking = toCents(state.accounts.checking + t.signupBonus);
      logOffer(state, offer.company + ' signup bonus', t.signupBonus);
    }
    state.card = newCard;
  } else if (offer.kind === 'checking') {
    state.checkingMonthlyFee = offer.terms.monthlyFee || 0;
  } else if (offer.kind === 'hysa') {
    const t = offer.terms;
    state.rates.hysaApy = t.apy;
    /* Teaser rates remember when to drop. */
    state.hysaTeaser = t.teaserMonths > 0
      ? { endsAtMonth: state.time.monthIndex + t.teaserMonths, afterApy: t.afterApy }
      : null;
  } else if (offer.kind === 'investment') {
    const t = offer.terms;
    if (state.accounts.checking < t.minimum) {
      return { ok: false, error: 'You need ' + usd(t.minimum, { cents: false }) + ' in checking to open this. The offer stays in your mailbox.' };
    }
    state.accounts.checking = toCents(state.accounts.checking - t.minimum);
    state.investments.push({
      id: 'inv-' + instance.instanceId,
      name: offer.company,
      balance: t.minimum,
      invested: t.minimum,
      returnPct: t.returnPct,
      risk: t.risk,
      collapseAtMonth: t.risk === 'scam' ? state.time.monthIndex + (t.collapseMonths || 5) : null,
      collapsed: false,
    });
    logOffer(state, 'Invested with ' + offer.company, -t.minimum);
  }

  instance.status = 'accepted';
  return { ok: true };
}

export function declineOffer(state, instanceId) {
  const instance = state.mailbox.find((m) => m.instanceId === instanceId);
  if (instance && instance.status === 'new') instance.status = 'declined';
}

/*
 * One month for investments: growth for honest ones, drama for scams.
 * Returns events for the report: [{ name, change, collapsed }].
 */
export function tickInvestments(state, rng) {
  const results = [];
  for (const inv of state.investments) {
    if (inv.collapsed || inv.balance <= 0) continue;
    if (inv.collapseAtMonth != null && state.time.monthIndex >= inv.collapseAtMonth) {
      const lost = inv.balance;
      inv.balance = 0;
      inv.collapsed = true;
      results.push({ name: inv.name, change: -lost, collapsed: true });
      continue;
    }
    let monthlyRate = Math.pow(1 + inv.returnPct / 100, 1 / 12) - 1;
    if (inv.risk === 'volatile') {
      /* Swings of up to +/-8% a month around the average. */
      monthlyRate += (rng() * 2 - 1) * 0.08;
    }
    const change = toCents(inv.balance * monthlyRate);
    inv.balance = toCents(inv.balance + change);
    results.push({ name: inv.name, change, collapsed: false });
  }
  return results;
}

/* Expire a teaser HYSA rate when its intro period ends. Returns true if it dropped. */
export function tickHysaTeaser(state) {
  if (state.hysaTeaser && state.time.monthIndex >= state.hysaTeaser.endsAtMonth) {
    state.rates.hysaApy = state.hysaTeaser.afterApy;
    state.hysaTeaser = null;
    return true;
  }
  return false;
}

function logOffer(state, label, amount) {
  state.ledger.push({ monthIndex: state.time.monthIndex, type: 'offer', label, amount, account: 'checking' });
}
