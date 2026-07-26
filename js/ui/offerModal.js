/*
 * offerModal.js
 * Shows one company offer like a piece of junk mail: big pitch up top,
 * expandable fine print below, accept / no thanks. After the decision,
 * the honest verdict and lesson appear.
 */

import { el, mount, openModal, closeBtn, whyButton, pill } from './components.js';
import { icon } from './icons.js';
import { OFFERS } from '../../data/offers.js';
import { acceptOffer, declineOffer, offerFor } from '../engine/offers.js';
import { usd } from '../engine/format.js';

const KIND_LABELS = {
  'credit-card': 'Credit card offer',
  checking: 'Bank account offer',
  hysa: 'Savings account offer',
  investment: 'Investment offer',
};

/* Open the modal for a mailbox instance. */
export function showOffer(ctx, instanceId) {
  const instance = ctx.state.mailbox.find((m) => m.instanceId === instanceId);
  if (!instance) return;
  const offer = offerFor(instance, OFFERS);
  if (!offer) return;
  let finePrintOpen = false;
  let decided = instance.status !== 'new';
  let error = '';

  openModal((close) => {
    const body = el('div', {});

    function render() {
      const inst = ctx.state.mailbox.find((m) => m.instanceId === instanceId) || instance;
      decided = inst.status !== 'new';
      mount(body,
        el('div', { class: 'offer-mail' }, icon('mail', 12), ' ' + KIND_LABELS[offer.kind].toUpperCase()),
        el('div', { class: 'offer-company' }, offer.company),
        el('div', { class: 'offer-head' }, offer.headline),
        el('p', { class: 'muted', style: 'margin-top:6px' }, offer.pitch, ' ', whyButton(offer.glossaryId)),

        el('button', {
          class: 'btn small', style: 'margin: 6px 0',
          onclick: () => { finePrintOpen = !finePrintOpen; render(); },
        }, finePrintOpen ? 'Hide the fine print' : 'Read the fine print'),
        finePrintOpen ? el('div', { class: 'fineprint' },
          offer.fineprint.map((fp) => el('div', { class: 'fp-row' },
            el('span', { class: 'muted' }, fp.label),
            el('b', { class: fp.tone === 'bad' ? 'bad-text' : fp.tone === 'good' ? 'good-text' : '' }, fp.value)))) : null,

        error ? el('p', { class: 'tiny bad-text' }, error) : null,

        decided
          ? el('div', { class: 'mt' },
              el('div', { class: 'row' },
                pill(inst.status === 'accepted' ? 'You accepted' : 'You passed', inst.status === 'accepted' ? 'brand' : ''),
                pill(qualityLabel(offer.quality), offer.quality === 'good' ? 'good' : offer.quality === 'bad' ? 'bad' : 'warn')),
              el('p', { class: 'muted mt' }, offer.lesson),
              el('button', { class: 'btn primary', onclick: close }, 'Got it'))
          : el('div', { class: 'row mt' },
              el('button', {
                class: 'btn primary',
                onclick: () => {
                  let result;
                  ctx.update((draft) => { result = acceptOffer(draft, instanceId, OFFERS); });
                  if (result && !result.ok) { error = result.error; } else { error = ''; }
                  render();
                },
              }, acceptLabel(offer)),
              el('button', {
                class: 'btn',
                onclick: () => {
                  ctx.update((draft) => declineOffer(draft, instanceId));
                  render();
                },
              }, 'No thanks'),
              el('span', { class: 'tiny' }, 'Deciding reveals whether this one was any good.')),
      );
    }

    render();
    return [closeBtn(close), body];
  });
}

function acceptLabel(offer) {
  if (offer.kind === 'investment') return 'Invest ' + usd(offer.terms.minimum, { cents: false });
  if (offer.kind === 'credit-card') return 'Apply for this card';
  return 'Open this account';
}

function qualityLabel(q) {
  return { good: 'Actually a good deal', mixed: 'Mixed bag', bad: 'A trap' }[q] || q;
}
