/*
 * settingsView.js
 * Profile, mode switching, life-event frequency, the rates lab,
 * sandbox tools, save data (export/import/reset), and about.
 */

import { el, segmented, pill, openModal, closeBtn, flash } from './components.js';
import { DIFFICULTIES, exportState, importState } from '../state.js';
import { challengesForAge, startChallenge, CHALLENGES } from '../engine/goals.js';
import { bandMinAge } from '../state.js';
import { toCents } from '../engine/format.js';

export function renderSettingsView(ctx) {
  return el('div', {},
    renderProfile(ctx),
    renderEvents(ctx),
    renderRatesLab(ctx),
    renderSandboxTools(ctx),
    renderSaveData(ctx),
    renderAbout(),
  );
}

/* 1. Profile and mode. */

function renderProfile(ctx) {
  const state = ctx.state;
  const nameIn = el('input', {
    type: 'text', value: state.profile.name,
    onchange: (e) => ctx.update((d) => { d.profile.name = e.target.value.trim() || d.profile.name; }),
  });
  return el('div', { class: 'card' },
    el('h3', {}, '👤 Profile'),
    el('div', { class: 'grid cols-2' },
      el('label', { class: 'field' }, el('span', {}, 'Name'), nameIn),
      el('label', { class: 'field' }, el('span', {}, 'This run started at age'),
        el('input', { type: 'text', value: state.profile.ageBand, disabled: true })),
    ),
    el('p', { class: 'tiny' }, 'Age shapes the run (jobs, credit access). To try a different starting age, start a new run below.'),
    el('div', { class: 'mt' },
      el('span', { class: 'tiny', style: 'display:block; margin-bottom:6px' }, 'Mode'),
      segmented([
        { value: 'explore', label: '🧭 Explore' },
        { value: 'challenge', label: '🎯 Challenge' },
      ], state.profile.mode, (v) => {
        if (v === state.profile.mode) return;
        if (v === 'explore') {
          ctx.update((d) => { d.profile.mode = 'explore'; d.goal = null; });
        } else {
          pickChallenge(ctx);
        }
      }),
      el('p', { class: 'tiny mt' }, state.profile.mode === 'explore'
        ? 'Pure sandbox. Switch to Challenge any time to chase a goal.'
        : 'Chasing: ' + (CHALLENGES.find((c) => state.goal && c.id === state.goal.id) || { title: 'no goal picked yet' }).title + '. Switch to Explore to free-play.'),
    ),
  );
}

function pickChallenge(ctx) {
  const available = challengesForAge(bandMinAge(ctx.state.profile.ageBand));
  openModal((close) => [
    closeBtn(close),
    el('h2', {}, 'Pick your challenge'),
    el('div', { class: 'choices' },
      available.map((c) => el('button', {
        class: 'choice',
        onclick: () => {
          ctx.update((d) => {
            d.profile.mode = 'challenge';
            startChallenge(d, c.id);
            if (d.profile.difficulty === 'peaceful') d.profile.difficulty = 'normal';
          });
          close();
        },
      },
        el('div', { class: 't' }, c.emoji + ' ' + c.title),
        el('div', { class: 'd' }, c.blurb)))),
  ]);
}

/* 2. Life events frequency. */

function renderEvents(ctx) {
  const current = DIFFICULTIES.find((d) => d.id === ctx.state.profile.difficulty) || DIFFICULTIES[0];
  return el('div', { class: 'card mt' },
    el('h3', {}, '🎲 How often does life happen?'),
    segmented(
      DIFFICULTIES.map((d) => ({ value: d.id, label: d.label })),
      ctx.state.profile.difficulty,
      (v) => ctx.update((d) => { d.profile.difficulty = v; })),
    el('p', { class: 'tiny mt' }, current.blurb),
  );
}

/* 3. Rates lab. */

