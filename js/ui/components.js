/*
 * components.js
 * Shared UI building blocks. Every view builds DOM through these helpers.
 *
 * The core primitive is el(tag, attrs, ...children):
 *   el('div', { class: 'card', onclick: fn }, 'text', otherNode)
 * Attributes starting with "on" become event listeners. Children may be
 * strings, numbers, nodes, arrays, or null/undefined (skipped).
 */

import { GLOSSARY } from '../../data/glossary.js';
import { usd } from '../engine/format.js';

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2), value);
    } else if (key === 'html') {
      node.innerHTML = value;
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, value);
    }
  }
  append(node, children);
  return node;
}

function append(node, children) {
  for (const child of children) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) { append(node, child); continue; }
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
}

/* Clear a container and render new children into it. */
export function mount(container, ...children) {
  container.replaceChildren();
  append(container, children);
  return container;
}

/* 2. Modals */

/*
 * Open a modal. `build(close)` returns the modal's content nodes.
 * Returns the close function. Clicking the backdrop or pressing Escape
 * closes the TOP modal only; modals stack (report -> explainer, etc.) and
 * body scroll stays locked until the last one closes.
 */
const modalStack = [];

export function openModal(build, opts = {}) {
  const root = document.getElementById('modal-root');
  if (modalStack.length === 0) document.body.style.overflow = 'hidden';
  const close = () => {
    if (!backdrop.isConnected) return;
    backdrop.remove();
    const i = modalStack.indexOf(close);
    if (i !== -1) modalStack.splice(i, 1);
    if (modalStack.length === 0) {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onEscape);
    }
    if (opts.onClose) opts.onClose();
  };
  const modal = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
  append(modal, [build(close)]);
  const backdrop = el('div', {
    class: 'modal-backdrop',
    onclick: (e) => { if (e.target === backdrop && !opts.sticky) close(); },
  }, modal);
  if (modalStack.length === 0) document.addEventListener('keydown', onEscape);
  modalStack.push(close);
  root.append(backdrop);
  return close;
}

/* One shared Escape handler: closes only the modal on top of the stack. */
function onEscape(e) {
  if (e.key === 'Escape' && modalStack.length > 0) {
    modalStack[modalStack.length - 1]();
  }
}

/* A standard close button for modal corners. */
export function closeBtn(close) {
  return el('button', { class: 'btn small modal-close', onclick: close, 'aria-label': 'Close' }, '✕');
}

/* 3. Glossary explainers ("why" buttons) */

const glossaryById = new Map(GLOSSARY.map((g) => [g.id, g]));

/* main.js registers this so explainers can deep-link into the Learn tab. */
let navigateToLearn = null;
export function setLearnNavigator(fn) { navigateToLearn = fn; }

/*
 * A small "?" button that opens a plain-language explainer.
 * Pass a glossary id, and optionally extra lines of "your numbers" context
 * so the explanation uses the player's own situation.
 */
export function whyButton(glossaryId, extraLines = []) {
  return el('button', {
    class: 'why',
    'aria-label': 'Explain this',
    onclick: (e) => {
      e.stopPropagation();
      openExplainer(glossaryId, extraLines);
    },
  }, '?');
}

export function openExplainer(glossaryId, extraLines = []) {
  const entry = glossaryById.get(glossaryId);
  openModal((close) => [
    closeBtn(close),
    el('h2', {}, entry ? entry.term : 'About this'),
    entry ? el('p', { class: 'muted' }, entry.definition) : null,
    ...extraLines.map((line) => el('p', {}, line)),
    entry && navigateToLearn ? el('button', {
      class: 'btn small ghost',
      onclick: () => { close(); navigateToLearn(entry.term); },
    }, 'Read more in Learn →') : null,
  ]);
}

export function glossaryEntry(id) {
  return glossaryById.get(id) || null;
}

/* 4. Small display helpers */

/* A labeled key/value stat row, optionally with a why button. */
export function statRow(key, value, opts = {}) {
  return el('div', { class: 'statrow' },
    el('span', { class: 'k' }, key, opts.why ? whyButton(opts.why, opts.whyLines || []) : null),
    el('span', { class: 'v' + (opts.tone ? ' ' + opts.tone + '-text' : '') }, value),
  );
}

/* A colored pill badge. */
export function pill(text, tone = '') {
  return el('span', { class: 'pill' + (tone ? ' ' + tone : '') }, text);
}

/* A progress meter 0..1 with a tone. */
export function meter(fraction, tone = '') {
  const pctWidth = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return el('div', { class: 'meter' + (tone ? ' ' + tone : '') },
    el('i', { style: 'width:' + pctWidth + '%' }));
}

/* Currency with a sign class for ledger rows. */
export function money(amount) {
  return el('span', { class: 'amt ' + (amount >= 0 ? 'in' : 'out') },
    (amount >= 0 ? '+' : '') + usd(amount));
}

/* A segmented control. `options` = [{value, label}], onPick(value). */
export function segmented(options, current, onPick) {
  return el('div', { class: 'seg' },
    options.map((o) => el('button', {
      class: o.value === current ? 'on' : '',
      onclick: () => onPick(o.value),
    }, o.label)));
}

/* A quick toast-style confirmation using a transient pill. */
export function flash(node, text) {
  const note = el('span', { class: 'pill good', style: 'margin-left:8px' }, text);
  node.after(note);
  setTimeout(() => note.remove(), 1800);
}
