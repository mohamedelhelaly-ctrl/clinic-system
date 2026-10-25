import type { App } from './helpers';
import { expect, test } from './helpers';

const status = (app: App) => app.page.locator('.card .badges .badge').first();
const log = (app: App) => app.page.locator('.card', { hasText: 'Reminder & call log' });

async function bookTomorrow(app: App, patient: string, time: string) {
  const { page } = app;
  await app.newAppointment();
  await page.locator('input[type=search]').fill(patient);
  await page.locator('button.doc', { hasText: patient }).click();
  await app.pickDoctor('Dr. Karim Adel');
  await app.pickSlot('Sun 25 Oct', time);
  await app.saveAppointment('Review');
}

test('D1 at 24 h before, a simulated WhatsApp reminder with Confirm/Cancel goes out and is logged', async ({
  app,
}) => {
  await app.open('receptionist');
  await bookTomorrow(app, 'Hossam Tarek', '13:00');
  await app.openRow('Hossam Tarek');
  await expect(log(app)).toContainText(
    'WhatsApp reminder scheduled 24 hours before (Confirm / Cancel).',
  );
  await expect(app.page.getByTestId('demo-reminder-status')).toHaveText(
    'Reminder due Sat 24 Oct 13:00',
  );
  await app.demoClick('demo-plus-hour');
  await expect(app.page.getByTestId('demo-reminder-status')).toHaveText(
    'Reminder due Sat 24 Oct 13:00',
  );
  await app.demoClick('demo-jump-reminder');
  await expect(app.page.getByTestId('demo-reminder-status')).toHaveText(
    'Reminder sent Sat 24 Oct 13:00',
  );
  await expect(log(app)).toContainText(
    'WhatsApp reminder sent 24 hours before (Confirm / Cancel).',
  );
  await expect(log(app)).toContainText('Sat 24 Oct, 13:00');
  await expect(log(app)).toContainText('No reply from the patient yet');
  await expect(status(app)).toHaveText('Scheduled');
});

test('D2 reply Confirm → Confirmed; reply Cancel → Cancelled and the slot is freed', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  await bookTomorrow(app, 'Hossam Tarek', '13:00');
  await app.openRow('Hossam Tarek');
  await expect(page.getByTestId('demo-reply-confirm')).toBeDisabled();
  await app.demoClick('demo-jump-reminder');
  await app.demoClick('demo-reply-confirm');
  await expect(status(app)).toHaveText('Confirmed');
  await expect(log(app)).toContainText('Patient replied: Confirm');
  await expect(log(app)).toContainText('Via WhatsApp · Sat 24 Oct, 13:00');

  await app.button('Back').click();
  await app.rosterDay('Sun 25 Oct');
  await app.openRow('Farida Mostafa');
  await app.demoClick('demo-reply-cancel');
  await expect(status(app)).toHaveText('Cancelled');
  await expect(page.locator('.card .badges')).toContainText('Cancelled by patient via WhatsApp');
  // Dr. Salma Nabil's 10:30 slot tomorrow is free again.
  await app.button('Back').click();
  await app.newAppointment();
  await page.locator('input[type=search]').fill('Mona');
  await page.locator('button.doc', { hasText: 'Mona Hassan' }).click();
  await app.pickDoctor('Dr. Salma Nabil');
  await expect(await app.slot('Sun 25 Oct', '10:30')).toBeEnabled();
});

test('D3 no reply by the cut-off → Needs call automatically, on the Call list (next 24 h, by time)', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  await app.goTo('Call list');
  const names = () => page.locator('.scr .card b').allInnerTexts();
  expect(await names()).toEqual(['Mahmoud Gaber', 'Salma Khaled']);

  await app.goTo('Today');
  await app.rosterDay('Sun 25 Oct');
  await app.openRow('Farida Mostafa');
  await expect(status(app)).toHaveText('Scheduled');
  await app.demoClick('demo-no-reply');
  await expect(page.getByTestId('demo-clock')).toHaveText('Sun 25 Oct 07:31');
  await expect(status(app)).toHaveText('Needs call');
  await app.goTo('Call list');
  // Mahmoud's Saturday 11:30 has passed, so it is no longer in the next 24 hours.
  expect(await names()).toEqual(['Salma Khaled', 'Farida Mostafa']);
  await expect(page.locator('.card', { hasText: 'Farida Mostafa' })).toContainText(
    'Sun 25 Oct · 10:30',
  );
});

test('D4 call outcomes: Confirmed by phone, Cancelled, No answer (logged with time)', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  await app.goTo('Call list');
  const mahmoud = page.locator('.card', { hasText: 'Mahmoud Gaber' });
  await expect(mahmoud).toContainText('Attempts: No answer 09:40');
  await mahmoud.locator('.btn', { hasText: 'No answer' }).click();
  await expect(page.locator('.toast')).toHaveText('Attempt logged');
  await expect(mahmoud).toContainText('Attempts: No answer 09:40 · No answer 10:15');
  await mahmoud.locator('.btn', { hasText: 'Confirmed by phone' }).click();
  await expect(mahmoud).toHaveCount(0);

  const salma = page.locator('.card', { hasText: 'Salma Khaled' });
  await salma.locator('.btn', { hasText: 'Cancel' }).click();
  await expect(salma).toHaveCount(0);
  await expect(page.getByText('All caught up. No calls waiting.')).toBeVisible();

  await app.goTo('Today');
  await expect(app.row('Mahmoud Gaber').locator('.badge').first()).toHaveText('Confirmed');
  await app.rosterDay('Sun 25 Oct');
  await expect(app.row('Salma Khaled').locator('.badge').first()).toHaveText('Cancelled');
  await app.openRow('Salma Khaled');
  await expect(page.locator('.card .badges')).toContainText('Cancelled by patient by phone');
});

test('D6 appointment details show the reminder and call log: sent time, reply, call attempts', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  await app.openRow('Mahmoud Gaber');
  await expect(log(app)).toContainText(
    'WhatsApp reminder sent 24 hours before (Confirm / Cancel).',
  );
  await expect(log(app)).toContainText('Fri 23 Oct, 11:30');
  await expect(log(app)).toContainText('No reply by the 3 h cut-off. Moved to the Call list.');
  await expect(log(app)).toContainText('Call attempt: No answer');
  await expect(log(app)).toContainText('Today 09:40');
  await app.button('Back').click();
  await app.openRow('Farida Mostafa');
  await expect(log(app)).toContainText('Patient replied: Confirm');
  await expect(log(app)).toContainText('Via WhatsApp · Fri 23 Oct, 18:00');
  void page;
});
