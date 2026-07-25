/*
 * goals.js
 * Challenge mode scenarios. Explore mode ignores all of this.
 *
 * Each challenge has:
 *   setup(state): mutates a fresh state to create the scenario's starting
 *     conditions (for example, adding the student loan you must pay off).
 *   progress(state): 0 to 1 toward the goal.
 *   describeProgress(state): short human string for the goal card.
 * Challenges are checked after every simulated month by checkGoal().
 */

import { toCents } from './format.js';
import { createDebt } from './debts.js';

export const CHALLENGES = [
  {
    id: 'first-grand',
    title: 'First Grand',
    emoji: '💰',
    target: 1000,
    minAge: 12,
    blurb: 'Grow your savings and high-yield savings to $1,000 combined.',
    setup(state) {},
    progress(state) {
      return clamp01((state.accounts.savings + state.accounts.hysa) / 1000);
    },
    describeProgress(state) {
      return '$' + Math.floor(state.accounts.savings + state.accounts.hysa) + ' of $1,000 saved';
    },
  },
  {
    id: 'debt-destroyer',
    title: 'Debt Destroyer',
    emoji: '⛏️',
    minAge: 18,
    blurb: 'You start with a $3,500 student loan at 6.5% APR. Pay it off completely.',
    setup(state) {
      state.debts.push(createDebt({
        name: 'Student loan', kind: 'student', principal: 3500, apr: 6.5,
      }));
    },
    progress(state) {
      const debt = state.debts.find((d) => d.kind === 'student');
      if (!debt) return 1;
      return clamp01(1 - debt.principal / debt.originalPrincipal);
    },
    describeProgress(state) {
      const debt = state.debts.find((d) => d.kind === 'student');
      return debt && debt.principal > 0
        ? '$' + Math.ceil(debt.principal) + ' still owed'
        : 'Paid off!';
    },
  },
  {
    id: 'credit-builder',
    title: 'Credit Builder',
    emoji: '📈',
    minAge: 18,
    blurb: 'Open a credit card, use it well, and reach a 700 credit score.',
    setup(state) {},
    progress(state) {
      const s = state.score.value;
      if (s == null) return 0;
      return clamp01((s - 300) / (700 - 300));
    },
    describeProgress(state) {
      return state.score.value == null
        ? 'No score yet: open a card to start'
        : state.score.value + ' of 700';
    },
  },
  {
    id: 'safety-net',
    title: 'Safety Net',
    emoji: '🛟',
    minAge: 16,
    blurb: 'Build an emergency fund worth three months of your spending, kept in high-yield savings.',
    setup(state) {},
    progress(state) {
      const monthly = monthlySpend(state);
      if (monthly <= 0) return 0;
      return clamp01(state.accounts.hysa / (monthly * 3));
    },
    describeProgress(state) {
      const target = toCents(monthlySpend(state) * 3);
      return target > 0
        ? '$' + Math.floor(state.accounts.hysa) + ' of $' + Math.ceil(target)
        : 'Set up a budget first';
    },
  },
  {
    id: 'future-you',
    title: 'Future You',
    emoji: '🌱',
    minAge: 18,
    blurb: 'Get your retirement account to $10,000 using contributions and the employer match.',
    setup(state) {},
    progress(state) {
      return clamp01(state.accounts.retirement / 10000);
    },
    describeProgress(state) {
      return '$' + Math.floor(state.accounts.retirement) + ' of $10,000 invested';
    },
  },
];

/* Challenges available to a given age band's minimum age. */
export function challengesForAge(minAge) {
  return CHALLENGES.filter((c) => minAge >= c.minAge);
}

/* Attach a challenge to a fresh state (runs its setup). */
export function startChallenge(state, challengeId) {
  const challenge = CHALLENGES.find((c) => c.id === challengeId);
  if (!challenge) return state;
  challenge.setup(state);
  state.goal = { id: challenge.id, startedMonth: state.time.monthIndex, done: false, completedMonth: null };
  return state;
}

/*
 * Evaluate the active goal after a month. Returns null when there is no
 * goal, otherwise { id, title, emoji, progress, label, justCompleted }.
 * Marks state.goal.done when the target is reached.
 */
export function checkGoal(state) {
  if (!state.goal) return null;
  const challenge = CHALLENGES.find((c) => c.id === state.goal.id);
  if (!challenge) return null;
  const progress = challenge.progress(state);
  let justCompleted = false;
  if (progress >= 1 && !state.goal.done) {
    state.goal.done = true;
    state.goal.completedMonth = state.time.monthIndex;
    justCompleted = true;
  }
  return {
    id: challenge.id,
    title: challenge.title,
    emoji: challenge.emoji,
    progress,
    label: challenge.describeProgress(state),
    done: state.goal.done,
    justCompleted,
  };
}

/* Average planned monthly spending, used by the Safety Net challenge. */
function monthlySpend(state) {
  return state.budget.categories.reduce((s, c) => s + (c.planned || 0), 0);
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}
