import { expect, test } from './helpers';

test('A1 home shows today totals and a roster with time, patient, doctor, reason and two badges', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  await expect(page.locator('.cards3 .stat')).toHaveText([
    /9\s*Total patients today/,
    /2\s*Arrived & waiting/,
    /7\s*Remaining/,
  ]);
  const row = app.row('Hossam Tarek');
  await expect(row.locator('.time')).toHaveText('10:30');
  await expect(row).toContainText('Dr. Karim Adel');
  await expect(row).toContainText('Chest tightness check');
  await expect(row.locator('.badge')).toHaveText(['Arrived & waiting', 'Unpaid']);
  const rows = page.locator('button.tr');
  await expect(rows).toHaveCount(10);
  for (const r of await rows.all()) await expect(r.locator('.badge')).toHaveCount(2);
});

test('A2 rows open details; doctor, status and Needs attention filters work', async ({ app }) => {
  const { page } = app;
  await app.open('receptionist');
  const names = () => page.locator('button.tr b').allInnerTexts();

  await page.getByLabel('Doctor', { exact: true }).selectOption({ label: 'Dr. Dina Farouk' });
  expect(await names()).toEqual(['Omar Ibrahim', 'Yara Waleed']);
  await page.getByLabel('Doctor', { exact: true }).selectOption('all');

  await page.getByLabel('Status', { exact: true }).selectOption({ label: 'Needs call' });
  expect(await names()).toEqual(['Mahmoud Gaber']);
  await page.getByLabel('Status', { exact: true }).selectOption('all');

  await page.locator('.chip', { hasText: 'Needs attention' }).click();
  const attention = page.locator('button.tr');
  // Hossam Tarek, Farida Mostafa, Mahmoud Gaber, Mona Hassan.
  await expect(attention).toHaveCount(4);
  for (const r of await attention.all()) {
    const badges = await r.locator('.badge').allInnerTexts();
    expect(badges[0] === 'Needs call' || badges[1] === 'Unpaid', badges.join('+')).toBe(true);
    expect(['Cancelled', 'No show']).not.toContain(badges[0]);
  }
  await page.locator('.chip', { hasText: 'Needs attention' }).click();

  await app.openRow('Farida Mostafa');
  await expect(page.locator('.card').first()).toContainText('Skin rash');
});

test('F1 doctor home shows only their own patients by default', async ({ app }) => {
  const { page } = app;
  await app.open('doctor');
  await expect(page.getByLabel('Doctor', { exact: true })).toHaveValue('d1');
  const rows = page.locator('button.tr');
  await expect(rows).toHaveCount(5);
  for (const r of await rows.all()) await expect(r).toContainText('Dr. Karim Adel');
});
