# Roadmap

Build phases from the spec (§9). The demo already shows every phase in the UI
on mock data; each phase below makes one part real.

## Phase 0 — Demo (this repository today)

- Prototype migrated to Vite + React + TypeScript with identical visuals.
- Domain model, two-status appointment model, permissions and business rules
  as tested, framework-free modules.
- Mock repository, fixed clock, seed data, URL parameters, reset, recordings.

## Phase 1 — Core flow

Patients, doctor schedules, booking, roster, status actions, roles, audit log.

- Backend with the entities in `apps/web/src/domain`, every row scoped by `clinic_id`.
- `ApiClinicRepository` implementing `ClinicRepository`; real `AuthService`
  with role-based access and session timeout.
- Server-side enforcement of the transition table and permission matrix.
- Patient search (Arabic and English), duplicate-phone warning, walk-ins,
  reschedule and cancel with history, double-booking prevention with admin override.
- Audit log written with every change.

## Phase 2 — Medical history

Visit records, history timeline, pinned allergies, revision history.

- Visit record with complaint, diagnosis, treatment; drafts during the day.
- Revisions kept on every edit (`VisitRecordRevision`).
- Receptionists see only that a visit occurred.

## Phase 3 — Payments and packages

Payment status gating, packages with visit tracking, daily cash summary.

- Single-visit payments (cash, card, transfer); payment gate before the consultation with admin override.
- Packages: creation, visit consumption on Completed, manual adjustments with reason.
- Daily cash summary.

## Phase 4 — Prescriptions

Editor, PDF, manual WhatsApp send first.

- Prescription editor and PDF renderer (`PrescriptionRenderer`).
- Manual send (open a prefilled WhatsApp chat) as the first step.

## Phase 5 — WhatsApp automation

Reminders, confirm/cancel replies, call list, automatic prescription sending.

- WhatsApp Business provider (`WhatsAppProvider`) with approved templates and delivery webhooks.
- Reminder scheduler 24 hours before; replies move the appointment to Confirmed or Cancelled.
- No reply by the cut-off moves the appointment to Needs call (call list).
- Automatic prescription sending with delivery status and resend.

## Open decisions (spec §10)

WhatsApp provider and template approval; exact call-list cut-off and second
reminder; automatic vs explicit prescription send; shared packages or
per-doctor pricing; data protection review and consent wording; hosting and backups.
