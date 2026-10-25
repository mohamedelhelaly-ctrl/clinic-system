import { expect, test } from './helpers';

test('C1 pick a doctor, see that day’s slots with booked and past slots disabled', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  await app.newAppointment();
  await page.locator('input[type=search]').fill('Karim Nabil');
  await page.locator('button.doc', { hasText: 'Karim Nabil' }).click();
  await app.pickDoctor('Dr. Salma Nabil');
  // Tomorrow: 10:30 is booked (Farida Mostafa); Dr. Salma Nabil works 10:00–14:30.
  const booked = await app.slot('Sun 25 Oct', '10:30');
  await expect(booked).toBeDisabled();
  const scope = app.isPhone ? page.locator('.sheet') : page.locator('.slots');
  await expect(scope.locator('.slot')).toHaveText(
    Array.from(
      { length: 10 },
      (_, i) => `${String(10 + Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`,
    ),
  );
  await expect(scope.locator('.slot', { hasText: '11:00' })).toBeEnabled();
  // Today: slots before 10:15 have passed.
  await scope.locator('..').locator('.tabs .chip', { hasText: 'Today' }).first().click();
  await expect(scope.locator('.slot', { hasText: '10:00' })).toBeDisabled();
  await expect(scope.locator('.slot', { hasText: '11:30' })).toBeEnabled();
  await scope.locator('.slot', { hasText: '11:30' }).click();
  await expect(page.locator('h2', { hasText: 'Appointment details' })).toBeVisible();
});

test('C2 the appointment form has only patient, doctor, date/time and reason', async ({ app }) => {
  const { page } = app;
  await app.open('receptionist');
  await app.newAppointment();
  await page.locator('input[type=search]').fill('Hossam');
  await page.locator('button.doc', { hasText: 'Hossam Tarek' }).click();
  await app.pickDoctor('Dr. Karim Adel');
  await app.pickSlot('Sun 25 Oct', '13:00');
  const details = page.locator('.card', {
    has: page.locator('h2', { hasText: 'Appointment details' }),
  });
  const labels = (await details.locator('.lbl').allInnerTexts()).map((l) =>
    l.split('\n')[0]!.trim(),
  );
  expect(labels).toEqual(['Patient', 'Doctor', 'Date & time', 'Reason for visit']);
});

test('C3 saving creates Scheduled + Unpaid (or Covered by package) and shows it in roster and calendar', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  await app.newAppointment();
  await page.locator('input[type=search]').fill('Hossam');
  await page.locator('button.doc', { hasText: 'Hossam Tarek' }).click();
  await app.pickDoctor('Dr. Karim Adel');
  await app.pickSlot('Sun 25 Oct', '13:00');
  await app.saveAppointment('Follow-up');
  await expect(page.locator('.card .tabs .chip.on')).toHaveText('Sun 25 Oct');
  await expect(app.row('Hossam Tarek').locator('.badge')).toHaveText(['Scheduled', 'Unpaid']);

  // A patient with an active package is booked as Covered by package.
  await app.newAppointment();
  await page.locator('input[type=search]').fill('Nourhan');
  await page.locator('button.doc', { hasText: 'Nourhan Adel' }).click();
  await app.pickDoctor('Dr. Salma Nabil');
  await app.pickSlot('Sun 25 Oct', '12:00');
  await expect(page.locator('.chipg')).toHaveText('Covered by package (7 left)');
  await app.saveAppointment('Acne follow-up');
  await expect(app.row('Nourhan Adel').locator('.badge')).toHaveText([
    'Scheduled',
    'Covered by package',
  ]);

  // Doctor's calendar.
  await app.goTo('Calendar');
  await page.locator('.tabs .chip', { hasText: 'Dr. Karim Adel' }).click();
  await page.locator('.card .tabs .chip', { hasText: 'Sun 25 Oct' }).click();
  await expect(page.locator('.cal .ev', { hasText: 'Hossam Tarek' })).toContainText('Scheduled');
});

test('C4 a booked slot cannot be booked again; walk-ins join today’s queue as Arrived & waiting', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  await app.newAppointment();
  await page.locator('input[type=search]').fill('Hossam');
  await page.locator('button.doc', { hasText: 'Hossam Tarek' }).click();
  await app.pickDoctor('Dr. Karim Adel');
  await app.pickSlot('Sun 25 Oct', '13:00');
  await app.saveAppointment();
  await app.newAppointment();
  await page.locator('input[type=search]').fill('Mahmoud');
  await page.locator('button.doc', { hasText: 'Mahmoud Gaber' }).click();
  await app.pickDoctor('Dr. Karim Adel');
  await expect(await app.slot('Sun 25 Oct', '13:00')).toBeDisabled();
  if (app.isPhone) await page.locator('.sheet [aria-label=Close]').click();
  // The data layer also refuses it (unit test: scheduling.test.ts "double booking").

  await app.goTo('Today');
  await app.button('Walk-in').click();
  await page.locator('input[type=search]').fill('Yara');
  await page.locator('button.doc', { hasText: 'Yara Waleed' }).click();
  await app.pickDoctor('Dr. Dina Farouk');
  await expect(page.getByText("Added to today's queue as Arrived & waiting.")).toBeVisible();
  await app.saveAppointment('Rash');
  const walkIn = page.locator('button.tr', { hasText: 'Walk-in' });
  await expect(walkIn).toContainText('Yara Waleed');
  await expect(walkIn.locator('.badge')).toHaveText(['Arrived & waiting', 'Unpaid']);
  await expect(page.locator('.cards3 .stat').nth(1)).toContainText('3');
});

test('D5 booked less than 24 h ahead: no reminder, stays Scheduled, can be confirmed manually', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  await app.newAppointment();
  await page.locator('input[type=search]').fill('Karim Nabil');
  await page.locator('button.doc', { hasText: 'Karim Nabil' }).click();
  await app.pickDoctor('Dr. Karim Adel');
  await app.pickSlot('Today', '14:00');
  await expect(
    page.getByText('Booked less than 24 hours ahead: no automatic reminder.', { exact: false }),
  ).toBeVisible();
  await app.saveAppointment('Results');
  await page.locator('button.tr', { hasText: '14:00' }).click();
  await expect(page.getByTestId('demo-reminder-status')).toHaveText(
    'No automatic reminder for this appointment',
  );
  await app.demoClick('demo-plus-hour');
  await app.demoClick('demo-plus-hour');
  await expect(page.locator('.card .badges .badge').first()).toHaveText('Scheduled');
  await app.button('Mark confirmed').click();
  await expect(page.locator('.card .badges .badge').first()).toHaveText('Confirmed');
});
