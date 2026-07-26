/*
 * mailboxView.js
 * The Mailbox tab: every company offer that ever arrived, newest first.
 * Unread offers carry a dot; opening one shows the full junk-mail modal.
 */

import { el, pill } from './components.js';
import { icon } from './icons.js';
import { OFFERS } from '../../data/offers.js';
import { offerFor } from '../engine/offers.js';
import { monthLabel } from '../engine/format.js';
import { showOffer } from './offerModal.js';

export function renderMailboxView(ctx) {
  const state = ctx.state;
  const items = [...state.mailbox].reverse();

  return el('div', {},
    el('div', { class: 'card' },
      el('h2', {}, icon('mail', 20), ' Mailbox'),
      el('p', { class: 'muted' },
        'Companies will keep pitching you cards, accounts, and investments. Some offers are genuinely good, some are traps. The fine print always tells the truth; reading it is the skill this tab exists to build.'),
      items.length === 0
        ? el('p', { class: 'muted' }, 'Nothing yet. Offers show up as months pass. The pushy ones will interrupt you all by themselves.')
        : items.map((inst) => renderItem(ctx, inst)),
    ),
    el('div', { class: 'card mt' },
      el('h3', {}, icon('sliders', 18), ' Offer mail'),
      el('label', { class: 'row', style: 'cursor:pointer' },
        el('input', {
          type: 'checkbox',
          checked: state.settings.offersEnabled ? true : null,
          onchange: (e) => ctx.update((d) => { d.settings.offersEnabled = e.target.checked; }),
        }),
        el('span', { class: 'muted' }, 'Let companies send me offers (recommended: saying no to bad deals is a skill)')),
    ),
  );
}

function renderItem(ctx, inst) {
  const offer = offerFor(inst, OFFERS);
  if (!offer) return null;
  const state = ctx.state;
  return el('button', { class: 'mail-item', onclick: () => showOffer(ctx, inst.instanceId) },
    inst.status === 'new' ? el('span', { class: 'badge-dot' }) : el('span', { style: 'width:8px; flex:none' }),
    el('span', { style: 'flex:1; min-width:0' },
      el('span', { class: 't', style: 'font-weight:700; display:block' }, offer.headline),
      el('span', { class: 'tiny' }, offer.company + ' · ' + monthLabel(inst.monthIndex, state.time.startYear, state.time.startMonth))),
    inst.status === 'accepted' ? pill('accepted', 'brand')
      : inst.status === 'declined' ? pill('passed', '')
      : pill('new', 'good'),
  );
}

/* Unread count for the nav badge. */
export function unreadCount(state) {
  return (state.mailbox || []).filter((m) => m.status === 'new').length;
}
