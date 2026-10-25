import type { App } from './helpers';
import { expect, test } from './helpers';

const status = (app: App) => app.page.locator('.card .badges .badge');

test('E1 Mark arrived sets Arrived & waiting', async ({ app }) => {
  await app.open('receptionist');
  await app.openRow('Farida Mostafa');
  await app.button('Mark arrived').click();
  await expect(status(app)).toHaveText(['Arrived & waiting', 'Unpaid']);
});

test('E2 Start consultation is blocked while Unpaid, unlocks when paid; admin override needs a logged reason', async ({
  app,
}) => {
  const { page } = app;
  await app.open('doctor');
  await app.openRow('Hossam Tarek');
  const start = page.locator('.btn.p', { hasText: 'Start consultation' });
  await expect(start).toBeDisabled();
  await expect(page.getByText('Payment required before the consultation')).toBeVisible();
  // Covered by package unlocks it too (Nourhan Adel is a package patient).
  await app.switchRole('receptionist');
  await app.openRow('Nourhan Adel');
  await app.button('Mark arrived').click();
  await app.switchRole('doctor');
  await page.getByLabel('Doctor', { exact: true }).selectOption('all');
  await app.openRow('Nourhan Adel');
  await expect(start).toBeEnabled();

  // Admin override on Hossam.
  await app.switchRole('admin');
  await app.openRow('Hossam Tarek');
  await app.button('Override').click();
  const confirm = page.locator('.sheet .btn.p');
  await expect(confirm).toBeDisabled();
  await page.locator('.sheet textarea').fill('Emergency, family will pay after');
  await confirm.click();
  await expect(status(app).first()).toHaveText('In consultation');
  await app.goTo('Audit log');
  await expect(page.locator('.scr .card .row').first()).toContainText(
    'Admin overrode the payment rule (Hossam Tarek, reason: Emergency, family will pay after)',
  );
  await expect(page.locator('.scr .card .row').first()).toContainText('2026-10-24 10:15');
});

test('E3 single-visit payment: amount in EGP and method sets Paid', async ({ app }) => {
  const { page } = app;
  await app.open('receptionist');
  await app.openRow('Hossam Tarek');
  await page.locator('.card .btn.p', { hasText: 'Record payment' }).click();
  await expect(page.locator('.sheet input[inputmode=numeric]')).toHaveValue('400');
  await expect(page.locator('.sheet .chip')).toHaveText(['Cash', 'Card', 'Transfer']);
  await page.locator('.sheet .btn.p').click();
  await expect(status(app)).toHaveText(['Arrived & waiting', 'Paid']);
  await app.button('Back').click();
  await app.openRow('Farida Mostafa');
  await app.recordPayment('450', 'Transfer');
  await expect(
    page.locator('.card', { has: page.locator('h2', { hasText: /^Payment$/ }) }),
  ).toContainText('450 EGP · Transfer');
});

test('E4 packages: create with price, visits, expiry, notes; used/remaining shown; applying sets Covered by package', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  await app.goTo('Payments');
  await page.locator('.chip', { hasText: 'Packages' }).click();
  const nourhan = page.locator('.tli', { hasText: 'Nourhan Adel' });
  await expect(nourhan).toContainText('8,000 EGP · 10 visits');
  await expect(nourhan).toContainText('7 left');
  await expect(nourhan).toContainText('3 used');
  await page.locator('.btn.p', { hasText: 'New package' }).click();
  const sheet = page.locator('.sheet');
  await sheet.locator('select').selectOption({ label: 'Mona Hassan' });
  await sheet.locator('label', { hasText: 'Total price' }).locator('input').fill('3000');
  await sheet.locator('label', { hasText: 'Number of visits' }).locator('input').fill('5');
  await sheet.locator('input[type=date]').fill('2027-04-30');
  await sheet.locator('label', { hasText: 'Notes' }).locator('input').fill('Migraine follow-ups');
  await sheet.locator('.btn.p').click();
  await expect(page.locator('.toast')).toHaveText('Package created');
  const mona = page.locator('.tli', { hasText: 'Mona Hassan' });
  await expect(mona).toContainText('3,000 EGP · 5 visits');
  await expect(mona).toContainText('Expires 30 Apr 2027');
  await expect(mona).toContainText('5 left');
  await app.goTo('Today');
  await app.openRow('Mona Hassan');
  await app.button('Apply package visit (5)').click();
  await expect(status(app)).toHaveText(['Scheduled', 'Covered by package']);
});

