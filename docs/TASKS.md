# Crash Cash Task Tracker

Local stand-in for GitHub issues (this repo has no remote yet). Each task gets
an ID, an owner, and a status. When the repo is pushed to GitHub these can be
migrated to real issues one-to-one.

## Open

(none)

## Done

* CC-1 [main] Project plan, repo scaffold, git init (PLAN.md)
* CC-2 [content-agent] Jobs, events, and glossary datasets (data/*.js)
* CC-3 [main] Simulation engine modules + 55 unit tests (js/engine, tests/js)
* CC-4 [main + view-agent] UI: onboarding, dashboard, job, budget, bank,
  learn, settings, month report (index.html, css, js/ui)
* CC-5 [tooling-agent] Python dev tooling: data loader/validator, dev server,
  55 pytest tests (tools, tests/python)
* CC-6 [main] Browser QA pass: full onboarding flow, job take, month tick,
  report modal, bank card open, budget edits, 12-month fast-forward,
  April tax season, dark mode, mobile layout. Fixes shipped: modal scroll
  lock, January year-to-date reset order (regression test added), near-zero
  tax reconciliation copy, score chart baseline, mobile min-width overflow.
* CC-7 [main] README, architecture docs, GitHub Pages deploy instructions

## Backlog (future ideas)

* CC-8 Scenario packs (college vs trade school vs straight to work)
* CC-9 Investing sandbox beyond retirement (index funds, volatility)
* CC-10 Classroom mode: shareable scenario links via URL params
* CC-11 Achievements for explore mode discoveries
