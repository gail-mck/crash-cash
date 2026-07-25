/*
 * main.js
 * Boot, the tiny store, view routing, and the app shell.
 *
 * View contract: every view module exports render(ctx) returning a DOM node.
 * ctx = {
 *   state,                  the current (read-only by convention) state
 *   update(fn),             fn(draft) mutates a clone; then persist + rerender
 *   replaceState(next),     swap the whole state (import, reset, onboarding)
 *   go(viewId),             navigate to another view
 *   refresh(),              re-render the current view
 *   advance(months),        simulate N months, then show the Month Report
 * }
 */

import { loadState, saveState, clearState } from './state.js';
import { advanceMonth } from './engine/engine.js';
import { EVENTS } from '../data/events.js';
import { monthLabel } from './engine/format.js';
import { el, mount } from './ui/components.js';
import { renderOnboarding } from './ui/onboarding.js';
import { renderDashboard } from './ui/dashboard.js';
import { renderJobView } from './ui/jobView.js';
import { renderBudgetView } from './ui/budgetView.js';
import { renderBankView } from './ui/bankView.js';
import { renderLearnView } from './ui/learnView.js';
import { renderSettingsView } from './ui/settingsView.js';
import { showMonthReport } from './ui/reportModal.js';

const VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠', render: renderDashboard },
  { id: 'job', label: 'Job', icon: '💼', render: renderJobView },
  { id: 'budget', label: 'Budget', icon: '🧮', render: renderBudgetView },
  { id: 'bank', label: 'Bank', icon: '🏦', render: renderBankView },
  { id: 'learn', label: 'Learn', icon: '📚', render: renderLearnView },
  { id: 'settings', label: 'Settings', icon: '⚙️', render: renderSettingsView },
];

let state = loadState();
let currentView = 'dashboard';
const appRoot = document.getElementById('app');

/* Restore the player's theme choice before first paint settles. */
const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('crash-cash-theme') : null;
if (savedTheme) document.documentElement.dataset.theme = savedTheme;

const ctx = {
  get state() { return state; },
  update(fn) {
    const draft = structuredClone(state);
    fn(draft);
    state = draft;
    saveState(state);
    renderApp();
  },
  replaceState(next) {
    state = next;
    if (next) saveState(next); else clearState();
    currentView = 'dashboard';
    renderApp();
  },
  go(viewId) {
    currentView = viewId;
    renderApp();
    window.scrollTo({ top: 0 });
  },
  refresh() { renderApp(); },
  advance(months = 1) {
    let lastReport = null;
    let goalCelebration = null;
    for (let i = 0; i < months; i++) {
      const res = advanceMonth(state, EVENTS, Math.random);
      state = res.state;
      lastReport = res.report;
      if (res.report.goal && res.report.goal.justCompleted) goalCelebration = res.report.goal;
    }
    saveState(state);
    renderApp();
    if (lastReport) {
      showMonthReport(ctx, lastReport, { fastForwarded: months > 1 ? months : 0, goalCelebration });
    }
  },
};

/* Render the whole app: onboarding when there is no save, else the shell. */
function renderApp() {
  if (!state) {
    mount(appRoot, renderOnboarding(ctx));
    return;
  }
  const view = VIEWS.find((v) => v.id === currentView) || VIEWS[0];

  const navButtons = (extraClass) => VIEWS.map((v) => el('button', {
    class: 'navbtn' + (v.id === view.id ? ' active' : '') + (extraClass ? ' ' + extraClass : ''),
    onclick: () => ctx.go(v.id),
  }, el('span', { class: 'ico' }, v.icon), el('span', {}, v.label)));

  const sidenav = el('nav', { class: 'sidenav' },
    el('a', { class: 'logo', href: '#', onclick: (e) => { e.preventDefault(); ctx.go('dashboard'); } },
      el('span', { class: 'burst' }, '💥'),
      el('span', {},
        el('span', { class: 'word' }, 'Crash Cash'),
        el('span', { class: 'slogan' }, 'Crash-test your money'),
      )),
    ...navButtons(),
    el('div', { class: 'nav-spacer' }),
    el('div', { class: 'tiny', style: 'padding: 0 12px 6px' },
      'A simulation. No real money anywhere.'),
  );

  const topbar = el('div', { class: 'topbar' },
    el('div', {},
      el('div', { class: 'when' }, monthLabel(state.time.monthIndex, state.time.startYear, state.time.startMonth)),
      el('div', { class: 'who' },
        state.profile.name + ' · ' + state.profile.mode.replace(/^./, (c) => c.toUpperCase()) + ' mode'),
    ),
    el('button', { class: 'next-month', onclick: () => ctx.advance(1) },
      el('span', {}, '▶'), 'Next Month'),
  );

  const main = el('div', { class: 'main' }, topbar, view.render(ctx));
  const bottomnav = el('nav', { class: 'bottomnav' }, ...navButtons());

  mount(appRoot, el('div', { class: 'shell' }, sidenav, el('div', {}, main)), bottomnav);
}

renderApp();
