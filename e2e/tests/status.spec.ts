import { expect, test } from './helpers';

/** K2: at most the two status badges per appointment, the same colour everywhere, none on patients. */
test('K2 two status badges per appointment, consistent colours, no patient status', async ({
  app,
}) => {
  const { page } = app;
  const seen = new Map<string, string>();
  const collect = async (selector: string) => {
    for (const b of await page.locator(selector).all()) {
      const text = (await b.innerText()).trim();
      const cls = await b.evaluate((el) => {
        const s = getComputedStyle(el);
        return `${s.backgroundColor} / ${s.color} / ${s.borderColor}`;
      });
      const prev = seen.get(text);
      expect(prev ?? cls, `badge "${text}"`).toBe(cls);
      seen.set(text, cls);
    }
  };
  await app.open('receptionist');
  for (const r of await page.locator('button.tr').all())
    await expect(r.locator('.badge')).toHaveCount(2);
  await collect('button.tr .badge');
  await app.openRow('Hossam Tarek');
  await expect(page.locator('.card').first().locator('.badges .badge')).toHaveCount(2);
  await collect('.badge');
  await app.goTo('Calendar');
  await collect('.cal .badge');
  for (const ev of await page.locator('.cal .ev').all())
    await expect(ev.locator('.badge')).toHaveCount(1);
  await page.locator('.chip', { hasText: 'Week' }).click();
  await collect('.week .badge');
  await app.goTo('Call list');
  await collect('.scr .badge');
  await app.goTo('Patients');
  await page.locator('input[type=search]').fill('Nourhan');
  await page.locator('button.doc', { hasText: 'Nourhan Adel' }).click();
  // The patient header carries no status of its own.
  await expect(page.locator('.split .card').first().locator('.badge')).toHaveCount(0);
  await collect('.split .badge');
  // Distinct statuses are told apart by colour.
  expect(seen.get('Needs call')).not.toBe(seen.get('Confirmed'));
  expect(seen.get('Paid')).not.toBe(seen.get('Unpaid'));
  expect(seen.size).toBeGreaterThanOrEqual(9);
});
