# Crash Cash Architecture

## Principles

1. **Static forever.** Deployable on GitHub Pages with zero build tooling.
   ES modules only; data ships as JS modules so file:// works too.
2. **Engine is pure.** Nothing in `js/engine/` touches the DOM or storage.
   Every function takes values and returns values, so all of it is unit
   tested in Node with no browser.
3. **One tick.** `advanceMonth(state, events, rng)` is the entire simulation.
   The UI is a thin, rerender-everything layer over a single state object.
4. **Teach through consequences.** The engine emits a detailed month report;
   `insights.js` turns the player's own actions into plain-language takeaways.

## Data flow

    user action -> ctx.update(mutate draft) -> saveState -> rerender view
    Next Month  -> advanceMonth(state)      -> new state + report
                -> saveState -> rerender -> showMonthReport(report)

State is cloned with `structuredClone` on every tick and every update, so the
previous state is never mutated (also what makes the engine easy to test).

## The monthly tick (js/engine/engine.js)

Order matters and is documented in the file header: payroll, debt minimums,
budget spending, random event, auto-save transfers, card interest + statement
+ autopay, deposit interest and retirement growth, overdraft fee, credit
score, goal check, tax season (December archives the year, January resets
year-to-date, April reconciles), history snapshot.

The random source is injected (`rng`) so tests drive events deterministically.

## Simulation models

* **Taxes** (`tax.js`): 2025 single-filer brackets, standard deduction,
  FICA with the Social Security wage cap tracked against year-to-date wages.
  Withholding = annualized liability / 12 + optional extra. April compares
  withheld vs true liability and pays the difference either direction.
* **Payroll** (`payroll.js`): hourly gross = wage x hours x 4.33. Retirement
  and health premiums are pre-tax for income tax; 401k still pays FICA
  (health does not, matching cafeteria-plan reality). Employer match models
  the standard "X% match up to Y% of pay" structure.
* **Credit card** (`credit.js`): one statement per month. Grace period is a
  boolean: pay the statement in full and interest never accrues; carry any
  of it and next month's interest is balance x APR / 12. Minimum is
  max($25, 2%). Missing it adds a $30 fee and a late mark.
* **Score** (`creditScore.js`): quality factors weighted 35/30/15/10/10
  (history, utilization, age, new credit, mix) mapped onto 300 to 850.
  No credit means no score (null), deliberately distinct from a low score.
* **Accounts** (`accounts.js`): APY compounds monthly via
  (1 + APY)^(1/12) - 1. Checking can overdraft to -$100 with a $35 monthly
  fee; beyond that, spending bounces.
* **Debts** (`debts.js`): interest-first amortization; family loans are 0%.
* **Goals** (`goals.js`): challenge scenarios with setup/progress functions,
  checked after every tick.

## UI layer

`main.js` holds the store (a `ctx` object closed over module state) and the
router. Views are functions of `ctx` returning DOM trees built with the `el()`
helper in `components.js`. There is no virtual DOM; any update rerenders the
current view, which at this scale is instant.

`components.js` also centralizes the education primitives: `whyButton(id)`
opens the glossary entry for any term, optionally with lines of "your
numbers" context.

Charts are hand-rolled SVG (`charts.js`), keeping the site dependency-free
and CSP-friendly.

## Persistence

`js/state.js` owns the schema (versioned), localStorage save/load, and JSON
export/import. The engine never touches storage. A schema bump invalidates
old saves rather than corrupting them.

## Testing

* `tests/js/`: node:test suites for every engine module plus an integration
  suite that simulates full years deterministically.
* `tests/python/`: pytest suite that parses the data modules without a JS
  runtime and validates schema rules, ranges, and content hygiene, including
  a repo-wide em dash scan. `tools/validate_data.py` runs the same checks
  standalone.
