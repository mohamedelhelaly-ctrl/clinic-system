# Clinic Management System: Requirements and Design (MVP)

Version 1.1 | Draft for review with pilot clinics

> **Changes in 1.1:** the appointment now carries **two** statuses (appointment status and payment status) instead of three. The separate confirmation status is gone: "Confirmed" and "Needs call" are appointment statuses, and reminder, reply and call details live in the message and call logs. Sections 3.3, 4, 5.3, 5.4 and 6 are updated accordingly.

---

## 1. Purpose and scope

A simple web system for private clinics in Egypt that replaces paper and Excel for the daily loop:

**book → remind/confirm → arrive → pay → see doctor → record visit → prescribe → history**

Guiding principles:

- Simple first. Each feature must be faster than the paper equivalent.
- The receptionist is the daily operator. Doctors use the system for their calendar, patient history, visit records and prescriptions.
- Patients never log in. They contact the clinic as they do today (phone, WhatsApp, walk-in). The only patient touchpoints are outbound WhatsApp messages (reminders, prescriptions).
- Medical history is the highest-value feature (from real feedback) and is built first after the core booking flow.
- Built to extend: new features attach to the existing entities without redesign.

### Out of scope for v1

Patient login or portal, online self-booking, insurance claims, lab/radiology integration, inventory, multi-branch, advanced reports, e-prescriptions verifiable by pharmacies, billing with tax invoices.

---

## 2. Users and roles

| Role                 | Description                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Receptionist         | Daily operator. Registers patients, books and manages appointments, handles confirmation calls, records payments and packages.  |
| Doctor               | Views own calendar and patients, writes visit records and prescriptions.                                                        |
| Admin (doctor/owner) | Everything a doctor can do, plus clinic settings, doctor schedules, user management, edit/override rights and audit log access. |

Permission matrix (V = view, E = edit, C = create, – = none):

| Area                                           | Receptionist                        | Doctor                  | Admin |
| ---------------------------------------------- | ----------------------------------- | ----------------------- | ----- |
| Patient demographics                           | C/V/E                               | V/E                     | C/V/E |
| Allergies and medical alerts                   | V/E                                 | V/E                     | V/E   |
| Appointments                                   | C/V/E                               | V (own), status updates | C/V/E |
| Visit record (complaint, diagnosis, treatment) | – (sees only that a visit occurred) | C/V/E                   | C/V/E |
| Prescriptions                                  | V (to resend)                       | C/V/E                   | C/V/E |
| Payments and packages                          | C/V/E                               | V                       | C/V/E |
| Clinic settings, schedules, users              | –                                   | –                       | C/V/E |
| Audit log                                      | –                                   | –                       | V     |

---

## 3. Core flows

### 3.1 Patient contact and registration

1. Patient contacts the clinic (phone, WhatsApp) or walks in.
2. Receptionist searches by name or phone.
3. Existing patient: select. New patient: register, after which the patient is an existing patient.

### 3.2 Booking

1. Receptionist selects the doctor.
2. The doctor's available slots appear for the chosen date.
3. Receptionist selects a slot.
4. Appointment form opens: patient, doctor, date/time, reason for visit.
5. On save, the appointment is created as **Scheduled** and appears in the doctor's calendar and the home roster.

### 3.3 Reminder and confirmation

1. 24 hours before the appointment, the system sends a WhatsApp reminder with Confirm and Cancel buttons. The message and its delivery status are written to the message log.
2. A patient reply is written to the message log and moves the appointment status automatically: Confirm → **Confirmed**, Cancel → **Cancelled** (the slot is freed).
3. If there is no reply by a configurable cut-off, the appointment status becomes **Needs call** and the appointment appears in the receptionist's **Call list**.
4. Receptionist calls the patient and logs the outcome in the call log: confirmed (status → Confirmed), cancelled (status → Cancelled) or no answer (status stays Needs call; the attempt is listed).

### 3.4 Arrival and payment

1. Patient arrives. Receptionist marks **Arrived & waiting**.
2. Receptionist records payment (single visit fee) or applies a package visit. Payment status becomes **Paid** or **Covered by package**.
3. The appointment cannot move to **In consultation** until payment status is Paid or Covered by package (admin can override with a reason).

