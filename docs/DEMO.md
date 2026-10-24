# Running the demo

```bash
npm install
npm run dev           # http://localhost:5173
npm run demo:reset    # starts the app and opens it with ?reset=1
```

The demo always runs on **Saturday 24 October 2026 at 10:15** (clinic hours),
so the roster, call list and "Needs attention" look the same on every run.
All names, phone numbers and medical details are fictional. A **Demo** badge
and the **Reset demo** button sit at the bottom of every screen.

## URL parameters

| Parameter | Values                                                     | Effect                                                                                           |
| --------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `role`    | `receptionist`, `doctor`, `admin` (or `rec`, `doc`, `adm`) | Signs straight in as that role (skips the login screen).                                         |
| `lang`    | `en`, `ar`                                                 | Interface language. Arabic switches the layout to right-to-left.                                 |
| `reset`   | `1`                                                        | Restores the seed data, then removes itself from the address bar so a reload keeps your changes. |

Examples:

- `/?role=receptionist&lang=en&reset=1` — clean start at the front desk
- `/?role=doctor&reset=1` — Dr. Karim Abdelrahman's view, filtered to his patients
- `/?role=admin&lang=ar` — admin in Arabic

Without `role` the login screen appears; pick the role in **Demo role** and
press **Sign in**. In the app, the **Demo role** selector in the header
switches role at any time and the language button toggles English/Arabic.

## Resetting

Changes are kept in the browser (`localStorage`) across reloads. To go back to
the seed data, press **Reset demo** at the bottom of any screen, open any URL
with `?reset=1`, or run `npm run demo:reset`.

## Seed data at a glance

| Time  | Patient                                              | Doctor                                    | Appointment status                     | Payment            |
| ----- | ---------------------------------------------------- | ----------------------------------------- | -------------------------------------- | ------------------ |
| 08:30 | Salma Khaled                                         | Dr. Salma El-Sayed (Dermatology)          | No show                                | Unpaid             |
| 09:00 | Ahmed Samir (penicillin allergy, 4 past visits)      | Dr. Karim Abdelrahman (Internal Medicine) | Completed, visit record + prescription | Paid               |
| 09:30 | Omar Ibrahim (child, shares mother's phone)          | Dr. Hany Fouad (Pediatrics)               | In consultation                        | Paid               |
| 10:00 | Nourhan Adel (package 8,000 EGP / 10 visits, 7 left) | Dr. Salma El-Sayed                        | Confirmed (by phone)                   | Covered by package |
| 10:00 | Karim Nabil                                          | Dr. Karim Abdelrahman                     | Arrived & waiting                      | Paid               |
| 10:30 | Hossam Tarek                                         | Dr. Karim Abdelrahman                     | Arrived & waiting                      | Unpaid             |
| 11:00 | Farida Mostafa                                       | Dr. Salma El-Sayed                        | Confirmed (WhatsApp)                   | Unpaid             |
| 11:30 | Mahmoud Gaber                                        | Dr. Karim Abdelrahman                     | Needs call (one unanswered call)       | Unpaid             |
| 12:00 | Mona Hassan (mother, shares phone 01012345678)       | Dr. Karim Abdelrahman                     | Scheduled                              | Unpaid             |
| 12:30 | Yara Waleed                                          | Dr. Hany Fouad                            | Cancelled (patient replied Cancel)     | Unpaid             |

Tomorrow: Salma Khaled 09:00 (Needs call) and Farida Mostafa 10:30 (Scheduled).
Dr. Hany Fouad is on conference leave on Monday 26 October.

## Click paths

Each path is also a Playwright take in `demo-recording/flows` (run
`npm run record`; videos go to `demo-recording/output/videos`).

### Receptionist (`/?role=receptionist&reset=1`)

1. **Morning overview** — Today shows 9 patients, 2 waiting, 7 remaining.
   Toggle **Needs attention** to see only Needs call or Unpaid appointments.
2. **Check in and take payment** — Open _Hossam Tarek_ (Arrived & waiting,
   Unpaid). Note "Payment required before the consultation". **Record
   payment** → amount is prefilled with the doctor's fee (400 EGP) → **Cash** →
   **Save**. The badge turns _Paid_ and the log shows the payment.
3. **Book an existing patient** — **New appointment** → search "Mona" → _Mona
   Hassan_ → _Dr. Karim_ → **Sun 25 Oct** → **11:00** → reason → note "A
   WhatsApp reminder will be sent 24 hours before" → **Save appointment**.
4. **Register a walk-in who shares a phone** — **Walk-in** → search a new name
   → **Register new patient** → phone `01012345678` → the duplicate warning
   names Mona Hassan and Omar Ibrahim → **Add as another patient** → _Dr. Hany_
   → **Save appointment**. The walk-in joins today's queue as Arrived & waiting.
5. **Work the call list** — **Call list** → _Mahmoud Gaber_ (one unanswered
   attempt at 09:40) → **No answer** (attempt logged) → **Confirmed by phone**
   (leaves the list, status Confirmed).
6. **Packages and cash** — **Payments** shows the daily cash summary →
   **Packages** shows Nourhan Adel's package → **Patients** → _Nourhan Adel_
   shows 7 of 10 visits left.
7. **Arabic** — press **العربية**; the whole UI flips to right-to-left.

Also worth showing: open _Ahmed Samir_ as the receptionist — the visit history
shows only "Visit completed" with a lock: clinical notes are for doctors only.

### Doctor (`/?role=doctor&reset=1`)

1. **History before the patient enters** — _Ahmed Samir_ → the penicillin
   allergy is pinned → **Open patient file** → four past visits, newest first
   → **Edited** shows who changed a record and when.
2. **Payment gate** — _Hossam Tarek_: **Start consultation** is disabled until
   reception records payment.
3. **Consultation** — _Karim Nabil_ (paid) → **Start consultation** → **Open
   visit record** → type complaint, diagnosis, treatment → **Add
   prescription** → **Add medication** (Ibuprofen 400 mg, twice daily, 5 days)
   → **Finalize and send via WhatsApp**: _Sent_, then _Delivered_ → **Back** →
   **Save and complete visit**. The visit appears at the top of the history.
4. **Calendar** — **Calendar** → day view by slot → **Week**.

### Admin (`/?role=admin&reset=1`)

- _Hossam Tarek_ → **Override** starts the consultation without payment with a
  required reason; it appears in **Audit log**.
- **Settings** → doctors' schedules and **Block off days or hours**, clinic
  profile, reminder cut-off and second reminder, users.
- **Audit log** lists who changed what and when.
- Package-covered visit: _Nourhan Adel_ → **Mark arrived** → **Start
  consultation** → **Mark completed** → her package drops to 6 visits left.
