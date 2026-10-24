# Architecture

The repository holds a **demo** that will grow into the production system. The
demo is a thin layer on top of a foundation meant to be kept: the domain
model, the business rules, the UI and the translations are production code;
only the data source, sign-in, clock and side effects are stand-ins.

```
apps/web/src
├── domain/        Entities, two-status model, transitions, permissions, rules. Pure TypeScript, no React.
├── data/          ClinicRepository interface (+ React provider) and service interfaces
│   └── mock/      MockClinicRepository, fake WhatsApp / PDF / scheduler, localStorage persistence
├── auth/          AuthService interface and session hooks
├── i18n/          en.ts, ar.ts, formatters, provider (RTL)
├── components/    Shared UI (icons, badges, alerts, visit history)
├── features/      One folder per screen: home, booking, appointment, patients, visit-record,
│                  prescription, calendar, call-list, payments, settings, audit-log
├── app/           Shell (sidebar, header, tab bar, sheets), navigation, view state, clock provider
├── demo/          Everything demo-only (see below)
└── styles/        app.css, copied verbatim from the prototype
```

## Layers and rules

| Layer                    | Depends on                              | Notes                                                                               |
| ------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------- |
| `domain`                 | nothing                                 | ESLint forbids React and app imports here, so it can move to the backend unchanged. |
| `data`                   | `domain`                                | The UI talks to data only through `ClinicRepository`.                               |
| `features`, `components` | `domain`, `data`, `auth`, `i18n`, `app` | ESLint forbids importing `src/demo`.                                                |
| `app`                    | everything                              | Composes the shell; the only place that injects demo components.                    |
| `demo`                   | everything                              | Deletable as a unit.                                                                |

The UI never decides a status change on its own: `getAppointmentActions(role,
appointment, …)` in `domain/permissions` combines the transition table
(`domain/status/transitions.ts`) with the permission matrix
(`domain/permissions/permissions.ts`) to say which buttons to show. The
repository re-checks every write with the same functions, which is what the
backend will do.

## What is mock, what is real

| Concern            | Demo today                                                                                                                 | Production seam                                 | What changes                                                                                                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data               | `data/mock/MockClinicRepository` keeps a whole clinic in memory and in `localStorage` (`clinic-demo:data`).                | `ClinicRepository` (`data/repository.ts`)       | Add `ApiClinicRepository` that calls the backend; it returns the same snapshot shape and rejects with `DomainError`. Most likely backed by a query cache, scoped by date range instead of the whole clinic. |
| Business rules     | `domain/*` run in the browser and inside the mock repository.                                                              | Same functions on the server                    | Port or share `domain/` with the backend; the server is the authority.                                                                                                                                      |
| Authentication     | `demo/demoAuth.ts`: sign in by picking a role, no password. Fixed users per role.                                          | `AuthService` (`auth/session.ts`)               | Real login, session expiry (spec §8), users from the database. The login screen in `demo/DemoLoginScreen.tsx` is replaced.                                                                                  |
| Authorization      | `can(role, permission)` hides what a role may not do.                                                                      | Same matrix enforced by the API                 | The API must enforce it; the UI check is only for display.                                                                                                                                                  |
| Clock              | `demo/fixedClock.ts`: always Saturday 24 Oct 2026, 10:15.                                                                  | `Clock` (`domain/clock.ts`) via `ClockProvider` | Use `app/systemClock.ts`. Production should store UTC instants and the clinic's time zone; the demo uses local `YYYY-MM-DDTHH:mm`.                                                                          |
| WhatsApp           | `MockWhatsAppProvider` accepts every message and reports _Delivered_ after 1.4 s; _Demo: mark Failed_ simulates a failure. | `WhatsAppProvider` (`data/services.ts`)         | Server-side WhatsApp Business provider with approved templates; delivery receipts arrive by webhook and update `MessageLog`.                                                                                |
| Prescription PDF   | `MockPrescriptionRenderer` returns a file name.                                                                            | `PrescriptionRenderer`                          | Server renders the PDF (clinic logo, doctor, items) and stores it; `Prescription.pdfUrl` points to it.                                                                                                      |
| Reminder scheduler | Seeded reminders and replies; new bookings get a _queued_ `MessageLog` with `scheduledFor = start − 24 h`. No timer runs.  | `ReminderScheduler`                             | A server job sends queued reminders at `scheduledFor`, moves unanswered appointments to _Needs call_ at the cut-off, and applies patient replies.                                                           |
| Audit trail        | Writes append `AuditLog` rows; appointment activity is stored as `AppointmentEvent`.                                       | Same entities                                   | The backend writes the audit log in the same transaction as the change; the appointment activity becomes a filtered view of it.                                                                             |
| Multi-clinic       | Every record carries `clinicId` (`clinic-nile`).                                                                           | Same field                                      | Scope every query by the signed-in user's clinic.                                                                                                                                                           |

## The demo layer (`src/demo`)

| File                                                                        | Role                                                                                                                            |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `environment.ts`                                                            | Builds the demo: mock repository on the seed, fixed clock, role sign-in, URL parameters. Production replaces this one function. |
| `seed.ts`                                                                   | Fictional clinic data (3 doctors, 10 patients, 12 appointments, visits, package, logs).                                         |
| `fixedClock.ts`                                                             | The fixed "now".                                                                                                                |
| `params.ts`                                                                 | `?role=`, `?lang=`, `?reset=1`.                                                                                                 |
| `demoAuth.ts`                                                               | Role-based sign-in.                                                                                                             |
| `DemoLoginScreen.tsx`, `DemoRoleSwitcher.tsx`, `DemoFooter.tsx`, `demo.css` | Login stand-in, header role switcher, "Demo" badge and _Reset demo_ button.                                                     |

To remove the demo: delete `src/demo`, write a production environment
(API repository, real `AuthService`, `systemClock`), render a real login screen
in `app/App.tsx` and drop the `headerExtras`/`footer` props passed to
`AppShell`. The _Demo: mark Failed_ chip disappears by itself because it only
renders when `repository.demo` exists.

## View state vs data

`app/uiState.tsx` holds only view state (current screen, back stack, form
inputs, filters, open sheet, toast), mirroring how the prototype behaved.
Clinic data always comes from `useClinicData()`. When a router is introduced,
`screen`/`apptId`/`patId` move into the URL.

## Styling

`styles/app.css` is the prototype stylesheet, unchanged, and the markup in
`features/` mirrors the prototype element for element, so the migrated app
renders the same pixels (see `docs/MIGRATION.md`). Keep class names stable;
restyle by editing `app.css`.

## Testing

- `npm test` runs Vitest: status transitions, permissions, business rules,
  translations, URL parameters and the mock repository (payment gate, package
  consumption, reschedule, call log, prescription delivery, reset).
- `npm run record` runs the Playwright takes in `demo-recording/`, which double
  as end-to-end smoke tests of the main flows on desktop and phone.
