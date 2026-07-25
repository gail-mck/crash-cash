# 💥 Crash Cash

**Crash-test your money.**

Crash Cash is a safe, fully simulated sandbox for learning everything money by
doing: jobs and paychecks, taxes, banking, budgeting, credit cards and credit
scores, debt, high-yield savings, and retirement. Make great decisions or
terrible ones; here, the mistakes are free and the lessons stick.

No accounts. No real money. No servers. Your run lives entirely in your
browser's local storage.

## Two ways to play

* **Explore mode** (default): a pure sandbox. Take any job, change your hours,
  open accounts, crank interest-rate dials, fast-forward a year, and watch
  cause and effect. No goals, no fail states.
* **Challenge mode**: pick a goal (pay off a student loan, reach a 700 credit
  score, build an emergency fund, grow a retirement balance) and chase it while
  life throws surprises at you. Difficulty ranges from Peaceful to Hard Mode.

## What the simulation covers

* **Jobs**: 38 real-world roles with average pay, hourly and salaried, from
  babysitting to software development, plus fully custom jobs. Commitment
  (hours per week), benefits eligibility, health premiums.
* **Taxes**: 2025 federal brackets, the standard deduction, FICA (Social
  Security and Medicare with the wage cap), optional flat state tax, paycheck
  withholding, and a real April tax season that reconciles the year into a
  refund or a bill.
* **Retirement**: pre-tax 401k/403b contributions, employer matching, and
  monthly compounded growth.
* **Banking**: checking, savings vs high-yield savings (the APY gap is the
  lesson), transfers, overdrafts and their fees.
* **Credit**: a starter credit card with a real grace period, statements,
  minimum payments, late fees, utilization, and a FICO-style score built from
  the published factor weights. Under 18, credit is locked, which is also
  the lesson.
* **Debt**: student loans, auto loans, medical bills, and family loans
  (0% interest, still owed), with interest-first amortization.
* **Life**: 30 random events, from cracked phones to birthday cash, gated by
  the age your run started at.

Every number in the app has a small **?** that explains, in plain language and
with your own numbers, where it came from. A 50-term glossary and a monthly
plain-language report do the teaching; there are no lectures.

## Running it locally

It is a static site; any web server works, and opening `index.html` directly
works in most browsers too.

```
python3 tools/serve.py        # serves http://localhost:8000 with no caching
```

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. In the repo: Settings, then Pages, then under "Build and deployment" choose
   Source: Deploy from a branch, Branch: `main`, folder `/ (root)`.
3. Your site appears at `https://<username>.github.io/<repo>/`.

No build step, no dependencies, nothing else to configure.

## Development

The runtime is pure HTML/CSS/JavaScript (ES modules, zero dependencies).
Python is used only for optional dev tooling.

```
npm test                                  # 53 engine unit tests (node --test)
python3 tools/validate_data.py            # dataset integrity checks
python3 -m pytest tests/python -q         # 55 data/tooling tests (needs pytest)
```

Project layout:

```
index.html            app shell
css/styles.css        design system (light/dark, responsive)
js/engine/            pure simulation logic, no DOM, fully unit tested
js/ui/                views (dashboard, job, budget, bank, learn, settings)
js/state.js           state shape + localStorage persistence
data/                 jobs, life events, glossary (browser ES modules)
tests/js/             engine unit tests (node:test)
tests/python/         data integrity tests (pytest)
tools/                dev server + data validator (Python, dev-only)
docs/                 architecture notes and task tracker
```

See [PLAN.md](PLAN.md) for the product plan and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details.

## Honesty box

Crash Cash simplifies on purpose: single filer, 2025 tax rules every year,
flat state tax, one statement a month, a simplified score model, steady
investment returns. The Learn tab discloses all of it in-app. Nothing here is
financial advice; it is a place to build intuition safely.

## License

MIT
