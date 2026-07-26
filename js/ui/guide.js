/*
 * guide.js
 * The guided first-run flow: areas unlock one at a time with a clear
 * "do this next" banner, and each completed step celebrates and points
 * at the next one. After the first Next Month: "have fun", all unlocked.
 *
 * Step order (state.flags.setupStep): job -> budget -> bank -> first-month -> done.
 */

import { el, openModal, closeBtn } from './components.js';
import { icon } from './icons.js';
import { advanceSetup } from '../state.js';

const STEP_INFO = {
  job: {
    n: 1, view: 'job', title: 'Get money coming in',
    text: 'Pick a job (or invent one). Every simulated month, its paycheck lands in your checking account with taxes handled like real life.',
  },
  budget: {
    n: 2, view: 'budget', title: 'Decide where money goes',
    text: 'Set what you plan to spend each month, and what saves itself automatically. You can be sensible or reckless; both teach.',
  },
  bank: {
    n: 3, view: 'bank', title: 'Tour your bank',
    text: 'See your accounts and what they pay you. Move some money into high-yield savings if you like what it earns.',
  },
  'first-month': {
    n: 4, view: 'dashboard', title: 'Run your first month',
    text: 'Hit the Next Month button (bottom right). Payday, spending, interest: it all happens at once, then gets explained.',
  },
};

export const TOTAL_STEPS = 4;

/* The banner shown at the top of the current step's view. */
export function guideBanner(ctx) {
  const step = ctx.state.flags.setupStep;
  const info = STEP_INFO[step];
  if (!info) return null;
  return el('div', { class: 'guide-banner' },
    el('span', { class: 'step-no' }, info.n),
    el('div', {},
      el('b', {}, 'Step ' + info.n + ' of ' + TOTAL_STEPS + ': ' + info.title),
      el('div', { class: 'muted', style: 'font-size:.88rem' }, info.text)),
  );
}

/*
 * Call when the current step's goal is achieved (e.g. a job was taken).
 * Advances the step, saves, and pops the congrats modal that moves the
 * player along. `stepJustDone` guards against double-firing.
 */
export function completeStep(ctx, stepJustDone) {
  if (ctx.state.flags.setupStep !== stepJustDone) return;
  ctx.update((draft) => { advanceSetup(draft); });
  const nextStep = ctx.state.flags.setupStep;
  const next = STEP_INFO[nextStep];

  openModal((close) => [
    el('div', { class: 'center', style: 'padding: 6px 0' },
      el('div', { style: 'margin-bottom: 8px; color: var(--good)' }, icon('check', 40)),
      el('h2', {}, congratsLine(stepJustDone)),
      next
        ? el('p', { class: 'muted' }, 'Next up: ' + next.title.toLowerCase() + '.')
        : el('p', { class: 'muted' }, 'Everything is unlocked. Poke every button; nothing here can hurt you.'),
      el('button', {
        class: 'btn primary big mt',
        onclick: () => { close(); if (next) ctx.go(next.view); },
      }, next ? 'Take me there' : 'Have fun!'),
    ),
  ], { sticky: true });
}

function congratsLine(step) {
  return {
    job: 'Job landed!',
    budget: 'Budget set!',
    bank: 'Bank toured!',
    'first-month': 'First month survived!',
  }[step] || 'Done!';
}

/* Marks the bank step complete from an explicit button on the bank view. */
export function bankStepButton(ctx) {
  if (ctx.state.flags.setupStep !== 'bank') return null;
  return el('button', {
    class: 'btn primary mt',
    onclick: () => completeStep(ctx, 'bank'),
  }, 'Looks good, what\'s next?');
}

/* Same for the budget view. */
export function budgetStepButton(ctx) {
  if (ctx.state.flags.setupStep !== 'budget') return null;
  return el('button', {
    class: 'btn primary mt',
    onclick: () => completeStep(ctx, 'budget'),
  }, 'My plan is ready');
}