### 3.5 Consultation

1. Doctor opens the appointment. Before the patient enters, the doctor sees the patient's history: allergies/alerts pinned at the top, then past visits newest first.
2. Doctor sets status **In consultation** and writes the visit record (complaint, diagnosis, treatment).
3. Doctor optionally writes a prescription.
4. Doctor saves and sets the appointment **Completed**. The visit record is saved permanently to the patient history.

### 3.6 Prescription delivery

On finalizing a prescription, the system generates a PDF and sends it to the patient on WhatsApp.

---

## 4. Status model

Two independent status fields on each appointment (not one combined list), so the roster stays readable.

**Appointment status**

- Scheduled
- Confirmed
- Needs call
- Arrived & waiting
- In consultation
- Completed
- Cancelled
- No show

**Payment status**

- Unpaid
- Paid
- Covered by package

**Allowed appointment status changes**

| From                             | To                | Trigger and rules                                                                                              |
| -------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Scheduled                        | Confirmed         | Patient replies Confirm, receptionist marks confirmed, or call outcome "confirmed"                             |
| Scheduled                        | Needs call        | No reply by the call-list cut-off                                                                              |
| Scheduled, Needs call            | Confirmed         | As above                                                                                                       |
| Scheduled, Confirmed, Needs call | Arrived & waiting | Patient arrives                                                                                                |
| Scheduled, Confirmed, Needs call | Cancelled         | Patient replies Cancel, call outcome "cancelled", clinic cancels, or reschedule (a new appointment is created) |
| Scheduled, Confirmed, Needs call | No show           | Only after the slot time has passed                                                                            |
| Arrived & waiting                | In consultation   | Payment status must be Paid or Covered by package; admin can override with a reason (audit-logged)             |
| In consultation                  | Completed         | A package visit is consumed at this point if the payment status is Covered by package                          |
| Completed, Cancelled, No show    | –                 | Final; kept in history                                                                                         |

A walk-in starts as **Arrived & waiting**; a booking starts as **Scheduled**.

**Allowed payment status changes:** Unpaid → Paid (single-visit payment) or Unpaid → Covered by package (patient has an active package). Not allowed on Cancelled or No show appointments.

Notes:

- There is no status on the patient. "Inactive" can be derived (for example, no visit in 12 months) and shown as a label or filter.
- Reminder and call details are not statuses. Messages sent, delivery status and patient replies are in the **message log**; confirmation calls and their outcomes are in the **call log**. The roster shows how a patient confirmed (WhatsApp or phone) as a small icon derived from these logs.
- Cancelled and no-show appointments are kept in history, never deleted.

---

## 5. Functional requirements

Priority: **M** = must for MVP, **S** = should, **L** = later.

### 5.1 Patient management

| ID    | Requirement                                                                                                                                                                                  | Priority                         |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| PM-1  | Register a patient with name, phone (required), date of birth, gender, address (optional).                                                                                                   | M                                |
| PM-2  | Age is calculated automatically from date of birth.                                                                                                                                          | M                                |
| PM-3  | Allergies and important medical alerts are stored in the patient file only (not on each appointment), editable at any time, and shown prominently wherever the patient appears for a doctor. | M                                |
| PM-4  | Search patients by name or phone, partial match, Arabic and English.                                                                                                                         | M                                |
| PM-5  | Warn on duplicate phone numbers, but allow multiple patients to share one number (family).                                                                                                   | M                                |
| PM-6  | Patient file shows details, active package (visits remaining), upcoming appointments and visit history in one view.                                                                          | M                                |
| PM-7  | Edit patient details. All edits are audit-logged.                                                                                                                                            | M                                |
| PM-8  | Merge duplicate patient records (admin).                                                                                                                                                     | S                                |
| PM-9  | Archive a patient instead of deleting.                                                                                                                                                       | S                                |
| PM-10 | Import existing patients from Excel/CSV.                                                                                                                                                     | S (push toward M for onboarding) |

### 5.2 Appointment management

