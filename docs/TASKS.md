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

## Round 2 (UX rework, 2026-07-25)

* CC-12 [main] Guided progressive-unlock walkthrough with congrats popups
* CC-13 [main] Search-first job picker modal; custom job moved to a modal
* CC-14 [offers-agent + main] Company offers: 18 fictional offers dataset,
  mailbox tab with badge, pushy popups, fine print, verdicts, investments
  (including scams), teaser HYSA rates, fee checking, card annual fees/rewards
* CC-15 [main] Expandable HUD stats card in a sticky right rail
* CC-16 [main] Numeric age (1 year per 12 sim months), starting ages 12 to 26+,
  live gating of jobs/credit; sim starts in the real current month; Timing card
* CC-17 [main] Hand-rolled SVG line icon system replacing emoji chrome
* CC-18 [main] Contrast bump for dark mode greys; equal account cards
* CC-19 [user-test-agent] Fresh-eyes user test pass
* CC-20 [review-agent] Code review of the rework diff

## Backlog (future ideas)

* CC-8 Scenario packs (college vs trade school vs straight to work)
* CC-9 Investing sandbox beyond retirement (index funds, volatility)
* CC-10 Classroom mode: shareable scenario links via URL params
* CC-11 Achievements for explore mode discoveries
