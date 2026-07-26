/*
 * state.js
 * The single source of truth for a Crash Cash save: the state shape, factory
 * defaults, localStorage persistence, and export/import.
 *
 * Schema v2: numeric age (ages 1 year per 12 simulated months), simulation
 * starts at the real current month, guided setup steps, offer mailbox,
 * and investments.
 *
 * The engine never touches localStorage; persistence lives here and is
 * guarded so the same module loads cleanly inside Node tests.
 */

import { toCents } from './engine/format.js';

export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'crash-cash-save-v1';

/* Starting-age quick picks for onboarding. Any age 12+ is valid. */
export const STARTING_AGES = [
  { age: 12, label: '12', blurb: 'First money: allowance, chores, informal gigs.' },
  { age: 14, label: '14', blurb: 'First real gigs and a savings habit.' },
  { age: 16, label: '16', blurb: 'First W-2 job, first taxes withheld.' },
  { age: 18, label: '18', blurb: 'Credit unlocks. So do the consequences.' },
  { age: 22, label: '22', blurb: 'Career, benefits, 401k, the whole deal.' },
  { age: 26, label: '26+', blurb: 'Bigger paychecks, bigger decisions.' },
];

export const DIFFICULTIES = [
  { id: 'peaceful', label: 'Peaceful', eventChance: 0, blurb: 'No surprises at all. Pure sandbox.' },
  { id: 'chill', label: 'Chill', eventChance: 0.25, blurb: 'Fewer surprises. Good for a first run.' },
  { id: 'normal', label: 'Real Life', eventChance: 0.45, blurb: 'Surprises happen about half of all months.' },
  { id: 'bold', label: 'Hard Mode', eventChance: 0.65, blurb: 'Life comes at you fast. Expenses hit harder.' },
];

/* Guided setup steps, in order. 'done' unlocks everything. */
export const SETUP_STEPS = ['job', 'budget', 'bank', 'first-month', 'done'];

/*
 * The character's age right now: starting age plus one year for every
 * twelve simulated months.
 */
export function currentAge(state) {
  return state.profile.age + Math.floor(state.time.monthIndex / 12);
}

/* Whether this character can open a credit card (18 or older, right now). */
export function canHaveCard(state) {
  return currentAge(state) >= 18;
}

/*
 * Build a brand new save.
 * `profile`: { name, age (starting age, number), difficulty, mode }
 * `mode` is 'explore' (free sandbox, the default) or 'challenge'.
 */
export function createInitialState(profile) {
  const age = Math.max(12, Number(profile.age) || 16);
  const startingChecking = age >= 22 ? 800 : age >= 18 ? 400 : age >= 16 ? 150 : 60;
  const startingSavings = age >= 18 ? 200 : 40;
  const now = new Date();

  return {
    version: SCHEMA_VERSION,
    profile: {
      name: profile.name || 'Player',
      age,
      difficulty: profile.difficulty || (profile.mode === 'challenge' ? 'normal' : 'peaceful'),
      mode: profile.mode || 'explore',
    },
    goal: null,
    time: { monthIndex: 0, startYear: now.getFullYear(), startMonth: now.getMonth() },
    job: null,
    accounts: {
      checking: startingChecking,
      savings: startingSavings,
      hysa: 0,
      retirement: 0,
    },
    rates: {
      savingsApy: 0.4,
      hysaApy: 4.0,
      retirementReturn: 7.0,
      cardApr: 24.0,
    },
    card: null,
    debts: [],
    investments: [],
    mailbox: [],
    checkingMonthlyFee: 0,
    budget: {
      categories: defaultBudget(age),
      autoSave: { savings: 0, hysa: 0 },
    },
    settings: {
      eventPayMethod: 'checking',
      cardAutopay: 'full',
      extraWithholding: 0,
      offersEnabled: true,
    },
    ytd: emptyYtd(),
    lastYearTax: null,
    score: { value: null, history: [] },
    history: [],
    ledger: [],
    report: null,
    flags: { setupStep: 'job' },
  };
}

/* Age-appropriate starter budget categories. */
export function defaultBudget(age) {
  if (age >= 18) {
    return [
      { id: 'housing', name: 'Rent & utilities', kind: 'need', planned: 0, method: 'debit' },
      { id: 'food', name: 'Food & groceries', kind: 'need', planned: 200, method: 'debit' },
      { id: 'transport', name: 'Getting around', kind: 'need', planned: 60, method: 'debit' },
      { id: 'phone', name: 'Phone & internet', kind: 'need', planned: 40, method: 'debit' },
      { id: 'fun', name: 'Fun & going out', kind: 'want', planned: 80, method: 'debit' },
      { id: 'shopping', name: 'Shopping', kind: 'want', planned: 40, method: 'debit' },
    ];
  }
  return [
    { id: 'food', name: 'Snacks & food out', kind: 'want', planned: 25, method: 'debit' },
    { id: 'fun', name: 'Games & fun', kind: 'want', planned: 20, method: 'debit' },
    { id: 'shopping', name: 'Shopping', kind: 'want', planned: 15, method: 'debit' },
  ];
}

export function emptyYtd() {
  return {
    gross: 0,
    incomeTaxable: 0,
    ficaWages: 0,
    fedWithheld: 0,
    stateWithheld: 0,
    fica: 0,
    retirement: 0,
    match: 0,
  };
}

/* Net worth: everything owned minus everything owed. */
export function netWorth(state) {
  const a = state.accounts;
  const invested = (state.investments || []).reduce((s, inv) => s + Math.max(0, inv.balance), 0);
  const owned = a.checking + a.savings + a.hysa + a.retirement + invested;
  const cardDebt = state.card ? state.card.balance : 0;
  const loanDebt = state.debts.reduce((s, d) => s + Math.max(0, d.principal), 0);
  return toCents(owned - cardDebt - loanDebt);
}

/* Append a ledger entry, keeping the ledger from growing without bound. */
export function logTxn(state, entry) {
  state.ledger.push({ monthIndex: state.time.monthIndex, ...entry });
  if (state.ledger.length > 400) state.ledger.splice(0, state.ledger.length - 400);
}

/* Whether a given area of the app is unlocked under guided setup. */
export function isUnlocked(state, area) {
  const step = state.flags.setupStep || 'done';
  if (step === 'done') return true;
  const order = { job: 0, budget: 1, bank: 2, 'first-month': 3, done: 4 };
  const reached = order[step] ?? 4;
  const needs = { dashboard: 3, job: 0, budget: 1, bank: 2, mailbox: 4, learn: 4, settings: 4 };
  return reached >= (needs[area] ?? 0);
}

/* Advance the guided setup to the next step. Returns the new step. */
export function advanceSetup(state) {
  const i = SETUP_STEPS.indexOf(state.flags.setupStep || 'done');
  const next = SETUP_STEPS[Math.min(i + 1, SETUP_STEPS.length - 1)];
  state.flags.setupStep = next;
  return next;
}

const hasStorage = typeof localStorage !== 'undefined';

export function saveState(state) {
  if (!hasStorage) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState() {
  if (!hasStorage) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearState() {
  if (hasStorage) localStorage.removeItem(STORAGE_KEY);
}

/* Export the save as a pretty JSON string the player can keep as a file. */
export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

/* Import a save exported earlier. Returns the state or throws with a reason. */
export function importState(json) {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object') throw new Error('That file is not a Crash Cash save.');
  if (parsed.version !== SCHEMA_VERSION) throw new Error('That save is from a different version of Crash Cash.');
  if (!parsed.profile || !parsed.accounts || !parsed.time) throw new Error('That save file is missing required data.');
  return parsed;
}