| ID    | Requirement                                                                                              | Priority |
| ----- | -------------------------------------------------------------------------------------------------------- | -------- |
| AM-1  | Define each doctor's working days, hours and slot length (admin).                                        | M        |
| AM-2  | Block off days or hours (holidays, leave).                                                               | M        |
| AM-3  | Show a doctor's available slots for a chosen date.                                                       | M        |
| AM-4  | Create an appointment: patient, doctor, slot, reason for visit. Initial status Scheduled.                | M        |
| AM-5  | Prevent double booking of a doctor's slot, with an admin-only override for emergencies.                  | M        |
| AM-6  | Walk-ins: add a patient to today's queue without a pre-set slot.                                         | M        |
| AM-7  | Reschedule (new time or doctor) and cancel (optional reason). History preserved.                         | M        |
| AM-8  | One-click status actions from the roster row: mark arrived, in consultation, completed, no-show, cancel. | M        |
| AM-9  | Daily and weekly calendar view per doctor.                                                               | M        |
| AM-10 | Booking source field (phone, WhatsApp, walk-in).                                                         | S        |
| AM-11 | Appointment types (new visit, follow-up) with different durations.                                       | S        |
| AM-12 | Record arrival time and consultation start/end times for waiting-time insights.                          | S        |

### 5.3 Home view (receptionist and doctors)

| ID   | Requirement                                                                                                                                                         | Priority |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| HV-1 | Summary counts: total patients today, arrived & waiting, remaining.                                                                                                 | M        |
| HV-2 | Roster of today's appointments with time, patient, doctor, reason, and the two status badges (appointment and payment), with an icon for how the patient confirmed. | M        |
| HV-3 | Each roster row opens appointment details.                                                                                                                          | M        |
| HV-4 | Filter roster by doctor and status. Doctors default to their own patients.                                                                                          | M        |
| HV-5 | "Needs attention" filter: today's appointments that are Needs call or Unpaid (excluding Cancelled and No show).                                                     | S        |

### 5.4 Reminders and confirmation

| ID   | Requirement                                                                                                                                                         | Priority |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| RC-1 | Automatically send a WhatsApp reminder 24 hours before each appointment, with Confirm and Cancel quick replies.                                                     | M        |
| RC-2 | Patient reply is logged and updates the appointment status automatically (Confirm → Confirmed). A Cancel reply cancels the appointment and frees the slot.          | M        |
| RC-3 | Appointments booked less than 24 hours ahead skip the reminder (the receptionist can confirm with the patient at booking).                                          | M        |
| RC-4 | Appointments with no reply by a configurable cut-off move to Needs call and appear in the Call list.                                                                | M        |
| RC-5 | Receptionist logs call outcome (confirmed by phone, cancelled, no answer) with timestamp in the call log; confirmed and cancelled also move the appointment status. | M        |
| RC-6 | Optional second reminder closer to the appointment (for example, 3 hours before), configurable.                                                                     | S        |
| RC-7 | Log every message sent with delivery status (sent, delivered, failed).                                                                                              | S        |
| RC-8 | If automation is not yet available, fallback: a "Send reminder" button that opens a prefilled WhatsApp chat.                                                        | S        |

### 5.5 Visit record and medical history (highest priority)

| ID   | Requirement                                                                                                                              | Priority |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| VR-1 | Each appointment can have one visit record with three text boxes: **Complaint**, **Diagnosis**, **Treatment**.                           | M        |
| VR-2 | A saved visit record is always attached to the patient history permanently.                                                              | M        |
| VR-3 | Patient file shows a timeline of past visits, newest first, with date, doctor and the three fields.                                      | M        |
| VR-4 | When a doctor opens an appointment, the history timeline and pinned allergies/alerts are visible immediately, before the patient enters. | M        |
| VR-5 | Visit records are visible and editable by doctors and admin only. Receptionists see only that a visit occurred.                          | M        |
| VR-6 | Any edit to a saved visit record keeps the previous version (who, when, what changed).                                                   | M        |
| VR-7 | Draft save: doctor can save partial notes and finish later in the same day.                                                              | S        |
| VR-8 | Search within a patient's history by keyword.                                                                                            | S        |
| VR-9 | Attach files or images (old reports, scans) to a patient or visit.                                                                       | S        |

### 5.6 Prescriptions

