/*
 * format.js
 * Small formatting helpers shared by the engine and the UI.
 * Pure functions only, safe to import from Node tests.
 */

/* Format a number as US dollars, e.g. 1234.5 -> "$1,234.50". */
export function usd(amount, opts = {}) {
  const { cents = true, sign = false } = opts;
  const n = Number(amount) || 0;
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
  const prefix = n < 0 ? '-$' : (sign && n > 0 ? '+$' : '$');
  return prefix + formatted;
}

/* Format a percent value, e.g. 4 -> "4%", 4.25 -> "4.25%". */
export function pct(value, decimals = 2) {
  const n = Number(value) || 0;
  const rounded = Number(n.toFixed(decimals));
  return rounded + '%';
}

/* Round to cents to avoid floating point drift in balances. */
export function toCents(amount) {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

/* Clamp a number into [min, max]. */
export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/*
 * Convert an absolute month index (0 = the simulation's first month) plus the
 * calendar the sim started in, into a display label like "March 2027".
 */
export function monthLabel(monthIndex, startYear = 2026, startMonth = 0) {
  const total = startMonth + monthIndex;
  const year = startYear + Math.floor(total / 12);
  const m = total % 12;
  return MONTH_NAMES[m] + ' ' + year;
}

/* Calendar month number 0-11 for a given sim month index. */
export function calendarMonth(monthIndex, startMonth = 0) {
  return (startMonth + monthIndex) % 12;
}

export { MONTH_NAMES };
