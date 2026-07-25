/*
 * payroll.js
 * Turns a job into a monthly paycheck breakdown: gross pay, pre-tax
 * deductions, employer retirement match, taxes, and net (take-home) pay.
 */

import { toCents, clamp } from './format.js';
import { ficaMonthly, monthlyFederalWithholding, stateTaxMonthly } from './tax.js';

/* Average weeks in a month, used to turn weekly hours into monthly hours. */
export const WEEKS_PER_MONTH = 4.33;

/*
 * Monthly gross pay for a job the player holds.
 * Hourly jobs scale with the chosen hours per week; salaried jobs pay 1/12.
 */
export function monthlyGross(job) {
  if (!job) return 0;
  if (job.type === 'hourly') {
    const hours = clamp(job.hoursPerWeek || 0, 0, job.maxHours || 80);
    return toCents((job.wage || 0) * hours * WEEKS_PER_MONTH);
  }
  return toCents((job.salary || 0) / 12);
}

/*
 * Employer match for one month.
 * Structure: the employer matches employee contributions dollar for dollar at
 * a rate of (matchPct / matchCapPct), on contributions up to matchCapPct of
 * gross. Example: matchPct 3, matchCapPct 6 means 50 cents per dollar on the
 * first 6% the employee puts in, worth at most 3% of gross.
 */
export function employerMatch(gross, contribPct, matchPct, matchCapPct) {
  if (!matchCapPct || !matchPct || contribPct <= 0) return 0;
  const matchedPortionPct = Math.min(contribPct, matchCapPct);
  const rate = matchPct / matchCapPct;
  return toCents(gross * (matchedPortionPct / 100) * rate);
}

/*
 * Run one month of payroll.
 * `job` fields used: type, wage/salary, hoursPerWeek, maxHours, contribPct,
 *   matchPct, matchCapPct, healthMonthly, benefitsEligible, statePct.
 * `ytd` fields used: ficaWages (for the Social Security cap).
 * `opts.extraWithholding`: extra federal dollars withheld per month.
 *
 * Returns a full breakdown; every number is monthly dollars rounded to cents.
 */
export function runPayroll(job, ytd = {}, opts = {}) {
  const gross = monthlyGross(job);
  if (gross <= 0) {
    return emptyPaycheck();
  }

  const benefitsOn = !!job.benefitsEligible;
  const health = benefitsOn ? toCents(job.healthMonthly || 0) : 0;
  const contribPct = benefitsOn ? clamp(job.contribPct || 0, 0, 50) : 0;
  const retirement = toCents(gross * contribPct / 100);
  const match = benefitsOn
    ? employerMatch(gross, contribPct, job.matchPct || 0, job.matchCapPct || 0)
    : 0;

  /* Income-taxable pay: gross minus retirement and health (both pre-tax). */
  const incomeTaxable = toCents(Math.max(0, gross - retirement - health));
  /* FICA-taxable pay: gross minus health only (401k still owes FICA). */
  const ficaWages = toCents(Math.max(0, gross - health));

  const federal = monthlyFederalWithholding(incomeTaxable, opts.extraWithholding || 0);
  const fica = ficaMonthly(ficaWages, ytd.ficaWages || 0);
  const state = stateTaxMonthly(incomeTaxable, job.statePct || 0);

  const net = toCents(gross - retirement - health - federal - fica.total - state);

  return {
    gross,
    retirement,
    match,
    health,
    incomeTaxable,
    ficaWages,
    federal,
    fica,
    state,
    net: Math.max(0, net),
    totalTax: toCents(federal + fica.total + state),
  };
}

function emptyPaycheck() {
  return {
    gross: 0, retirement: 0, match: 0, health: 0,
    incomeTaxable: 0, ficaWages: 0, federal: 0,
    fica: { ss: 0, medicare: 0, total: 0 },
    state: 0, net: 0, totalTax: 0,
  };
}