| ID   | Requirement                                                                                                             | Priority |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| RX-1 | A prescription belongs to a visit and contains line items: drug name, dose, frequency, duration, optional instructions. | M        |
| RX-2 | Generate a clean PDF with clinic details, doctor name, patient name, date and items.                                    | M        |
| RX-3 | On finalizing, send the PDF to the patient on WhatsApp automatically.                                                   | M        |
| RX-4 | Show delivery status (sent, delivered, failed) with a resend button for doctor or receptionist.                         | M        |
| RX-5 | Prescriptions are stored in the patient history under the visit.                                                        | M        |
| RX-6 | Reusable drug name suggestions (autocomplete from previously used drugs).                                               | S        |
| RX-7 | Prescription templates for common cases.                                                                                | L        |

### 5.7 Payments and packages

| ID    | Requirement                                                                                                                                                                              | Priority |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| PY-1  | Payment is recorded before the patient sees the doctor. The appointment cannot move to In consultation unless payment status is Paid or Covered by package (admin override with reason). | M        |
| PY-2  | Single-visit payment: amount, method (cash, card, transfer), recorded against the appointment. Receptionist enters the amount.                                                           | M        |
| PY-3  | Package creation (receptionist form): total price, number of visits (for example, 8000 for 10 visits), optional expiry date, optional notes. Linked to the patient.                      | M        |
| PY-4  | System tracks visits used and visits remaining per package.                                                                                                                              | M        |
| PY-5  | When booking or checking in a patient with an active package, the system shows "Covered by package (N left)" and sets payment status to Covered by package.                              | M        |
| PY-6  | A package visit is consumed when the appointment is marked Completed. Cancelled and no-show appointments do not consume a visit.                                                         | M        |
| PY-7  | Prevent over-booking beyond remaining package visits (count of future covered appointments cannot exceed visits remaining), with admin override.                                         | S        |
| PY-8  | Manual adjustment of a package (add or remove a visit, extend expiry) with a required reason, audit-logged.                                                                              | M        |
| PY-9  | Refund or void a payment (admin), audit-logged.                                                                                                                                          | S        |
| PY-10 | Daily cash summary: total collected by method, number of visits, package sales.                                                                                                          | M        |
| PY-11 | Shared packages between family members.                                                                                                                                                  | L        |

### 5.8 Users, settings and audit

| ID   | Requirement                                                                                                                                       | Priority |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| US-1 | Login with role-based access (receptionist, doctor, admin).                                                                                       | M        |
| US-2 | Admin manages users, doctors, schedules and clinic profile (name, address, phone, logo for prescriptions).                                        | M        |
| US-3 | Audit log of create/edit/delete actions on patients, appointments, visit records, prescriptions, payments and packages (who, when, before/after). | M        |
| US-4 | Arabic and English UI with full right-to-left support.                                                                                            | M        |
| US-5 | Multi-clinic support in the data model from day one (every record carries a clinic ID), even though the UI serves one clinic.                     | M        |

---

## 6. Data model (main entities)

- **Clinic**: id, name, address, phone, logo, settings (reminder lead time, call-list cut-off, language).
- **User**: id, clinic_id, name, role, credentials, active.
- **Doctor**: id, clinic_id, user_id, specialty, slot length default.
- **DoctorSchedule**: doctor_id, weekday, start, end. **ScheduleException**: doctor_id, date/time range, reason.
- **Patient**: id, clinic_id, name, phone, date_of_birth, gender, address, allergies_and_alerts, archived.
- **Appointment**: id, clinic_id, patient_id, doctor_id, start_time, end_time, reason, source, appointment_status, payment_status, arrived_at, consultation_started_at, completed_at, cancellation (source: patient WhatsApp / patient phone / clinic / rescheduled, reason), rescheduled_from_id.
- **VisitRecord**: id, appointment_id, patient_id, doctor_id, complaint, diagnosis, treatment, finalized_at. **VisitRecordRevision**: visit_record_id, edited_by, edited_at, previous values.
- **Prescription**: id, visit_record_id, delivery_status, pdf_url, sent_at. **PrescriptionItem**: prescription_id, drug, dose, frequency, duration, instructions.
- **Payment**: id, appointment_id (nullable), package_id (nullable), amount, method, recorded_by, recorded_at, voided.
- **Package**: id, patient_id, total_price, total_visits, visits_used, expiry_date, notes. **PackageUsage**: package_id, appointment_id, consumed_at.
- **MessageLog**: id, clinic_id, appointment_id or prescription_id, type (reminder, prescription), channel, status (queued, sent, delivered, failed), provider message id, scheduled/sent/delivered timestamps, patient replies (confirm, cancel) with timestamps.
- **CallLog**: id, clinic_id, appointment_id, outcome (confirmed, cancelled, no answer), logged_by, logged_at.
- **AuditLog**: id, clinic_id, user_id, role acted in, entity, entity_id, action, before, after, timestamp.

