# Crash Cash: Development Plan

**App name:** Crash Cash
**Slogan:** Crash-test your money. (Where money mistakes are free.)
**Audience:** Total beginners, ages 12 to 25.
**Goal:** A safe, sandboxed money simulator. Players learn taxes, banking, credit,
debt, budgeting, and retirement by doing, not by reading lectures. Education is
embedded in the interaction: every number has a "why?" and every choice has visible
consequences the next simulated month.

## 1. Product overview

Crash Cash is an exploration sandbox first, a game second (think Minecraft, or
Quizlet's optional built-in games). Two ways to play, one engine:

* Explore mode (default): a free sandbox. Change jobs, hours, budgets, and
  accounts at any time, fast-forward 6 or 12 months to see long-term effects,
  turn random life events off or on, and reset freely. No fail states, no
  score to chase, just cause and effect.
* Challenge mode (optional): pick a goal scenario, e.g. pay off a student
  loan, build a $1,000 emergency fund, reach a 700 credit score, or grow a
  retirement balance. Progress is tracked each month and completion is
  celebrated. Difficulty levels are Minecraft-flavored (Peaceful through
  Hard Mode) and control how often life events hit.

In both modes, Crash Cash simulates one month of financial life per turn.
The player:

1. Creates a profile (name, age band, difficulty).
2. Takes a job: pick from a dataset of real-world roles with average pay
   (hourly or salaried), or build a custom job. Chooses commitment level
   (hours per week), benefits (401k or 403b with employer match, health premium),
   and an optional state income tax.
3. Manages a bank-style dashboard: checking, savings, high-yield savings,
   credit card, retirement account, and debts (student loans, family loans, etc).
4. Sets a budget with needs / wants / savings categories, and decides how
   much spending goes on the credit card versus debit.
5. Presses "Next Month". Payroll runs (gross pay, federal tax, FICA, state tax,
   pre-tax retirement, employer match, health premium), budget spending happens,
   interest compounds, debts accrue, the credit card statement arrives, a random
   life event may fire, and the credit score updates.
6. Reads the Month Report: a plain-language breakdown of everything that
   happened and why, plus auto-generated insights ("You paid only the minimum,
   so interest cost you $23 this month").
7. In April, Tax Season runs: withholding is reconciled against the real
   annual tax bill, producing a refund or a balance due, with a full explanation.

Everything is simulated and stored in localStorage. No accounts, no real money,
no server. Deployable as a static site on GitHub Pages.

## 2. Educational model (implicit, not lecture-y)

* Why buttons: nearly every figure on screen opens a short plain-language
  explainer of where that number came from (with the actual math for this player).
* Consequences engine: insights are generated from the player's own actions,
  not generic tips.
* Glossary: searchable, beginner-first definitions, linked from explainers.
* Sandbox freedom: players can make terrible choices (max the card, skip
  savings). The simulation shows the cost without moralizing.
* Age-aware: under-16 profiles get age-appropriate jobs (babysitting, mowing)
  and a custodial-account framing; older bands unlock full benefits, credit, etc.

## 3. Simulation rules (v1)

* Time step: one month. Hourly gross = wage x hours x 4.33 weeks.
* Federal income tax: 2025-style brackets + standard deduction, annualized then
  divided by 12 for monthly withholding. FICA = 7.65% of gross (up to SS cap,
  simplified). Optional flat state tax the player picks (0 to 8%).
* Retirement: pre-tax 401k/403b percent of gross, employer match up to a cap,
  growth at an adjustable expected annual return (default 7%), compounded monthly.
* Savings APY (default 0.40%) vs HYSA APY (default 4.00%), monthly compounding,
  so the difference is visible and teachable.
* Credit card: limit based on profile, APR (default 24%), monthly statement,
  minimum payment = max($25, 2% of balance), interest accrues on carried balance.
* Credit score: simplified FICO-style 300 to 850 model with weighted factors:
  payment history, utilization, credit age, inquiries, mix. Score history charted.
* Debts: student loan, auto loan, family loan (0% APR but tracked and its own
  lesson), medical, custom. Each has principal, APR, minimum payment.
* Random events: age-band-aware windfalls and shocks (phone screen cracks,
  birthday cash, car repair) with a choice of how to pay: checking, savings, or
  credit. Frequency depends on difficulty.
* Tax season: every April, compare true annual liability vs amounts withheld;
  issue refund or bill.

## 4. Architecture

Static site, no build step, ES modules throughout. Data files are ES modules
(not fetched JSON) so the site also works from file:// and needs zero tooling.

    index.html            single page app shell
    css/styles.css        design system + components (bank-dashboard aesthetic)
    js/main.js            boot, routing between views
    js/state.js           state shape, defaults, localStorage persistence
    js/engine/            pure logic, no DOM (fully unit tested)
      tax.js              brackets, FICA, withholding, tax season reconciliation
      payroll.js          gross to net pipeline, retirement match
      accounts.js         balances, transfers, interest
      credit.js           card statement, payments, interest
      creditScore.js      score model
      debts.js            amortization, payments
      engine.js           the monthly tick orchestrator
      insights.js         generates plain-language insights from a month result
      format.js           currency and percent formatting helpers
    js/ui/                view modules (onboarding, dashboard, job, budget,
                          bank, learn, report modal, charts)
    data/jobs.js          job dataset with average pay by role and age band
    data/events.js        random life events
    data/glossary.js      glossary and explainer copy
    tests/js/*.test.js    node:test unit tests for every engine module
    tests/python/         pytest suite validating the data files' integrity
    tools/validate_data.py  standalone data validator (also used by pytest)
    tools/serve.py        zero-dependency local dev server
    docs/ARCHITECTURE.md  deeper technical docs
    docs/TASKS.md         task tracker (local stand-in for GitHub issues)
    README.md, requirements.txt, package.json, .gitignore

Python's role: dev tooling and data validation tests (the runtime is pure
static JS as GitHub Pages requires).

## 5. UI/UX principles

* Bank-app look: card-based dashboard, big balances, clean sans-serif type,
  calm palette with meaningful accent colors (green in, red out), dark mode.
* One primary action per screen; "Next Month" is the heartbeat of the app.
* Beginner-first language: no unexplained jargon anywhere; every term links
  to the glossary.
* Mobile-first responsive layout (many students are on phones).
* Zero irreversible mistakes: full state export/import and a reset with confirm.

## 6. Work plan (tracked in docs/TASKS.md)

1. Scaffold repo, plan, git init.                         [branch: main]
2. Content dataset (jobs, events, glossary) - delegated to a content agent.
3. Engine modules + unit tests.                            [branch: feature/engine]
4. UI shell, onboarding, dashboard, views.                 [branch: feature/ui]
5. Python tooling + pytest data tests.
6. Browser QA pass, polish, README, deploy instructions.

## 7. Out of scope for v1 (future ideas)

Multiplayer/classroom mode, scenario packs (college vs trade school), investing
sandbox with individual stocks, achievements, localization.
