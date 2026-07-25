/*
 * onboarding.js
 * The first-run wizard: name, starting age for the run, mode
 * (Explore or Challenge), and challenge/difficulty selection.
 * Framing note: the age chosen here is the simulated character's starting
 * age. It gates which jobs and credit products exist in the sim, exactly
 * like real life does.
 */

import { el, mount, segmented } from './components.js';
import { createInitialState, AGE_BANDS, DIFFICULTIES, bandMinAge } from '../state.js';
import { challengesForAge, startChallenge, CHALLENGES } from '../engine/goals.js';

const AGE_DESCRIPTIONS = {
  '12-13': 'First money: allowance, chores, informal gigs.',
  '14-15': 'First real gigs and a savings habit.',
  '16-17': 'First W-2 job, first taxes withheld.',
  '18-21': 'Credit unlocks. So do the consequences.',
  '22-25': 'Career, benefits, 401k, the whole deal.',
};

export function renderOnboarding(ctx) {
  const draft = { name: '', ageBand: '16-17', mode: 'explore', challengeId: null, difficulty: 'normal' };
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
      el('h2', {}, 'Pick a starting age for this run'),
      el('p', { class: 'muted' }, 'Like picking a character. It decides which jobs, accounts, and credit products exist for you, just like real life. You can start a new run any time.'),
      el('div', { class: 'choices' },
        AGE_BANDS.map((band) => el('button', {
          class: 'choice' + (draft.ageBand === band ? ' on' : ''),
          onclick: () => { draft.ageBand = band; render(); },
        },
          el('div', { class: 't' }, band + ' years old'),
          el('div', { class: 'd' }, AGE_DESCRIPTIONS[band]),
        ))),
      el('div', { class: 'row' },
        el('button', { class: 'btn', onclick: back }, 'Back'),
        el('button', { class: 'btn primary', onclick: next }, 'Continue'),
      ),
    );
  }

  function renderMode() {
    const minAge = bandMinAge(draft.ageBand);
    const available = challengesForAge(minAge);
    return el('div', { class: 'card' },
      el('h2', {}, 'How do you want to play?'),
      el('div', { class: 'choices' },
        el('button', {
          class: 'choice' + (draft.mode === 'explore' ? ' on' : ''),
          onclick: () => { draft.mode = 'explore'; draft.challengeId = null; render(); },
        },
          el('div', { class: 't' }, '🧭 Explore', draft.mode === 'explore' ? el('span', { class: 'pill brand' }, 'most popular') : null),
          el('div', { class: 'd' }, 'A free sandbox. Change anything any time, fast-forward months, no goals, no pressure. Like creative mode.'),
        ),
        el('button', {
          class: 'choice' + (draft.mode === 'challenge' ? ' on' : ''),
          onclick: () => { draft.mode = 'challenge'; draft.challengeId = available[0] ? available[0].id : null; render(); },
        },
          el('div', { class: 't' }, '🎯 Challenge'),
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
            el('div', { class: 't' }, c.emoji + ' ' + c.title),
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
        'Starting at age ' + draft.ageBand + ' in ' +
        (draft.mode === 'challenge' && challenge
          ? 'Challenge mode: ' + challenge.emoji + ' ' + challenge.title + '.'
          : 'Explore mode: pure sandbox.')),
      el('p', {}, 'First stop: grab a job in the Job tab so money starts flowing, then hit Next Month to watch your first paycheck land.'),
      el('div', { class: 'row' },
        el('button', { class: 'btn', onclick: back }, 'Back'),
        el('button', {
          class: 'btn primary big',
          onclick: () => {
            let state = createInitialState({
              name: draft.name.trim(),
              ageBand: draft.ageBand,
              mode: draft.mode,
              difficulty: draft.mode === 'challenge' ? draft.difficulty : 'peaceful',
            });
            if (draft.mode === 'challenge' && draft.challengeId) {
              state = startChallenge(state, draft.challengeId);
            }
            ctx.replaceState(state);
            ctx.go('job');
          },
        }, "Let's go 💥"),
      ),
    );
  }

  render();
  return el('div', { class: 'onboard' }, panel);
}
