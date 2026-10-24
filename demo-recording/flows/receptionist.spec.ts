import { expect, test } from './helpers';

/*
 * Receptionist takes. Each test is one video, starting from fresh seed data
 * on the fixed demo day (Saturday 24 October 2026, 10:15).
 */

test('01 morning overview', async ({ director: d }) => {
  await d.open('receptionist');
  await d.show('.cards3');
  await d.tap('.chip', 'Needs attention');
  await d.beat(1500);
  await d.tap('.chip', 'Needs attention');
  await d.show('button.tr', 'Mahmoud Gaber');
});

test('02 check in and take payment', async ({ director: d, page }) => {
  await d.open('receptionist');
  await d.tap('button.tr', 'Hossam Tarek');
  await d.show('.btn.p', 'Record payment');
  await d.tap('.btn.p', 'Record payment');
  await d.beat();
  await d.tap('.sheet .chip', 'Cash');
  await d.tap('.sheet .btn.p.lg.full');
  await expect(page.locator('.card .badge.p-paid').first()).toBeVisible();
  await d.beat(1500);
});

test('03 book an existing patient', async ({ director: d, page }) => {
  await d.open('receptionist');
  await d.newAppointment();
  await d.type('input[type=search]', 'Mona');
  await d.tap('button.doc', 'Mona Hassan');
  await d.tap('button.doc', 'Dr. Karim');
  await d.tap('.tabs .chip', 'Sun 25 Oct');
  if (d.isPhone) {
    await d.tap('.hide-d .btn.lg.full');
    await d.tap('.sheet .slot', '11:00');
  } else {
    await d.tap('.slots .slot', '11:00');
  }
  await d.type('input[placeholder^="e.g. Follow-up"]', 'Follow-up on headaches');
  await d.show('.sub', 'WhatsApp reminder will be sent');
  await d.tap('.btn.p.lg', 'Save appointment');
  await expect(page.locator('.toast')).toHaveText('Appointment booked');
  await d.beat(1500);
});

test('04 register a walk-in who shares a phone', async ({ director: d, page }) => {
  await d.open('receptionist');
  await d.tap('.btn.lg', 'Walk-in');
  await d.type('input[type=search]', 'Laila Hassan');
  await d.tap('.btn', 'Register new patient');
  await d.type('input[inputmode=tel]', '01012345678');
  await d.show('.alert', 'already linked');
  await d.tap('.btn.p.lg', 'Add as another patient');
  await d.tap('button.doc', 'Dr. Hany');
  await d.show('.sub', "today's queue");
  await d.tap('.btn.p.lg', 'Save appointment');
  await expect(page.locator('button.tr', { hasText: 'Laila Hassan' })).toBeVisible();
  await d.show('button.tr', 'Laila Hassan');
});

test('05 work the call list', async ({ director: d, page }) => {
  await d.open('receptionist');
  await d.goTo('Call list');
  await d.show('.card', 'Mahmoud Gaber');
  await d.tap('.card:has-text("Mahmoud Gaber") .btn', 'No answer');
  await d.beat();
  await d.tap('.card:has-text("Mahmoud Gaber") .btn', 'Confirmed by phone');
  await expect(page.locator('.card', { hasText: 'Mahmoud Gaber' })).toHaveCount(0);
  await d.beat(1500);
});

test('06 packages and the daily cash summary', async ({ director: d }) => {
  await d.open('receptionist');
  await d.goTo('Payments');
  await d.show('.cards3');
  await d.tap('.chip', 'Packages');
  await d.show('.tli', 'Nourhan Adel');
  await d.goTo('Patients');
  await d.tap('button.doc', 'Nourhan Adel');
  await d.show('.prog');
});

test('07 arabic and right to left', async ({ director: d }) => {
  await d.open('receptionist');
  await d.tap('.btn.lang');
  await d.beat(1500);
  await d.tap('button.tr', 'حسام طارق');
  await d.beat(1500);
});
