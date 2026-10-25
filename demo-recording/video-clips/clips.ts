import type { Page } from '@playwright/test';
import { expectBadges, expectHidden, expectText, expectVisible } from './lib/checks.ts';
import type { Human } from './lib/human.ts';

/*
 * The promo clips, in story order. Each clip starts from a saved storage
 * state (`needs`), may run unrecorded `setup` in its own context, `prepare`s
 * the start screen off-camera, records `act`, checks its end state in
 * `verify`, and can save the result for later clips (`produces`).
 */

export type Role = 'receptionist' | 'doctor' | 'admin';
type DemoFn =
  | 'reset'
  | 'advance'
  | 'jumpToReminder'
  | 'jumpToAppointment'
  | 'jumpPastCutoff'
  | 'reply'
  | 'markDelivery'
  | 'appointment'
  | 'now';

export interface ClipContext {
  page: Page;
  phone: boolean;
  /** Paced like a person; used for everything recorded. */
  human: Human;
  /** No pauses; used off-camera (setup, prepare, post). */
  quick: Human;
  /** Opens the app (clean mode) as a role; the first open after a reset need wipes the data. */
  open(role?: Role, lang?: 'en' | 'ar'): Promise<void>;
  demo<T = unknown>(fn: DemoFn, ...args: unknown[]): Promise<T>;
  /** Keys that type an ISO date into <input type=date> on this machine (Chrome follows the OS order). */
  dateKeys(iso: string): string;
}

export interface Clip {
  id: string;
  scene: string;
  description: string;
  actor: Role;
  timeline: 'A' | 'B' | '-';
  device: 'desktop' | 'phone';
  lang: 'en' | 'ar';
  /** Target duration in seconds, holds included. */
  target: number;
  /** The brief's target, when the measured human-paced length had to replace it. */
  briefTarget?: number;
  /** Storage snapshot to start from; 'reset' = fresh seed data. */
  needs: string;
  produces?: string;
  setup?: (c: ClipContext) => Promise<void>;
  prepare?: (c: ClipContext) => Promise<void>;
  act: (c: ClipContext) => Promise<void>;
  verify: (c: ClipContext) => Promise<void>;
  /** Off-camera steps after recording, before `produces` is saved (e.g. Save draft). */
  post?: (c: ClipContext) => Promise<void>;
  optional?: boolean;
  notes?: string;
}

// ---- cast and data ----------------------------------------------------------

export const AHMED = {
  name: 'Ahmed Samir',
  phone: '01001234567',
  dob: '1992-03-14',
  age: '34 yrs',
  address: 'Nasr City, Cairo',
  allergy: 'Penicillin',
  reason: 'Persistent cough',
};
const DOCTOR = 'Dr. Karim Adel';
const TOMORROW = 'Sun 25 Oct';