Every record carries clinic_id (directly or through its parent), so a second clinic can be added without a migration.

Key relationships: Patient 1—n Appointment; Appointment 1—0..1 VisitRecord; VisitRecord 1—0..1 Prescription; Patient 1—n Package; Package 1—n PackageUsage.

---

## 7. Screens

1. Login
2. Home (counts, roster, needs-attention filter)
3. Patient search and register
4. Book appointment (doctor, slots, appointment form)
5. Appointment details (statuses, payment, actions, pinned allergies, link to history)
6. Patient file (details, allergies/alerts, package, visit timeline)
7. Visit record (doctor): complaint, diagnosis, treatment, prescription
8. Prescription editor and PDF preview
9. Doctor calendar (day and week)
10. Call list (receptionist)
11. Payments: record payment, create/manage package, daily cash summary
12. Settings (admin): clinic, doctors, schedules, users, reminder settings
13. Audit log (admin)

---

## 8. Non-functional requirements

- **Usability:** booking an existing patient in under 10 seconds; works on desktop and phone; large tap targets; minimal required fields.
- **Language:** Arabic and English, RTL layout, Arabic search.
- **Security and privacy:** HTTPS everywhere, encrypted storage and backups, role-based access, session timeout, audit trail. Review Egypt's personal data protection law before storing real patient data. Patient consent for WhatsApp messages should be captured and recorded.
- **Reliability:** daily automated backups with a tested restore; the system must remain usable on slow connections.
- **Integrations:** WhatsApp Business API (pre-approved message templates, provider cost per message). Provider choice and approval lead time must be confirmed early.
- **Extensibility:** clinic ID on all records, role-based permissions, visit as the central object so future features (labs, billing, insurance) attach to it.

---

## 9. Build phases

1. **Core flow:** patients, doctor schedules, booking, roster, status actions, roles, audit log.
2. **Medical history:** visit records, history timeline, pinned allergies, revision history.
3. **Payments and packages:** payment status gating, packages with visit tracking, daily cash summary.
4. **Prescriptions:** editor, PDF, manual WhatsApp send first.
5. **WhatsApp automation:** reminders, confirm/cancel replies, call list, automatic prescription sending.

Rationale: delivers the most-requested value (history) early and leaves the integration with the highest cost and approval risk until clinics already use the core daily.

---

## 10. Assumptions and open decisions

Assumptions made in this document (change if pilot feedback differs):

- A package visit is consumed when the appointment is marked Completed, not at booking or arrival.
- Admin can override the payment gate and double-booking rules with a recorded reason.
- Visit records are doctor-only; receptionists never see clinical content.
- Automatic WhatsApp sending is the target for reminders and prescriptions, with manual sending as the fallback if API setup delays launch.

Open decisions:

1. WhatsApp provider and template approval timeline and cost.
2. Exact call-list cut-off (for example, 3 hours before the appointment) and whether to add a second reminder closer to the appointment.
3. Whether prescriptions should be sent automatically on finalize or after a doctor's explicit "Send" click.
4. Whether any clinic needs shared packages or per-doctor pricing in v1.
5. Data protection compliance review and patient consent wording.
6. Hosting location and backup policy.

---

## 11. Pilot success measures

- Receptionist uses the system daily.
- Share of appointments booked in the system versus on paper.
- Time to register a patient and book a visit.
- No-show rate before and after reminders.
- Share of completed visits with a saved visit record.
- Weekly list of feature requests ranked by how often they are repeated.
