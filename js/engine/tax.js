/*
 * tax.js
 * Federal income tax, FICA, state tax, withholding, and year-end
 * reconciliation ("tax season") for the Crash Cash simulation.
 *
 * Simplifications, on purpose and documented in the UI:
 *  - Single filer only, standard deduction only.
 *  - 2025 brackets are used for every simulated year (no inflation indexing).
 *  - Monthly withholding is the annualized liability divided by 12, plus any
 *    extra withholding the player asks for. Real payroll tables are close to
 *    this but not exact, which is one reason real refunds exist.
 *  - Retirement (401k/403b) and health premiums are treated as pre-tax for
 *    income tax. FICA is charged on gross minus health premium only, since
 *    401k contributions still owe FICA in real life.
 */

import { toCents } from './format.js';

/* 2025 single-filer federal brackets: [rate, upper bound of taxable income]. */
export const FEDERAL_BRACKETS = [
  [0.10, 11925],
  [0.12, 48475],
  [0.22, 103350],
  [0.24, 197300],
  [0.32, 250525],
  [0.35, 626350],
  [0.37, Infinity],
];

export const STANDARD_DEDUCTION = 15000;
export const SS_RATE = 0.062;
export const SS_WAGE_CAP = 176100;
export const MEDICARE_RATE = 0.0145;

/*
 * Annual federal income tax on taxable income (income after the standard
 * deduction has already been subtracted). Returns dollars, never negative.
 */
export function federalTaxOnTaxable(taxable) {
  let tax = 0;
  let lower = 0;
  for (const [rate, upper] of FEDERAL_BRACKETS) {
    if (taxable <= lower) break;
    const inBracket = Math.min(taxable, upper) - lower;
    tax += inBracket * rate;
    lower = upper;
  }
  return toCents(Math.max(0, tax));
}

/*
 * Annual federal income tax on gross-style annual income (before deduction).
 * `pretaxAnnual` is retirement plus health premiums for the year.
 */
export function federalTaxAnnual(incomeAnnual, pretaxAnnual = 0) {
  const taxable = Math.max(0, incomeAnnual - pretaxAnnual - STANDARD_DEDUCTION);
  return federalTaxOnTaxable(taxable);
}

/*
 * The marginal rate (the rate on the next dollar) for a given annual income
 * after pre-tax deductions. Used by explainer copy.
 */
export function marginalRate(incomeAnnual, pretaxAnnual = 0) {
  const taxable = Math.max(0, incomeAnnual - pretaxAnnual - STANDARD_DEDUCTION);
  let lower = 0;
  for (const [rate, upper] of FEDERAL_BRACKETS) {
    if (taxable <= upper && taxable > lower) return rate;
    if (taxable === 0) return 0;
    lower = upper;
  }
  return FEDERAL_BRACKETS[FEDERAL_BRACKETS.length - 1][0];
}

/*
 * FICA for one month. Social Security stops once year-to-date FICA-taxable
 * wages pass the cap; Medicare never stops.
 * `ficaWagesMonthly` is gross minus health premium for the month.
 * `ytdFicaWages` is the total FICA-taxable wages earned earlier this year.
 */
export function ficaMonthly(ficaWagesMonthly, ytdFicaWages = 0) {
  const wages = Math.max(0, ficaWagesMonthly);
  const roomUnderCap = Math.max(0, SS_WAGE_CAP - Math.max(0, ytdFicaWages));
  const ssWages = Math.min(wages, roomUnderCap);
  const ss = toCents(ssWages * SS_RATE);
  const medicare = toCents(wages * MEDICARE_RATE);
  return { ss, medicare, total: toCents(ss + medicare) };
}

/*
 * Monthly federal withholding: annualize this month's taxable pay, compute
 * the yearly tax, take one twelfth, then add any player-chosen extra.
 */
export function monthlyFederalWithholding(taxableMonthly, extraMonthly = 0) {
  const annualTax = federalTaxOnTaxable(
    Math.max(0, taxableMonthly * 12 - STANDARD_DEDUCTION)
  );
  return toCents(annualTax / 12 + Math.max(0, extraMonthly));
}

/* Flat state income tax for one month. `ratePct` is e.g. 5 for 5%. */
export function stateTaxMonthly(taxableMonthly, ratePct = 0) {
  return toCents(Math.max(0, taxableMonthly) * Math.max(0, ratePct) / 100);
}

/*
 * Tax season: reconcile a finished year. `ytd` carries what actually happened:
 *   { incomeTaxable: annual income after pre-tax deductions (before the
 *     standard deduction), fedWithheld: total federal withholding }
 * Returns the true liability and the refund (positive) or amount owed
 * (negative refund means the player owes).
 */
export function reconcileYear(ytd) {
  const liability = federalTaxOnTaxable(
    Math.max(0, (ytd.incomeTaxable || 0) - STANDARD_DEDUCTION)
  );
  const withheld = toCents(ytd.fedWithheld || 0);
  const refund = toCents(withheld - liability);
  return { liability, withheld, refund };
}
