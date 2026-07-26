/*
 * onboarding.js
 * The first-run wizard: name, starting age, and mode (Explore/Challenge).
 * The age chosen is the character's starting age; the character then ages
 * one year for every twelve simulated months, unlocking jobs and credit
 * along the way exactly like real life does.
 */

import { el, mount, segmented } from './components.js';
import { icon } from './icons.js';
import { createInitialState, STARTING_AGES, DIFFICULTIES } from '../state.js';
import { challengesForAge, startChallenge, CHALLENGES } from '../engine/goals.js';

export function renderOnboarding(ctx) {
  const draft = { name: '', age: 16, mode: 'explore', challengeId: null, difficulty: 'normal', skipSetup: false };
  let step = 0;
  const panel = el('div', { class: 'panel' });

  function render() {
    const steps = [renderWelcome, renderAge, renderMode, renderFinish];
    mount(panel,
      el('div', { class: 'steps-dots' },
        steps.map((_, i) => el('i', { class: i <= step ? 'on' : '' }))),
      steps[step]());
  }

  function next() { step += 1; render(); }
  function back() { step -= 1; render(); }

  function renderWelcome() {
    const input = el('input', {
      type: 'text', placeholder: 'What should we call you?', value: draft.name,
      oninput: (e) => { draft.name = e.target.value; },
      onkeydown: (e) => { if (e.key === 'Enter' && draft.name.trim()) next(); },
    });
    return el('div', {},
      el('h1', { class: 'hero-name' }, el('span', { class: 'crash' }, 'Crash'), ' Cash'),
      el('p', { class: 'hero-slogan' }, 'Crash-test your money. Jobs, taxes, credit, debt, savings: try everything here, where mistakes cost nothing.'),
      el('div', { class: 'card' },
        el('label', { class: 'field' }, el('span', {}, 'Your name'), input),
        el('button', {
          class: 'btn primary big',
          onclick: () => { if (draft.name.trim()) next(); else input.focus(); },
        }, 'Start exploring'),
      ),
      el('p', { class: 'tiny mt' }, 'Everything is simulated and saved only in your browser. No sign-up, no real money, no data leaves this page.'),
    );
  }

  function renderAge() {
    return el('div', { class: 'card' },
      el('h2', {}, 'Pick a starting age'),
      el('p', { class: 'muted' }, 'Like picking a character. Age decides which jobs, accounts, and credit products exist for you, and your character ages one year for every twelve simulated months. Start young and watch credit unlock at 18.'),
      el('div', { class: 'choices' },
        STARTING_AGES.map((opt) => el('button', {
          class: 'choice' + (draft.age === opt.age ? ' on' : ''),
          onclick: () => { draft.age = opt.age; render(); },
        },
          el('div', { class: 't' }, 'Age ' + opt.label),
          el('div', { class: 'd' }, opt.blurb),
        ))),
      el('div', { class: 'row' },
        el('button', { class: 'btn', onclick: back }, 'Back'),
        el('button', { class: 'btn primary', onclick: next }, 'Continue'),
      ),
    );
  }

  function renderMode() {
    const available = challengesForAge(draft.age);
    return el('div', { class: 'card' },
      el('h2', {}, 'How do you want to play?'),
      el('div', { class: 'choices' },
        el('button', {
          class: 'choice' + (draft.mode === 'explore' ? ' on' : ''),
          onclick: () => { draft.mode = 'explore'; draft.challengeId = null; render(); },
        },
          el('div', { class: 't' }, icon('compass'), ' Explore', draft.mode === 'explore' ? el('span', { class: 'pill brand' }, 'most popular') : null),
          el('div', { class: 'd' }, 'A free sandbox. Change anything any time, fast-forward months, no goals, no pressure. Like creative mode.'),
        ),
        el('button', {
          class: 'choice' + (draft.mode === 'challenge' ? ' on' : ''),
          onclick: () => { draft.mode = 'challenge'; draft.challengeId = available[0] ? available[0].id : null; render(); },
        },
          el('div', { class: 't' }, icon('target'), ' Challenge'),
          el('div', { class: 'd' }, 'Pick a goal and chase it while life throws surprises at you. Like survival mode.'),
        ),
      ),
      draft.mode === 'challenge' ? el('div', {},
        el('h3', { class: 'mt' }, 'Pick your challenge'),
        el('div', { class: 'choices' },
          available.map((c) => el('button', {
            class: 'choice' + (draft.challengeId === c.id ? ' on' : ''),
            onclick: () => { draft.challengeId = c.id; render(); },
          },
            el('div', { class: 't' }, icon(c.icon), ' ' + c.title),
            el('div', { class: 'd' }, c.blurb),
          ))),
        el('h3', {}, 'How wild should life be?'),
        el('div', { class: 'row mb' },
          segmented(
            DIFFICULTIES.map((d) => ({ value: d.id, label: d.label })),
            draft.difficulty,
            (v) => { draft.difficulty = v; render(); },
          )),
        el('p', { class: 'tiny' }, (DIFFICULTIES.find((d) => d.id === draft.difficulty) || {}).blurb || ''),
      ) : null,
      el('div', { class: 'row mt' },
        el('button', { class: 'btn', onclick: back }, 'Back'),
        el('button', { class: 'btn primary', onclick: next }, 'Continue'),
      ),
    );
  }

  function renderFinish() {
    const challenge = CHALLENGES.find((c) => c.id === draft.challengeId);
    return el('div', { class: 'card' },
      el('h2', {}, 'Ready, ' + draft.name.trim() + '?'),
      el('p', { class: 'muted' },
        'Starting at age ' + draft.age + ' in ' +
        (draft.mode === 'challenge' && challenge
          ? 'Challenge mode: ' + challenge.title + '.'
          : 'Explore mode: pure sandbox.')),
      el('p', {}, 'We will walk you through the first steps one at a time: job, budget, bank, then your first simulated month.'),
      el('label', { class: 'row', style: 'cursor:pointer; margin-bottom:12px' },
        el('input', { type: 'checkbox', onchange: (e) => { draft.skipSetup = e.target.checked; } }),
        el('span', { class: 'tiny' }, 'I have played before, skip the walkthrough and unlock everything')),
      el('div', { class: 'row' },
        el('button', { class: 'btn', onclick: back }, 'Back'),
        el('button', {
          class: 'btn primary big',
          onclick: () => {
            let state = createInitialState({
              name: draft.name.trim(),
              age: draft.age,
              mode: draft.mode,
              difficulty: draft.mode === 'challenge' ? draft.difficulty : 'peaceful',
            });
            if (draft.mode === 'challenge' && draft.challengeId) {
              state = startChallenge(state, draft.challengeId);
            }
            if (draft.skipSetup) state.flags.setupStep = 'done';
            ctx.replaceState(state);
            ctx.go('job');
          },
        }, "Let's go"),
      ),
    );
  }

  render();
  return el('div', { class: 'onboard' }, panel);
}
