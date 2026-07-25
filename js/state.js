/*
 * state.js
 * The single source of truth for a Crash Cash save: the state shape, factory
 * defaults, localStorage persistence, and export/import.
 *
 * The engine never touches localStorage; persistence lives here and is
 * guarded so the same module loads cleanly inside Node tests.
 */

import { toCents } from './engine/format.js';

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'crash-cash-save-v1';

export const AGE_BANDS = ['12-13', '14-15', '16-17', '18-21', '22-25'];

export const DIFFICULTIES = [
  { id: 'peaceful', label: 'Peaceful', eventChance: 0, blurb: 'No surprises at all. Pure sandbox.' },
  { id: 'chill', label: 'Chill', eventChance: 0.25, blurb: 'Fewer surprises. Good for a first run.' },
  { id: 'normal', label: 'Real Life', eventChance: 0.45, blurb: 'Surprises happen about half of all months.' },
  { id: 'bold', label: 'Hard Mode', eventChance: 0.65, blurb: 'Life comes at you fast. Expenses hit harder.' },
];

/* Numeric minimum age for a band, used to filter jobs and events. */
export function bandMinAge(ageBand) {
  return parseInt(String(ageBand).split('-')[0], 10) || 12;
}

/* Whether this profile can open a credit card (18 or older). */
export function canHaveCard(state) {
  return bandMinAge(state.profile.ageBand) >= 18;
}

/*
 * Build a brand new save.
 * `profile`: { name, ageBand, difficulty, mode }
 * `mode` is 'explore' (free sandbox, the default) or 'challenge'
 * (goal-driven; the chosen goal is attached separately via goals.js).
 */
export function createInitialState(profile) {
  const minAge = bandMinAge(profile.ageBand);
  /* Older players start with a little more cash on hand. */
  const startingChecking = minAge >= 22 ? 800 : minAge >= 18 ? 400 : minAge >= 16 ? 150 : 60;
  const startingSavings = minAge >= 18 ? 200 : 40;

  return {
    version: SCHEMA_VERSION,
    profile: {
      name: profile.name || 'Player',
      ageBand: profile.ageBand || '16-17',
      difficulty: profile.difficulty || (profile.mode === 'challenge' ? 'normal' : 'peaceful'),
      mode: profile.mode || 'explore',
    },
    goal: null,
    time: { monthIndex: 0, startYear: 2026, startMonth: 0 },
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
    budget: {
      categories: defaultBudget(minAge),
      autoSave: { savings: 0, hysa: 0 },
    },
    settings: {
      eventPayMethod: 'checking',
      cardAutopay: 'full',
      extraWithholding: 0,
    },
    ytd: emptyYtd(),
    lastYearTax: null,
    score: { value: null, history: [] },
    history: [],
    ledger: [],
    report: null,
    flags: { onboarded: true, seenReportHint: false },
  };
}

/* Age-appropriate starter budget categories. */
export function defaultBudget(minAge) {
  if (minAge >= 18) {
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
  const owned = a.checking + a.savings + a.hysa + a.retirement;
  const cardDebt = state.card ? state.card.balance : 0;
  const loanDebt = state.debts.reduce((s, d) => s + Math.max(0, d.principal), 0);
  return toCents(owned - cardDebt - loanDebt);
}

/* Append a ledger entry, keeping the ledger from growing without bound. */
export function logTxn(state, entry) {
  state.ledger.push({ monthIndex: state.time.monthIndex, ...entry });
  if (state.ledger.length > 400) state.ledger.splice(0, state.ledger.length - 400);
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
