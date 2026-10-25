import { expect, test } from './helpers';

test('J1 receptionist sees only "Visit completed"; clinical text is locked and absent from the page', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  await app.goTo('Patients');
  await page.locator('input[type=search]').fill('Sherif');
  await page.locator('button.doc', { hasText: 'Sherif Mansour' }).click();
  await expect(page.getByText('Clinical notes visible to doctors only')).toBeVisible();
  const visits = page.locator('.tl .tli');
  await expect(visits).toHaveCount(4);
  for (const v of await visits.all()) {
    await expect(v).toContainText('Visit completed');
    await expect(v.locator('.blk')).toHaveCount(0);
  }
  const html = await page.content();
  for (const clinical of [
    'Essential hypertension',
    'Acute tonsillitis',
    'Amlodipine',
    'Azithromycin',
  ]) {
    expect(html).not.toContain(clinical);
  }
  await app.goTo('Today');
  await app.openRow('Sherif Mansour');
  await expect(page.getByText('Clinical notes visible to doctors only')).toBeVisible();
  await expect(page.locator('h2', { hasText: 'Patient history' })).toHaveCount(0);
  expect(await page.content()).not.toContain('Essential hypertension');
  // The data layer itself withholds it: see scheduling.test.ts "clinical content by role".
});

test('J2 doctor sees payments read-only; only admin has Settings and the Audit log', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  expect(await app.navLabels()).toEqual(['Today', 'Calendar', 'Call list', 'Payments', 'Patients']);
  await app.switchRole('doctor');
  expect(await app.navLabels()).toEqual(['Today', 'Calendar', 'Patients', 'Payments']);
  await app.goTo('Payments');
  await expect(page.getByText('Read-only for doctors.')).toBeVisible();
  await expect(page.locator('.split h2', { hasText: 'Record payment' })).toHaveCount(0);
  await page.locator('.chip', { hasText: 'Packages' }).click();
  await expect(page.locator('.btn', { hasText: 'New package' })).toHaveCount(0);
  await expect(page.locator('.btn', { hasText: 'Manual adjustment' })).toHaveCount(0);
  await app.goTo('Today');
  await app.openRow('Hossam Tarek');
  await expect(page.locator('.btn', { hasText: 'Record payment' })).toHaveCount(0);
  await expect(page.getByText('Read-only for doctors.')).toBeVisible();
  await app.switchRole('admin');
  expect(await app.navLabels()).toEqual([
    'Today',
    'Calendar',
    'Call list',
    'Payments',
    'Patients',
    'Settings',
    'Audit log',
  ]);
});

test('J3 settings: schedules, blocked days remove slots, clinic profile, reminder cut-off', async ({
  app,
}) => {
  const { page } = app;
  await app.open('admin');
  await app.goTo('Settings');
  const karim = page.locator('.scr > .card', { hasText: 'Dr. Karim Adel' });
  await expect(karim).toContainText('Sat – Thu');
  await expect(karim).toContainText('09:00 – 14:30');
  await expect(karim).toContainText('30 min');
  await karim.locator('.btn', { hasText: 'Block off days or hours' }).click();
  await expect(page.locator('.sheet label', { hasText: 'Date' }).locator('option')).toHaveText([
    'Tomorrow',
    'Mon 26 Oct',
  ]);
  await page.locator('.sheet input').fill('Public holiday');
  await page.locator('.sheet .btn.p').click();
  await expect(karim.locator('.locked')).toHaveText('Sun 25 Oct · Public holiday');

  await page.locator('.chip', { hasText: 'Clinic profile' }).click();
  await page.getByLabel('Clinic name').fill('Nile Care Clinic Heliopolis');
  await app.button('Save').click();
  await page.locator('.chip', { hasText: 'Reminders' }).click();
  await expect(page.getByText('WhatsApp reminder 24 hours before')).toBeVisible();
  await expect(page.locator('.scr .card')).toContainText('3 h');
  await page.getByRole('button', { name: '+', exact: true }).click();
  await expect(page.locator('.scr .card')).toContainText('4 h');
  await page.reload();
  await page.locator('.app .main').waitFor();
  await app.goTo('Settings');
  await page.locator('.chip', { hasText: 'Clinic profile' }).click();
  await expect(page.getByLabel('Clinic name')).toHaveValue('Nile Care Clinic Heliopolis');
  await page.locator('.chip', { hasText: 'Reminders' }).click();
  await expect(page.locator('.scr .card')).toContainText('4 h');

  // The blocked day has no bookable slots.
  await app.goTo('Today');
  await app.newAppointment();
  await page.locator('input[type=search]').fill('Mona');
  await page.locator('button.doc', { hasText: 'Mona Hassan' }).click();
  await app.pickDoctor('Dr. Karim Adel');
  await (await app.slot('Sun 25 Oct', '09:00')).waitFor();
  const scope = app.isPhone ? page.locator('.sheet') : page.locator('.slots');
  const slots = scope.locator('.slot');
  expect(await slots.count()).toBe(12);
  for (const s of await slots.all()) await expect(s).toBeDisabled();
  if (app.isPhone) await page.locator('.sheet [aria-label=Close]').click();
  await expect(page.getByText('This doctor is off on this day.')).toBeVisible();
});

test('J4 the audit log records edits, overrides and adjustments with who and when', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  await app.goTo('Patients');
  await page.locator('input[type=search]').fill('Mona');
  await page.locator('button.doc', { hasText: 'Mona Hassan' }).click();
  await page.locator('.btn.sm', { hasText: 'Edit' }).click();
  await page.locator('.sheet label', { hasText: 'Phone' }).locator('input').fill('01012345679');
  await page.locator('.sheet .btn.p').click();
  await app.switchRole('admin');
  await app.goTo('Audit log');
  const first = page.locator('.scr .card .row').first();
  await expect(first).toContainText('2026-10-24 10:15');
  await expect(first).toContainText("Receptionist Nour edited Mona Hassan's phone number");
  // Seeded entries cover a visit-record edit, an override and a package sale.
  await expect(page.locator('.scr .card')).toContainText('overrode the payment rule');
  await expect(page.locator('.scr .card')).toContainText('edited a visit record');
  // Overrides: payments.spec E2. Package adjustments: payments.spec E5. Visit edits: doctor.spec G3.
});