function renderRatesLab(ctx) {
  const rates = ctx.state.rates;
  const dial = (key, label, min, max, step, hint) => {
    const out = el('b', {}, rates[key] + '%');
    return el('label', { class: 'field' },
      el('span', {}, label, ' ', out),
      el('input', {
        type: 'range', min, max, step, value: rates[key],
        oninput: (e) => { out.textContent = e.target.value + '%'; },
        onchange: (e) => ctx.update((d) => { d.rates[key] = Number(e.target.value); }),
      }),
      el('span', { class: 'tiny' }, hint),
    );
  };
  return el('div', { class: 'card mt' },
    el('div', { class: 'row between' }, el('h3', {}, '🎚️ Rates lab'), pill('sandbox', 'brand')),
    el('p', { class: 'tiny' }, 'These dials exist to experiment with. What happens to five years of saving if rates halve? Crank them and find out.'),
    el('div', { class: 'grid cols-2' },
      dial('savingsApy', 'Savings APY', 0, 2, 0.05, 'Big banks pay almost nothing.'),
      dial('hysaApy', 'High-yield APY', 0, 6, 0.1, 'Online banks pay real interest.'),
      dial('retirementReturn', 'Retirement return', 0, 12, 0.5, 'Long-run stock averages sit near 7 to 10%.'),
      dial('cardApr', 'Credit card APR', 10, 36, 0.5, 'The average card charges over 20%.'),
    ),
  );
}

/* 4. Sandbox tools. */

function renderSandboxTools(ctx) {
  return el('div', { class: 'card mt' },
    el('div', { class: 'row between' }, el('h3', {}, '🧪 Sandbox tools'), pill('sandbox', 'brand')),
    el('div', { class: 'row' },
      el('button', { class: 'btn', onclick: () => ctx.advance(6) }, '⏩ Fast-forward 6 months'),
      el('button', { class: 'btn', onclick: () => ctx.advance(12) }, '⏭️ Fast-forward 12 months'),
      el('button', {
        class: 'btn',
        onclick: (e) => {
          ctx.update((d) => { d.accounts.checking = toCents(d.accounts.checking + 100); });
        },
      }, '🪄 Conjure $100'),
    ),
    el('p', { class: 'tiny mt' }, 'Fast-forwarding replays every month faithfully (pay, taxes, interest, events). The $100 is pure sandbox magic; real life does not have this button.'),
    el('div', { class: 'mt' },
      el('span', { class: 'tiny', style: 'display:block; margin-bottom:6px' }, 'Theme'),
      segmented([
        { value: '', label: 'System' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ], document.documentElement.dataset.theme || '', (v) => {
        if (v) {
          document.documentElement.dataset.theme = v;
          localStorage.setItem('crash-cash-theme', v);
        } else {
          delete document.documentElement.dataset.theme;
          localStorage.removeItem('crash-cash-theme');
        }
        ctx.refresh();
      })),
  );
}

/* 5. Save data. */

function renderSaveData(ctx) {
  const err = el('p', { class: 'tiny bad-text' });
  const fileIn = el('input', {
    type: 'file', accept: '.json,application/json', style: 'display:none',
    onchange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const next = importState(await file.text());
        ctx.replaceState(next);
      } catch (ex) {
        err.textContent = ex.message;
      }
    },
  });
  return el('div', { class: 'card mt' },
    el('h3', {}, '💾 Save data'),
    el('p', { class: 'tiny' }, 'Your run lives only in this browser. Export a file to keep it or move it to another device.'),
    el('div', { class: 'row' },
      el('button', {
        class: 'btn',
        onclick: (e) => {
          const blob = new Blob([exportState(ctx.state)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'crash-cash-save.json';
          a.click();
          URL.revokeObjectURL(a.href);
          flash(e.target, 'Exported!');
        },
      }, '⬇️ Export save'),
      el('button', { class: 'btn', onclick: () => fileIn.click() }, '⬆️ Import save'),
      el('button', {
        class: 'btn danger',
        onclick: () => openModal((close) => [
          closeBtn(close),
          el('h2', {}, 'Start a brand new run?'),
          el('p', { class: 'muted' }, 'This wipes the current run: job, accounts, history, everything. Export first if you want to keep it.'),
          el('div', { class: 'row' },
            el('button', { class: 'btn', onclick: close }, 'Keep playing'),
            el('button', { class: 'btn danger', onclick: () => { close(); ctx.replaceState(null); } }, 'Wipe and restart')),
        ]),
      }, '🗑️ Start over'),
      fileIn),
    err,
  );
}

/* 6. About. */

function renderAbout() {
  return el('div', { class: 'card mt' },
    el('h3', {}, '💥 Crash Cash'),
    el('p', { class: 'muted' }, 'Crash-test your money. A simulation for learning by doing: jobs, taxes, banking, credit, debt, and retirement with zero real-world risk.'),
    el('p', { class: 'tiny' }, 'Everything is simulated. Nothing here is financial advice, and no data ever leaves your browser. Open source under the MIT license.'),
  );
}
