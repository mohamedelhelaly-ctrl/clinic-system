import { expect, test } from './helpers';

test('Demo: URL parameters role, lang and reset', async ({ app }) => {
  const { page } = app;
  await app.open('doctor', { lang: 'ar' });
  await expect(page.locator('.app')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('header select')).toHaveValue('doctor');
  expect(page.url()).not.toContain('reset');
  await page.goto('/?role=admin&lang=en');
  await page.locator('.app .main').waitFor();
  await expect(page.locator('header select')).toHaveValue('admin');
  // Changes survive a reload until ?reset=1.
  await app.openRow('Hossam Tarek');
  await app.recordPayment('400', 'Cash');
  await page.goto('/?role=receptionist');
  await page.locator('.app .main').waitFor();
  await expect(app.row('Hossam Tarek').locator('.badge').last()).toHaveText('Paid');
  await app.open('receptionist', { reset: true });
  await expect(app.row('Hossam Tarek').locator('.badge').last()).toHaveText('Unpaid');
});

test('Demo: in-app role switcher, Reset demo button, Demo badge on every screen', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  for (const screen of ['Calendar', 'Call list', 'Payments', 'Patients', 'Today']) {
    await app.goTo(screen);
    await expect(page.locator('.demo-badge').first()).toBeVisible();
  }
  await app.switchRole('admin');
  await app.openRow('Hossam Tarek');
  await app.recordPayment('400', 'Cash');
  await app.demoClick('demo-plus-day');
  await expect(page.getByTestId('demo-clock')).toHaveText('Sun 25 Oct 10:15');
  await page.getByTestId('demo-reset').click();
  await expect(page.locator('.toast')).toHaveText('Demo data restored');
  await expect(page.getByTestId('demo-clock')).toHaveText('Sat 24 Oct 10:15');
  await expect(app.row('Hossam Tarek').locator('.badge').last()).toHaveText('Unpaid');
});

test('Demo: clock controls move time and time-based rules follow it (no-show grace)', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  await app.demoClick('demo-plus-hour');
  await expect(page.getByTestId('demo-clock')).toHaveText('Sat 24 Oct 11:15');
  await app.demoClick('demo-plus-month');
  await expect(page.getByTestId('demo-clock')).toHaveText('Tue 24 Nov 11:15');
  await expect(page.locator('h1 + .sub, .sub').first()).toContainText('24 November 2026');

  await app.open('receptionist');
  await app.openRow('Mona Hassan');
  await expect(page.locator('.btn', { hasText: 'Mark no-show' })).toHaveCount(0);
  await app.demoClick('demo-jump-appointment');
  await expect(page.getByTestId('demo-clock')).toHaveText('Sat 24 Oct 12:00');
  // Within the 15-minute grace period: no suggestion yet.
  await expect(page.getByText('Slot time has passed. Suggest marking No show.')).toHaveCount(0);
  await app.demoClick('demo-plus-hour');
  await expect(page.getByText('Slot time has passed. Suggest marking No show.')).toBeVisible();
  await app.button('Mark no-show').click();
  await expect(page.locator('.card .badges .badge').first()).toHaveText('No show');
});

test('Demo: deterministic fictional seed (doctors, phones, EGP, no Ahmed Samir)', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  await app.newAppointment();
  await page.locator('input[type=search]').fill('Mona');
  await page.locator('button.doc', { hasText: 'Mona Hassan' }).click();
  await expect(page.locator('button.doc')).toHaveText([
    /Dr\. Karim Adel\s*Internal Medicine/,
    /Dr\. Salma Nabil\s*Dermatology/,
    /Dr\. Dina Farouk\s*Pediatrics/,
  ]);
  await app.goTo('Patients');
  const phones = await page.locator('button.doc .sub').allInnerTexts();
  expect(phones.length).toBe(10);
  for (const p of phones) expect(p).toMatch(/^010\d{8} ·/);
  await page.locator('input[type=search]').fill('Ahmed');
  await expect(page.locator('button.doc')).toHaveCount(0);
  await app.goTo('Payments');
  await expect(page.locator('.cards3 .stat').first()).toContainText('EGP');
});
