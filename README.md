# Clinic system

Clinic management for private clinics in Egypt: booking, reminders, arrival
and payment, visit records, prescriptions and patient history. Receptionists,
doctors and admins sign in; patients only receive WhatsApp messages.

> **Status: demo.** Everything runs in the browser on fictional data with a
> fixed clock. There is no backend, real sign-in or WhatsApp integration yet;
> the code is structured so those replace the demo layer without touching the
> UI. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick start

Requires Node 22+.

```bash
npm install
npm run dev          # http://localhost:5173
```

Open `http://localhost:5173/?role=receptionist&reset=1`. More in
[docs/DEMO.md](docs/DEMO.md).

## Scripts

| Script               | What it does                                              |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Start the web app (Vite).                                 |
| `npm run build`      | Type-check and build for production into `apps/web/dist`. |
| `npm test`           | Unit tests (Vitest).                                      |
| `npm run lint`       | ESLint and Prettier check.                                |
| `npm run typecheck`  | TypeScript, strict mode.                                  |
| `npm run demo:reset` | Start the app and open it on fresh seed data.             |
| `npm run record`     | Record the demo click paths as videos (Playwright).       |

## Repository layout

```
apps/web            The web app (Vite + React + TypeScript)
  src/domain        Entities, status model and transitions, permissions, rules
  src/data          Repository interface; src/data/mock is the demo implementation
  src/features      One folder per screen
  src/i18n          English and Arabic strings
  src/demo          Demo-only code (seed, fixed clock, URL parameters, role switcher)
demo-recording      Playwright recording takes per actor
docs                Spec, architecture, demo guide, roadmap, migration report
prototype           Original Claude Design export (reference only)
video               Placeholder for the promo video
```

## Documentation

- [Requirements and data model](docs/clinic-system-spec.md)
- [Architecture: demo vs production seams](docs/ARCHITECTURE.md)
- [Running and recording the demo](docs/DEMO.md)
- [Roadmap](docs/ROADMAP.md)
- [Prototype migration report](docs/MIGRATION.md)
