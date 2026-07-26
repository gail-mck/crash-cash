/*
 * insights.js
 * Turns a month report into short, plain-language insights generated from
 * what the player actually did. This is where most of the teaching happens:
 * consequences first, definitions one tap away (glossaryId links).
 */

import { usd, pct } from './format.js';

/*
 * Generate insights for a finished month.
 * Returns an array of { tone: 'good'|'warn'|'info', text, glossaryId? }.
 * Capped so the report never becomes a wall of text.
 */
export function generateInsights(report, state) {
  const out = [];
  const pay = report.paycheck;

  if (pay && pay.gross > 0) {
    const taxShare = pay.totalTax / pay.gross;
    out.push({
      tone: 'info',
      text: 'Taxes took ' + pct(taxShare * 100, 1) + ' of your paycheck this month: '
        + usd(pay.federal) + ' federal, ' + usd(pay.fica.total) + ' FICA (Social Security + Medicare)'
        + (pay.state > 0 ? ', ' + usd(pay.state) + ' state.' : '.'),
      glossaryId: 'withholding',
    });
    if (pay.match > 0) {
      out.push({
        tone: 'good',
        text: 'Your employer added ' + usd(pay.match) + ' free money to your retirement match. That is a 100% return before the market does anything.',
        glossaryId: 'employer-match',
      });
    }
    const missedMatch = state.jobs.find((j) => j.benefitsEligible && (j.matchCapPct || 0) > 0 && (j.contribPct || 0) === 0);
    if (pay.match === 0 && missedMatch) {
      out.push({
        tone: 'warn',
        text: missedMatch.title + ' matches retirement contributions but you are contributing 0%, so you left free money on the table this month.',
        glossaryId: 'employer-match',
      });
    }
  }

  if (report.cardStatement) {
    const cs = report.cardStatement;
    if (cs.interest > 0) {
      out.push({
        tone: 'warn',
        text: 'You carried a credit card balance, so interest cost you ' + usd(cs.interest) + ' this month. Paying the full statement avoids this entirely.',
        glossaryId: 'apr',
      });
    }
    if (cs.status === 'late') {
      out.push({
        tone: 'warn',
        text: 'You missed the minimum payment. That added a ' + usd(cs.lateFee) + ' late fee and put a late mark on your credit history, which drags your score for a long time.',
        glossaryId: 'minimum-payment',
      });
    }
    if (cs.status === 'paid_full' && cs.paid > 0) {
      out.push({
        tone: 'good',
        text: 'You paid the card in full: no interest, and your on-time streak grows your credit score.',
        glossaryId: 'statement-balance',
      });
    }
    if (cs.utilizationPct > 30) {
      out.push({
        tone: 'warn',
        text: 'Your card is at ' + pct(cs.utilizationPct, 1) + ' of its limit. Above 30% utilization, credit scores start to slide even if you pay on time.',
        glossaryId: 'credit-utilization',
      });
    }
  }

  if (report.overdraftFee > 0) {
    out.push({
      tone: 'warn',
      text: 'Checking went below zero, so the bank charged a ' + usd(report.overdraftFee) + ' overdraft fee. A small savings buffer prevents this.',
      glossaryId: 'overdraft',
    });
  }

  const hysaEdge = report.interest.hysa - report.interest.savings;
  if (report.interest.hysa > 0 && state.accounts.savings > state.accounts.hysa && state.accounts.savings > 100) {
    out.push({
      tone: 'info',
      text: 'Your high-yield account earns about ' + (state.rates.hysaApy / Math.max(0.01, state.rates.savingsApy)).toFixed(0) + 'x the rate of regular savings. Money sitting in regular savings is missing that.',
      glossaryId: 'high-yield-savings',
    });
  } else if (hysaEdge > 0.5) {
    out.push({
      tone: 'good',
      text: 'High-yield savings earned you ' + usd(report.interest.hysa) + ' this month, versus ' + usd(report.interest.savings) + ' in regular savings. Same money, better parking spot.',
      glossaryId: 'apy',
    });
  }

  if (report.taxSeason) {
    const t = report.taxSeason;
    out.push({
      tone: t.refund >= 0 ? 'good' : 'warn',
      text: t.refund >= 0
        ? 'Tax season: you get a ' + usd(t.refund) + ' refund. A refund means you paid the government too much during the year and they are returning it, without interest.'
        : 'Tax season: you owe ' + usd(-t.refund) + '. Your paychecks withheld less than your real tax bill of ' + usd(t.liability) + '.',
      glossaryId: 'tax-refund',
    });
  }

  for (const d of report.debts) {
    if (d.done) {
      out.push({ tone: 'good', text: 'You paid off ' + d.name + ' completely. That minimum payment now stays in your pocket every month.', glossaryId: 'debt' });
    } else if (d.shortfall) {
      out.push({ tone: 'warn', text: 'You could not cover the full payment on ' + d.name + ' this month.', glossaryId: 'minimum-payment' });
    }
  }
  const familyDebt = state.debts.find((d) => d.kind === 'family' && d.principal > 0);
  if (familyDebt && report.monthIndex % 6 === 5) {
    out.push({
      tone: 'info',
      text: 'You still owe ' + usd(familyDebt.principal) + ' to family. No interest, but paying people back protects something interest cannot buy.',
      glossaryId: 'debt',
    });
  }

  const collapsed = (report.investments || []).find((i) => i.collapsed);
  if (collapsed) {
    out.push({
      tone: 'warn',
      text: collapsed.name + ' collapsed and took ' + usd(-collapsed.change) + ' with it. Guaranteed high returns do not exist; that promise is the warning.',
      glossaryId: 'compound-interest',
    });
  }
  if (report.teaserEnded) {
    out.push({
      tone: 'warn',
      text: 'That flashy savings rate was a teaser and it just expired. The fine print said so. Rate shopping means reading past the big number.',
      glossaryId: 'apy',
    });
  }
  if (report.checkingFee > 0) {
    out.push({
      tone: 'warn',
      text: 'Your checking account charged a ' + usd(report.checkingFee) + ' monthly fee. Plenty of banks charge nothing for the same thing.',
      glossaryId: 'checking-account',
    });
  }
  if (report.cardAnnualFee > 0) {
    out.push({
      tone: 'info',
      text: 'Your card\'s ' + usd(report.cardAnnualFee) + ' annual fee just hit. Fee cards only win if the rewards you actually earn beat the fee.',
      glossaryId: 'credit-card',
    });
  }

  if (report.event && report.event.lesson) {
    out.push({ tone: 'info', text: report.event.lesson });
  }

  const delta = report.netWorth.after - report.netWorth.before;
  out.push({
    tone: delta >= 0 ? 'good' : 'info',
    text: 'Net worth ' + (delta >= 0 ? 'grew ' : 'dropped ') + usd(Math.abs(delta)) + ' this month, to ' + usd(report.netWorth.after) + '.',
    glossaryId: 'net-worth',
  });

  return out.slice(0, 6);
}