test('E5 a package visit is consumed on Completed only, not on cancel or no-show; adjustments need a reason and are audited', async ({
  app,
}) => {
  const { page } = app;
  const left = async () => {
    await app.goTo('Payments');
    await page.locator('.chip', { hasText: 'Packages' }).click();
    return page.locator('.tli', { hasText: 'Nourhan Adel' });
  };
  await app.open('admin');
  // Cancel: book tomorrow covered by package, cancel it.
  await app.newAppointment();
  await page.locator('input[type=search]').fill('Nourhan');
  await page.locator('button.doc', { hasText: 'Nourhan Adel' }).click();
  await app.pickDoctor('Dr. Salma Nabil');
  await app.pickSlot('Sun 25 Oct', '12:00');
  await app.saveAppointment('Peel');
  await app.openRow('Nourhan Adel');
  await app.button(/^Cancel$/).click();
  await page.locator('.sheet .btn.d').click();
  await expect(status(app).first()).toHaveText('Cancelled');
  await expect(await left()).toContainText('7 left');
  // No-show: today's 10:00 appointment, after the slot and grace period.
  await app.goTo('Today');
  await app.rosterDay('Today');
  await app.openRow('Nourhan Adel');
  await expect(page.getByText('Slot time has passed. Suggest marking No show.')).toBeVisible();
  // Completed consumes one visit.
  await app.button('Mark arrived').click();
  await app.button('Start consultation').click();
  await app.button('Mark completed').click();
  await expect(status(app)).toHaveText(['Completed', 'Covered by package']);
  await expect(await left()).toContainText('6 left');
  // Manual adjustment.
  const pkg = await left();
  await pkg.locator('.btn', { hasText: 'Manual adjustment' }).click();
  const save = page.locator('.sheet .btn.p');
  await expect(save).toBeDisabled();
  await page.locator('.sheet input').fill('Goodwill visit');
  await save.click();
  await expect(pkg).toContainText('7 left');
  await expect(pkg).toContainText('11 visits');
  await app.goTo('Audit log');
  await expect(page.locator('.scr .card .row').first()).toContainText(
    'adjusted a package for Nourhan Adel (Add one visit, reason: Goodwill visit)',
  );
});

test('E5 a no-show does not consume a package visit', async ({ app }) => {
  const { page } = app;
  await app.open('receptionist');
  await app.openRow('Nourhan Adel');
  await app.button('Mark no-show').click();
  await expect(status(app)).toHaveText(['No show', 'Covered by package']);
  await app.goTo('Payments');
  await page.locator('.chip', { hasText: 'Packages' }).click();
  await expect(page.locator('.tli', { hasText: 'Nourhan Adel' })).toContainText('7 left');
});

test('E6 daily cash summary: totals by method, visit count and package sales', async ({ app }) => {
  const { page } = app;
  await app.open('receptionist');
  await app.goTo('Payments');
  const stats = page.locator('.cards3 .stat');
  await expect(stats).toHaveText([
    /1,150 EGP\s*Total collected today/,
    /400 EGP\s*Cash/,
    /350 EGP\s*Card/,
    /400 EGP\s*Transfer/,
    /4\s*Visits/,
    /0 EGP\s*Package sales/,
  ]);
  await page.locator('.card select').selectOption({ label: '10:30 · Hossam Tarek' });
  await page.locator('.card .chip', { hasText: 'Cash' }).click();
  await page.locator('.split .btn.p', { hasText: 'Save' }).click();
  await page.locator('.chip', { hasText: 'Packages' }).click();
  await page.locator('.btn.p', { hasText: 'New package' }).click();
  await page.locator('.sheet .btn.p').click();
  await expect(stats.nth(0)).toContainText('9,550 EGP');
  await expect(stats.nth(1)).toContainText('8,800 EGP');
  await expect(stats.nth(5)).toContainText('8,000 EGP');
});