/** "Sun 25 Oct", the way the app labels a day in English. */
export function dayLabel(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// ---- shared steps -------------------------------------------------------------

const row = (p: Page, name: string) => p.locator('button.tr', { hasText: name });
const dayChip = (p: Page, label: string) => p.locator('.card .tabs .chip', { hasText: label });
const statusBadges = (p: Page) => p.locator('.card .badges').first();
const card = (p: Page, heading: string | RegExp) =>
  p.locator('.card', { has: p.locator('h2', { hasText: heading }) });

async function nav(c: ClipContext, h: Human, label: string) {
  const p = c.page;
  if (!c.phone) return h.click(p.locator('.side .nav', { hasText: label }));
  const tab = p.locator('.tabbar .tb', { hasText: label });
  if (await tab.count()) return h.click(tab);
  await h.click(p.locator('.tabbar .tb', { hasText: 'More' }));
  await h.click(p.locator('.sheet .nav', { hasText: label }));
}

async function newAppointment(c: ClipContext, h: Human) {
  const p = c.page;
  await h.click(
    c.phone ? p.locator('.fab') : p.locator('.btn.p.lg.hide-m', { hasText: 'New appointment' }),
  );
}

async function registerAhmed(c: ClipContext, h: Human) {
  const p = c.page;
  await newAppointment(c, h);
  await h.type(p.locator('input[type=search]'), AHMED.name);
  await expectVisible(p.getByText('No patient found.'), 'empty search result');
  await h.hold(500);
  await h.click(p.locator('.btn', { hasText: 'Register new patient' }));
  const form = card(p, 'Register new patient');
  if ((await form.getByLabel('Full name').inputValue()) !== AHMED.name) {
    throw new Error('the search text did not carry over into Full name');
  }
  await h.type(form.locator('input[inputmode=tel]'), AHMED.phone);
  await h.type(form.locator('input[type=date]'), c.dateKeys(AHMED.dob), { at: 'left' });
  if ((await form.locator('input[type=date]').inputValue()) !== AHMED.dob) {
    throw new Error(
      `date of birth typed as ${await form.locator('input[type=date]').inputValue()}`,
    );
  }
  await h.choose(form.locator('select'), 'M');
  await h.type(form.locator('label', { hasText: 'Address' }).locator('input'), AHMED.address);
  await h.type(form.locator('label', { hasText: 'Allergies' }).locator('input'), AHMED.allergy);
  const age = form.locator('label', { hasText: 'Age' }).locator('input');
  if ((await age.inputValue()) !== AHMED.age)
    throw new Error(`age shows ${await age.inputValue()}`);
  await h.pointAt(age);
  await h.hold(800);
  await h.click(form.locator('.btn.p', { hasText: 'Save and continue' }));
}

async function bookAhmed(
  c: ClipContext,
  h: Human,
  day = TOMORROW,
  time = '11:00',
  reason = AHMED.reason,
) {
  const p = c.page;
  await h.click(p.locator('button.doc', { hasText: DOCTOR }));
  if (c.phone) {
    await h.click(p.locator('.hide-d .btn.lg.full'));
    await h.click(p.locator('.sheet .tabs .chip', { hasText: day }));
    await h.click(p.locator('.sheet .slot', { hasText: time }));
  } else {
    await h.click(dayChip(p, day));
    await h.click(p.locator('.slots .slot', { hasText: time }));
  }
  await h.type(p.getByPlaceholder('e.g. Follow-up, new complaint'), reason);
  await h.click(p.locator('.btn.p.lg', { hasText: 'Save appointment' }));
  await expectText(p.locator('.toast'), 'Appointment booked', 'booking toast');
}

/** Booking step 2 for Ahmed (where S03a ends and S03b starts). */
async function toDoctorStep(c: ClipContext, h: Human) {
  await newAppointment(c, h);
  await h.type(c.page.locator('input[type=search]'), 'Ahmed');
  await h.click(c.page.locator('button.doc', { hasText: AHMED.name }));
  await expectVisible(c.page.locator('h2', { hasText: 'Choose a doctor' }), 'doctor step');
}

async function openAhmed(c: ClipContext, h: Human, day?: string) {
  if (day) await h.click(dayChip(c.page, day));
  await h.click(row(c.page, AHMED.name));
  await expectVisible(c.page.locator('h1', { hasText: AHMED.name }), "Ahmed's appointment");
}

async function openVisitRecord(c: ClipContext, h: Human) {
  await openAhmed(c, h);
  await h.click(c.page.locator('.btn.p', { hasText: 'Open visit record' }));
  await expectVisible(c.page.locator('h1', { hasText: 'Visit record' }), 'visit record');
}

async function typeRxRow(c: ClipContext, h: Human, index: number, values: string[]) {
  const inputs = c.page.locator('.rxr').nth(index).locator('input');
  await h.type(inputs.nth(0), values[0]!);
  for (let i = 1; i < values.length; i++) {
    await h.press('Tab');
    await inputs.nth(i).pressSequentially(values[i]!, { delay: h.fast ? 0 : 45 });
    await h.sleep(120);
  }
}

async function noToast(p: Page) {
  await expectHidden(p.locator('.toast'), 'toast', 5000);
}

// ---- the clips ------------------------------------------------------------------

export const CLIPS: Clip[] = [
  {
    id: 'S02-dashboard',
    scene: 'Receptionist morning',
    description: 'Home with the day counts and the roster; gentle scroll through the roster.',
    actor: 'receptionist',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 5,
    needs: 'reset',
    act: async ({ page, human }) => {
      await human.hold(900);
      await human.scrollBy(360, 1300);
      await human.pointAt(row(page, 'Hossam Tarek'));
    },
    verify: async ({ page }) => {
      await expectText(page.locator('.cards3 .stat').first(), '9', 'total patients');
      await expectVisible(row(page, 'Hossam Tarek'), 'roster');
    },
  },
  {
    id: 'S03a-register',
    scene: 'Booking',
    description:
      'New appointment, search "Ahmed Samir" (no result), register him (phone, date of birth, gender, address, penicillin allergy), age calculated, save.',
    actor: 'receptionist',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 22.5,
    briefTarget: 7,
    needs: 'reset',
    produces: 'A-registered',
    act: (c) => registerAhmed(c, c.human),
    verify: async ({ page }) => {
      await expectVisible(page.locator('h2', { hasText: 'Choose a doctor' }), 'doctor selection');
      await expectText(page.locator('.card .row.sb b').first(), AHMED.name, 'selected patient');
    },
    notes: 'The search text carries over into Full name, so the name is not typed twice.',
  },
  {
    id: 'S03b-book',
    scene: 'Booking',
    description:
      'Dr. Karim Adel, tomorrow, 11:00, reason "Persistent cough", save; Home opens on the booked day.',
    actor: 'receptionist',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 10.5,
    briefTarget: 7,
    needs: 'A-registered',
    produces: 'A-booked',
    prepare: (c) => toDoctorStep(c, c.quick),
    act: (c) => bookAhmed(c, c.human),
    verify: async ({ page }) => {
      await expectText(page.locator('.card .tabs .chip.on'), TOMORROW, 'roster day');
      await expectBadges(row(page, AHMED.name), ['Scheduled', 'Unpaid'], 'Ahmed');
    },
  },
  {
    id: 'S03c-roster-scheduled',
    scene: 'Booking',
    description: "Tomorrow's roster with Ahmed as Scheduled + Unpaid.",
    actor: 'receptionist',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 3,
    needs: 'A-booked',
    prepare: (c) => c.quick.click(dayChip(c.page, TOMORROW)),
    act: async ({ page, human }) => {
      await human.pointAt(row(page, AHMED.name).locator('.badges'));
    },
    verify: ({ page }) => expectBadges(row(page, AHMED.name), ['Scheduled', 'Unpaid'], 'Ahmed'),
  },
  {
    id: 'S04-reminder-confirmed',
    scene: 'Reminder',
    description:
      "24 h before: Ahmed's details show the sent reminder; his WhatsApp Confirm arrives (simulated off-camera); status Confirmed; back to the roster.",
    actor: 'receptionist',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 6,
    needs: 'A-booked',
    produces: 'A-confirmed',
    setup: async (c) => {
      await c.open();
      await c.demo('jumpToReminder', AHMED.name);
    },
    prepare: (c) => c.quick.click(dayChip(c.page, TOMORROW)),
    act: async (c) => {
      const { page, human } = c;
      await openAhmed(c, human);
      const log = card(page, 'Reminder & call log');
      await expectText(log, 'WhatsApp reminder sent 24 hours before', 'reminder log');
      await human.pointAt(log.locator('.row').first());
      await human.hold(700);
      await c.demo('reply', AHMED.name, 'confirm');
      await expectText(statusBadges(page), 'Confirmed', 'status after reply');
      await expectText(log, 'Patient replied: Confirm', 'reply in log');
      await human.hold(900);
      await human.click(page.locator('.btn.sm', { hasText: 'Back' }));
    },
    verify: ({ page }) => expectBadges(row(page, AHMED.name), ['Confirmed', 'Unpaid'], 'Ahmed'),
  },
  {
    id: 'S05a-needs-call',
    scene: 'No reply (branch)',
    description:
      'Timeline B: no reply by the cut-off; Ahmed flips from Scheduled to Needs call live.',
    actor: 'receptionist',
    timeline: 'B',
    device: 'desktop',
    lang: 'en',
    target: 4,
    needs: 'reset',
    produces: 'B-needs-call',
    setup: async (c) => {
      await c.open();
      await registerAhmed(c, c.quick);
      await bookAhmed(c, c.quick);
      // Keep the cut-off on Saturday so tomorrow's roster still shows Ahmed after
      // the jump (the roster's day chips count from "today").
      await c.open('admin');
      await nav(c, c.quick, 'Settings');
      await c.quick.click(c.page.locator('.tabs .chip', { hasText: 'Reminders' }));
      for (let i = 0; i < 9; i++)
        await c.quick.click(c.page.getByRole('button', { name: '+', exact: true }));
      await expectText(c.page.locator('.scr .card'), '12 h', 'cut-off');
      await c.demo('jumpToReminder', AHMED.name);
    },
    prepare: (c) => c.quick.click(dayChip(c.page, TOMORROW)),
    act: async (c) => {
      const { page, human } = c;
      await human.pointAt(row(page, AHMED.name).locator('.badges'));
      await human.hold(900);
      await c.demo('jumpPastCutoff', AHMED.name);
      await expectBadges(
        row(page, AHMED.name),
        ['Needs call', 'Unpaid'],
        'Ahmed after the cut-off',
      );
    },
    verify: ({ page }) => expectBadges(row(page, AHMED.name), ['Needs call', 'Unpaid'], 'Ahmed'),
    notes:
      'Timeline B uses a 12 h cut-off (set in Settings off-camera) so the cut-off falls on Saturday evening; with the default 3 h it falls on Sunday morning and the roster day chip would move past Ahmed.',
  },
  {
    id: 'S05b-call-list',
    scene: 'No reply (branch)',
    description:
      'Timeline B: Call list, Ahmed\'s card, call, "Confirmed by phone", card leaves; roster shows Confirmed.',
    actor: 'receptionist',
    timeline: 'B',
    device: 'desktop',
    lang: 'en',
    target: 9,
    briefTarget: 6,
    needs: 'B-needs-call',
    prepare: async (c) => {
      await c.quick.click(dayChip(c.page, TOMORROW));
      await nav(c, c.quick, 'Call list');
    },
    act: async (c) => {
      const { page, human } = c;
      const ahmed = page.locator('.scr > .card', { hasText: AHMED.name });
      await expectVisible(ahmed, "Ahmed's call card");
      await human.click(ahmed.locator('a.btn', { hasText: AHMED.phone }));
      await human.hold(500);
      await human.click(ahmed.locator('.btn', { hasText: 'Confirmed by phone' }));
      await expectHidden(ahmed, "Ahmed's call card");
      await nav(c, human, 'Today');
    },
    verify: ({ page }) => expectBadges(row(page, AHMED.name), ['Confirmed', 'Unpaid'], 'Ahmed'),
  },
  {
    id: 'S06a-arrival-gate',
    scene: 'Arrival',
    description:
      'Appointment time: open Ahmed, Mark arrived, hold on "Payment required before the consultation".',
    actor: 'receptionist',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 6,
    needs: 'A-confirmed',
    produces: 'A-arrived',
    setup: async (c) => {
      await c.open();
      await c.demo('jumpToAppointment', AHMED.name);
    },
    act: async (c) => {
      const { page, human } = c;
      await openAhmed(c, human);
      await human.click(page.locator('.btn.p', { hasText: 'Mark arrived' }));
      await expectText(statusBadges(page), 'Arrived & waiting', 'status');
      await human.pointAt(page.getByText('Payment required before the consultation'));
    },
    verify: async ({ page }) => {
      await expectVisible(
        page.getByText('Payment required before the consultation'),
        'payment gate',
      );
      await expectBadges(statusBadges(page), ['Arrived & waiting', 'Unpaid'], 'Ahmed');
    },
  },
  {
    id: 'S06b-payment',
    scene: 'Arrival',
    description:
      'Record payment 900 EGP cash; badge turns Paid and the payment message disappears.',
    actor: 'receptionist',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 10,
    briefTarget: 6,
    needs: 'A-arrived',
    produces: 'A-paid',
    prepare: (c) => openAhmed(c, c.quick),
    act: async ({ page, human }) => {
      await human.click(page.locator('.card .btn.p', { hasText: 'Record payment' }));
      const sheet = page.locator('.sheet');
      await human.retype(sheet.locator('input[inputmode=numeric]'), '900');
      await human.click(sheet.locator('.chip', { hasText: 'Cash' }));
      await human.click(sheet.locator('.btn.p'));
      await expectText(statusBadges(page), 'Paid', 'payment badge');
      await human.pointAt(card(page, /^Payment$/));
    },
    verify: async ({ page }) => {
      await expectBadges(statusBadges(page), ['Arrived & waiting', 'Paid'], 'Ahmed');
      await expectText(card(page, /^Payment$/), '900 EGP · Cash', 'payment card');
      await expectHidden(
        page.getByText('Payment required before the consultation'),
        'payment gate',
      );
    },
  },
  {
    id: 'S06c-packages',
    scene: 'Payments',
    description:
      'Payments, Packages: the seeded package (8000 EGP, 10 visits, 7 left) and its progress.',
    actor: 'receptionist',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 4,
    needs: 'A-paid',
    prepare: (c) => nav(c, c.quick, 'Payments'),
    act: async ({ page, human }) => {
      await human.click(page.locator('.chip', { hasText: 'Packages' }));
      await human.pointAt(page.locator('.tli', { hasText: 'Nourhan Adel' }).locator('.prog'));
    },
    verify: async ({ page }) => {
      const pkg = page.locator('.tli', { hasText: 'Nourhan Adel' });
      await expectText(pkg, '8,000 EGP · 10 visits', 'package');
      await expectText(pkg, '7 left', 'visits left');
    },
  },
  {
    id: 'S06d-lock-receptionist',
    scene: 'Privacy',
    description:
      'Receptionist opens a patient with past visits: only "Visit completed" with the lock.',
    actor: 'receptionist',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 6,
    briefTarget: 4,
    needs: 'A-paid',
    prepare: (c) => nav(c, c.quick, 'Patients'),
    act: async ({ page, human }) => {
      await human.type(page.locator('input[type=search]'), 'Sherif');
      await human.click(page.locator('button.doc', { hasText: 'Sherif Mansour' }));
      await human.pointAt(
        page.locator('.locked', { hasText: 'Clinical notes visible to doctors only' }),
      );
    },
    verify: async ({ page }) => {
      await expectVisible(page.getByText('Clinical notes visible to doctors only'), 'lock');
      await expectText(page.locator('.tl .tli').first(), 'Visit completed', 'past visit');
      if ((await page.content()).includes('Essential hypertension'))
        throw new Error('clinical text in the page');
    },
    notes: 'Uses the seeded patient Sherif Mansour (four past visits).',
  },
  {
    id: 'S07a-doctor-dashboard',
    scene: 'Doctor',
    description: "Doctor's Home shows only Dr. Karim Adel's patients.",
    actor: 'doctor',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 4,
    needs: 'A-paid',
    act: async ({ page, human }) => {
      await human.hold(600);
      await human.pointAt(row(page, AHMED.name));
    },
    verify: async ({ page }) => {
      const rows = page.locator('button.tr');
      if ((await rows.count()) === 0) throw new Error('no rows');
      for (const r of await rows.all()) await expectText(r, DOCTOR, 'row doctor');
    },
  },
  {
    id: 'S07b-calendar-appointment',
    scene: 'Doctor',
    description:
      "Calendar day view, click Ahmed's 11:00, details with the penicillin allergy warning.",
    actor: 'doctor',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 6,
    needs: 'A-paid',
    act: async (c) => {
      const { page, human } = c;
      await nav(c, human, 'Calendar');
      await human.hold(500);
      await human.click(page.locator('.cal .ev', { hasText: AHMED.name }));
      await human.pointAt(page.locator('.alert').first());
    },
    verify: ({ page }) =>
      expectText(page.locator('.alert').first(), 'Penicillin', 'allergy warning'),
  },
  {
    id: 'S08a-visit-text',
    scene: 'Consultation',
    description:
      'Start consultation, open the visit record, type complaint, diagnosis and treatment.',
    actor: 'doctor',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 13.5,
    briefTarget: 7,
    needs: 'A-paid',
    produces: 'A-draft',
    prepare: (c) => openAhmed(c, c.quick),
    act: async ({ page, human }) => {
      await human.click(page.locator('.btn.p', { hasText: 'Start consultation' }));
      await human.click(page.locator('.btn.p', { hasText: 'Open visit record' }));
      await human.type(page.getByLabel('Complaint'), 'Dry cough for two weeks');
      await human.type(page.getByLabel('Diagnosis'), 'Upper respiratory infection');
      await human.type(page.getByLabel('Treatment'), 'Rest and fluids');
    },
    verify: async ({ page }) => {
      if ((await page.getByLabel('Treatment').inputValue()) !== 'Rest and fluids')
        throw new Error('treatment text');
    },
    post: (c) => c.quick.click(c.page.locator('.btn', { hasText: 'Save draft' })),
  },
  {
    id: 'S08b-prescription',
    scene: 'Consultation',
    description: 'Add prescription: Paracetamol and cough syrup rows; the preview fills in.',
    actor: 'doctor',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 17,
    briefTarget: 7,
    needs: 'A-draft',
    produces: 'A-rx',
    prepare: (c) => openVisitRecord(c, c.quick),
    act: async (c) => {
      const { page, human } = c;
      await human.click(page.locator('.btn', { hasText: 'Add prescription' }));
      await human.click(page.locator('.btn', { hasText: 'Add medication' }));
      await typeRxRow(c, human, 0, ['Paracetamol', '500 mg', 'Twice daily', '3 days']);
      await human.click(page.locator('.btn', { hasText: 'Add medication' }));
      await typeRxRow(c, human, 1, ['Cough syrup', '5 ml', 'Three times daily', '5 days']);
      await human.pointAt(page.locator('.rxp'));
    },
    verify: async ({ page }) => {
      await expectText(page.locator('.rxp'), 'Paracetamol — 500 mg', 'preview row 1');
      await expectText(page.locator('.rxp'), 'Cough syrup — 5 ml', 'preview row 2');
      await expectText(page.locator('.rxp'), AHMED.name, 'preview patient');
    },
    post: async (c) => {
      await c.quick.click(c.page.locator('.btn.sm', { hasText: 'Back' }));
      await c.quick.click(c.page.locator('.btn', { hasText: 'Save draft' }));
    },
  },
  {
    id: 'S08c-prescription-sent',
    scene: 'Consultation',
    description: 'Finalize and send via WhatsApp: Sent, then Delivered.',
    actor: 'doctor',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 4,
    needs: 'A-rx',
    produces: 'A-sent',
    prepare: async (c) => {
      await openVisitRecord(c, c.quick);
      await c.quick.click(c.page.locator('.btn', { hasText: 'Prescription (2)' }));
    },
    act: async ({ page, human }) => {
      await human.click(page.locator('.btn.p', { hasText: 'Finalize and send via WhatsApp' }));
      const badge = page.locator('.card', { hasText: 'Delivery status' }).locator('.badge');
      await expectText(badge, 'Sent', 'delivery status', 1500);
      await human.pointAt(badge);
      await expectText(badge, 'Delivered', 'delivery status', 4000);
    },
    verify: ({ page }) =>
      expectText(
        page.locator('.card', { hasText: 'Delivery status' }).locator('.badge'),
        'Delivered',
        'delivery',
      ),
  },
  {
    id: 'S08d-complete',
    scene: 'Consultation',
    description: 'Save and complete visit; the appointment becomes Completed.',
    actor: 'doctor',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 3,
    needs: 'A-sent',
    produces: 'A-complete',
    prepare: (c) => openVisitRecord(c, c.quick),
    act: async ({ page, human }) => {
      await human.click(page.locator('.btn.p.lg', { hasText: 'Save and complete visit' }));
      await expectText(page.locator('.toast'), 'Visit saved to history', 'toast');
    },
    verify: async (c) => {
      await expectVisible(c.page.locator('h1', { hasText: AHMED.name }), 'patient file');
      const a = await c.demo<{ status: string }>('appointment', AHMED.name);
      if (a.status !== 'completed') throw new Error(`appointment is ${a.status}, not completed`);
    },
    notes:
      'Completing opens the patient file; the Completed status is checked through window.__demo.',
  },
  {
    id: 'S09a-history-saved',
    scene: 'History',
    description:
      "Ahmed's file: the new visit at the top of the timeline with the Prescription chip.",
    actor: 'doctor',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 4,
    needs: 'A-complete',
    prepare: async (c) => {
      await nav(c, c.quick, 'Patients');
      await c.quick.type(c.page.locator('input[type=search]'), 'Ahmed');
      await c.quick.click(c.page.locator('button.doc', { hasText: AHMED.name }));
    },
    act: async ({ page, human }) => {
      await human.hold(400);
      await human.pointAt(
        page.locator('.tl .tli').first().locator('.badge', { hasText: 'Prescription' }),
      );
    },
    verify: async ({ page }) => {
      const top = page.locator('.tl .tli').first();
      await expectText(top, 'Upper respiratory infection', 'top visit');
      await expectVisible(top.locator('.badge', { hasText: 'Prescription' }), 'prescription chip');
    },
  },
  {
    id: 'S09b-return-history',
    scene: 'Return visit',
    description:
      'Three months later, a follow-up is booked (off-camera); the doctor opens it: pinned penicillin allergy and the previous visit with its prescription, before the consultation.',
    actor: 'doctor',
    timeline: 'A',
    device: 'desktop',
    lang: 'en',
    target: 6,
    needs: 'A-complete',
    produces: 'A-return',
    setup: async (c) => {
      await c.open('receptionist');
      await c.demo('advance', { months: 3 });
      const q = c.quick;
      await nav(c, q, 'Patients');
      await q.type(c.page.locator('input[type=search]'), 'Ahmed');
      await q.click(c.page.locator('button.doc', { hasText: AHMED.name }));
      await q.click(c.page.locator('.btn.p', { hasText: 'New appointment' }));
      await q.click(c.page.locator('button.doc', { hasText: DOCTOR }));
      const tomorrow = dayLabel(addDays(await c.demo<string>('now'), 1));
      await q.click(dayChip(c.page, tomorrow));
      await q.click(c.page.locator('.slots .slot:not([disabled])').first());
      await q.type(c.page.getByPlaceholder('e.g. Follow-up, new complaint'), 'Follow-up');
      await q.click(c.page.locator('.btn.p.lg', { hasText: 'Save appointment' }));
    },
    prepare: async (c) => {
      const tomorrow = dayLabel(addDays(await c.demo<string>('now'), 1));
      await c.quick.click(dayChip(c.page, tomorrow));
    },
    act: async (c) => {
      const { page, human } = c;
      await openAhmed(c, human);
      const history = card(page, 'Patient history');
      await human.pointAt(history.locator('.alert'));
      await human.hold(700);
      await human.pointAt(
        history.locator('.tli').first().locator('.badge', { hasText: 'Prescription' }),
      );
    },
    verify: async ({ page }) => {
      const history = card(page, 'Patient history');
      await expectText(history.locator('.alert'), 'Penicillin', 'pinned allergy');
      const previous = history.locator('.tli').first();
      for (const text of [
        'Dry cough for two weeks',
        'Upper respiratory infection',
        'Rest and fluids',
      ]) {
        await expectText(previous, text, 'previous visit');
      }
      await expectVisible(
        previous.locator('.badge', { hasText: 'Prescription' }),
        'prescription chip',
      );
      await expectText(statusBadges(page), 'Scheduled', 'follow-up status');
    },
  },
  {
    id: 'S10a-phone-roster',
    scene: 'Closing: mobile',
    description:
      'Phone: receptionist Home with stats cards, the roster as stacked cards and the bottom tab bar; gentle scroll.',
    actor: 'receptionist',
    timeline: '-',
    device: 'phone',
    lang: 'en',
    target: 4,
    needs: 'reset',
    act: async ({ human }) => {
      await human.hold(700);
      await human.scrollBy(620, 1500);
    },
    verify: async ({ page }) => {
      await expectVisible(page.locator('.tabbar'), 'tab bar');
      await expectVisible(row(page, 'Hossam Tarek'), 'roster card');
    },
  },
  {
    id: 'S10b-phone-booking',
    scene: 'Closing: mobile',
    description:
      'Phone: New appointment, search, choose a doctor, open the time-slot bottom sheet (stops before saving).',
    actor: 'receptionist',
    timeline: '-',
    device: 'phone',
    lang: 'en',
    target: 8.5,
    briefTarget: 6,
    needs: 'A-registered',
    act: async (c) => {
      const { page, human } = c;
      await newAppointment(c, human);
      await human.type(page.locator('input[type=search]'), 'Ahmed');
      await human.click(page.locator('button.doc', { hasText: AHMED.name }));
      await human.click(page.locator('button.doc', { hasText: DOCTOR }));
      await human.click(page.locator('.hide-d .btn.lg.full'));
      await human.click(page.locator('.sheet .tabs .chip', { hasText: TOMORROW }));
    },
    verify: async ({ page }) => {
      await expectVisible(page.locator('.sheet .slot', { hasText: '11:00' }), 'slot sheet');
    },
  },
  {
    id: 'S10c-arabic-switch',
    scene: 'Closing: Arabic',
    description:
      'Desktop English roster; the language button flips the whole UI to Arabic, right to left.',
    actor: 'receptionist',
    timeline: '-',
    device: 'desktop',
    lang: 'en',
    target: 6,
    needs: 'A-paid',
    prepare: async ({ page }) => noToast(page),
    act: async ({ page, human }) => {
      await human.hold(800);
      await human.click(page.locator('header .btn.lang'));
      await expectVisible(page.locator('.app[dir=rtl]'), 'RTL layout');
      await human.hold(600);
      await human.pointAt(page.locator('button.tr').first());
    },
    verify: async ({ page }) => {
      await expectVisible(page.locator('.app[dir=rtl]'), 'RTL layout');
      await expectText(page.locator('h1').first(), 'اليوم', 'Arabic heading');
    },
  },
  {
    id: 'S10d-arabic-phone',
    scene: 'Closing: Arabic',
    description: 'Phone, Arabic: the roster right to left.',
    actor: 'receptionist',
    timeline: '-',
    device: 'phone',
    lang: 'ar',
    target: 4,
    needs: 'A-paid',
    optional: true,
    act: async ({ human }) => {
      await human.hold(800);
      await human.scrollBy(420, 1300);
    },
    verify: async ({ page }) => {
      await expectVisible(page.locator('.app[dir=rtl]'), 'RTL layout');
      await expectVisible(page.locator('.tabbar'), 'tab bar');
    },
  },
];
