/*
 * icons.js
 * A tiny hand-rolled line-icon set (24x24, stroke = currentColor) so the UI
 * uses clean, quiet icons instead of emoji. No dependencies.
 *
 * icon(name, size?) returns an inline-flex span containing the SVG, so it
 * can sit inside buttons and headings and inherit their color.
 */

const PATHS = {
  /* Navigation */
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 9v11h5v-6h4v6h5V9"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
  sliders: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="var(--bg-raised)"/><circle cx="15" cy="12" r="2" fill="var(--bg-raised)"/><circle cx="7" cy="18" r="2" fill="var(--bg-raised)"/>',
  bank: '<path d="M3 9l9-6 9 6"/><path d="M4 9h16"/><path d="M6 9v8M10 9v8M14 9v8M18 9v8"/><path d="M3 20h18"/>',
  book: '<path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z"/><path d="M20 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M19.1 4.9l-2.2 2.2M7.1 16.9l-2.2 2.2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  /* Money objects */
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 9h18"/><circle cx="17" cy="14" r="1"/>',
  vault: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 8v2M12 14v2M8 12h2M14 12h2"/>',
  sprout: '<path d="M12 21v-8"/><path d="M12 13c0-4-3-6-7-6 0 4 3 6 7 6z"/><path d="M12 11c0-4 3-6 7-6 0 4-3 6-7 6z"/>',
  trendup: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  scale: '<path d="M12 4v16"/><path d="M5 7h14"/><path d="M5 7l-2.5 5a3 3 0 0 0 5 0z"/><path d="M19 7l-2.5 5a3 3 0 0 0 5 0z"/><path d="M8 20h8"/>',
  coins: '<circle cx="9" cy="9" r="6"/><path d="M15.5 6.5a6 6 0 1 1-9 9"/>',
  /* Actions and status */
  play: '<path d="M7 5l12 7-12 7z"/>',
  fastforward: '<path d="M4 5l8 7-8 7zM12 5l8 7-8 7z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  arrowright: '<path d="M4 12h16M13 5l7 7-7 7"/>',
  arrows: '<path d="M7 4l-4 4 4 4M3 8h13"/><path d="M17 12l4 4-4 4M21 16H8"/>',
  edit: '<path d="M4 20l4-1L20 7l-3-3L5 16z"/><path d="M14 6l3 3"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 20h16"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 20h16"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v4"/><path d="M12 17.5h.01"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.5 1 2.5h6c0-1 .2-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  gift: '<rect x="3" y="10" width="18" height="10" rx="1"/><path d="M3 7h18v3H3z"/><path d="M12 7v13"/><path d="M12 7c-2 0-4-1-4-2.5S10 2 12 5c2-3 4-2 4-.5S14 7 12 7z"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  flask: '<path d="M9 3h6"/><path d="M10 3v5L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3L14 8V3"/><path d="M7 15h10"/>',
  save: '<path d="M5 3h11l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h7V3"/><path d="M7 21v-7h10v7"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 1.7"/><path d="M12 16.5h.01"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5H4c0 3 1.5 5 4 5M16 5h4c0 3-1.5 5-4 5"/><path d="M12 13v4"/><path d="M8 20h8"/><path d="M10 17h4v3h-4z"/>',
};

/* Build an icon span. `size` in px (default 18). */
export function icon(name, size = 18) {
  const path = PATHS[name] || PATHS.info;
  const span = document.createElement('span');
  span.className = 'ic';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size
    + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + path + '</svg>';
  return span;
}

export const ICON_NAMES = Object.keys(PATHS);
