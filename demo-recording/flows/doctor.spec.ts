import { expect, test } from './helpers';

/* Doctor takes, signed in as Dr. Karim Abdelrahman (Internal Medicine). */

test('01 review history before the patient enters', async ({ director: d }) => {
  await d.open('doctor');
  await d.tap('button.tr', 'Ahmed Samir');
  await d.show('.alert', 'Penicillin');
  await d.tap('.btn.sm', 'Open patient file');
  await d.show('.tli', 'Acute tonsillitis');
  await d.tap('.chip', 'Edited');
  await d.beat(1500);
});

test('02 payment gate before the consultation', async ({ director: d, page }) => {
  await d.open('doctor');
  await d.tap('button.tr', 'Hossam Tarek');
  await expect(page.locator('.btn.p', { hasText: 'Start consultation' })).toBeDisabled();
  await d.show('.sub', 'Payment required');
  await d.beat(1200);
});

test('03 consultation, visit record and prescription', async ({ director: d, page }) => {
  await d.open('doctor');
  await d.tap('button.tr', 'Karim Nabil');
  await d.tap('.btn.p', 'Start consultation');
  await d.tap('.btn.p', 'Open visit record');
  await d.type('textarea >> nth=0', 'Lower back pain for 2 weeks after lifting boxes.');
  await d.type('textarea >> nth=1', 'Mechanical low back pain.');
  await d.type('textarea >> nth=2', 'Rest, heat, physiotherapy referral.');
  await d.tap('.btn.lg', 'Add prescription');
  await d.tap('.btn', 'Add medication');
  await d.type('.rxr input >> nth=0', 'Ibuprofen');
  await d.type('.rxr input >> nth=1', '400 mg');
  await d.type('.rxr input >> nth=2', 'Twice daily');
  await d.type('.rxr input >> nth=3', '5 days');
  await d.type('.rxr input >> nth=4', 'After meals');
  await d.tap('.btn.p.lg.full', 'Finalize and send');
  await expect(page.locator('.badge', { hasText: 'Sent' })).toBeVisible();
  await expect(page.locator('.badge', { hasText: 'Delivered' })).toBeVisible();
  await d.show('.wa');
  await d.tap('.btn.sm', 'Back');
  await d.tap('.btn.p.lg', 'Save and complete visit');
  await expect(page.locator('.tli').first()).toContainText('Mechanical low back pain');
  await d.beat(1500);
});

test('04 calendar day and week', async ({ director: d }) => {
  await d.open('doctor');
  await d.goTo('Calendar');
  await d.beat(1200);
  await d.tap('.chip', 'Week');
  await d.beat(1500);
});
