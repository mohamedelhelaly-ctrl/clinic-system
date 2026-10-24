# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Vite + React + TypeScript web app migrated from the Claude Design prototype
  with identical visuals (see `docs/MIGRATION.md`).
- Domain model for every spec entity, the two-status appointment model with an
  explicit transition table, the role permission matrix and business rules
  (payment gate, package consumption, slots, 24-hour reminder rule), with tests.
- `ClinicRepository` data-access interface and a mock implementation on seeded,
  fictional data persisted in the browser; seams for WhatsApp, PDF rendering,
  reminder scheduling, authentication and the clock.
- English and Arabic translations with right-to-left layout.
- Deterministic demo: fixed clock, `?role=`, `?lang=`, `?reset=1`, role switcher,
  Reset demo button and Demo badge.
- Playwright recording takes for the receptionist and doctor flows.
- Docs: updated spec (two statuses), architecture, demo guide, roadmap.
