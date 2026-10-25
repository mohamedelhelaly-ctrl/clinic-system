import type { App } from './helpers';
import { expect, test } from './helpers';

async function startVisit(app: App, patient: string) {
  await app.openRow(patient);
  await app.button('Start consultation').click();
  await app.button('Open visit record').click();
}
async function fillVisit(app: App, complaint: string, diagnosis: string, treatment: string) {
  await app.page.getByLabel('Complaint').fill(complaint);
  await app.page.getByLabel('Diagnosis').fill(diagnosis);
  await app.page.getByLabel('Treatment').fill(treatment);
}

test('F2 calendar day and week view per doctor; reception can switch doctors', async ({ app }) => {
  const { page } = app;
  await app.open('receptionist');
  await app.goTo('Calendar');
  await expect(page.locator('.tabs .chip.on', { hasText: 'Dr. Karim Adel' })).toBeVisible();
  await expect(page.locator('.cal .ev', { hasText: 'Sherif Mansour' })).toContainText('Completed');
  await expect(page.locator('.cal .h').first()).toHaveText('09:00');
  await page.locator('.tabs .chip', { hasText: 'Dr. Salma Nabil' }).click();
  await expect(page.locator('.cal .ev', { hasText: 'Nourhan Adel' })).toBeVisible();
  await expect(page.locator('.cal .h').first()).toHaveText('10:00');
  await page.locator('.chip', { hasText: 'Week' }).click();
  const days = page.locator('.week > .card');
  await expect(days).toHaveCount(6);
  await expect(days.nth(1)).toContainText('Sun 25 Oct');
  await expect(days.nth(1)).toContainText('Farida Mostafa');
  await page.locator('.tabs .chip', { hasText: 'Dr. Dina Farouk' }).click();
  await expect(days.nth(2)).toContainText('Mon 26 Oct');
  await days.nth(0).locator('.ev', { hasText: 'Omar Ibrahim' }).click();
  await expect(page.locator('h1', { hasText: 'Omar Ibrahim' })).toBeVisible();
});

test('F3 appointment details show patient info, reason and the allergy from the patient file', async ({
  app,
}) => {
  const { page } = app;
  await app.open('doctor');
  await app.openRow('Sherif Mansour');
  const card = page.locator('.card').first();
  await expect(card).toContainText('01023456789');
  await expect(card).toContainText('54 yrs');
  await expect(card).toContainText('Dr. Karim Adel');
  await expect(card).toContainText('Hypertension follow-up');
  await expect(card.locator('.alert')).toContainText('Penicillin allergy (urticaria, 2026)');
});

test('F4 the history panel pins allergies and lists past visits newest first', async ({ app }) => {
  const { page } = app;
  await app.open('doctor');
  await app.openRow('Sherif Mansour');
  const panel = page.locator('.card', { has: page.locator('h2', { hasText: 'Patient history' }) });
  await expect(panel.locator('> :nth-child(2)')).toHaveClass(/alert/);
  await expect(panel.locator('.alert')).toContainText('Penicillin');
  const dates = await panel.locator('.tli .row.sb b').allInnerTexts();
  expect(dates.length).toBe(4);
  const times = dates.map((d) => Date.parse(d.replace('Sept', 'Sep')));
  expect([...times].sort((a, b) => b - a)).toEqual(times);
});

test('G1 three text boxes; Save draft keeps the draft; Save and complete works', async ({
  app,
}) => {
  const { page } = app;
  await app.open('doctor');
  await startVisit(app, 'Karim Nabil');
  await expect(page.locator('.split > .card textarea')).toHaveCount(3);
  await fillVisit(app, 'Lower back pain for 2 weeks.', 'Mechanical low back pain.', 'Rest, heat.');
  await app.button('Save draft').click();
  await expect(page.locator('.toast')).toHaveText('Draft saved');
  await app.button('Back').click();
  await app.button('Open visit record').click();
  await expect(page.getByLabel('Diagnosis')).toHaveValue('Mechanical low back pain.');
  await app.button('Save and complete visit').click();
  await expect(page.locator('.toast')).toHaveText('Visit saved to history');
});

test('G2 completing sets Completed and saves the visit permanently to the history', async ({
  app,
}) => {
  const { page } = app;
  await app.open('doctor');
  await startVisit(app, 'Karim Nabil');
  await fillVisit(app, 'Back pain.', 'Lumbar strain.', 'Physiotherapy.');
  await app.button('Save and complete visit').click();
  await expect(page.locator('h1', { hasText: 'Karim Nabil' })).toBeVisible();
  await expect(page.locator('.tl .tli').first()).toContainText('Lumbar strain.');
  await page.reload();
  await page.locator('.app .main').waitFor();
  await expect(app.row('Karim Nabil').locator('.badge').first()).toHaveText('Completed');
  await app.goTo('Patients');
  await page.locator('input[type=search]').fill('Karim Nabil');
  await page.locator('button.doc', { hasText: 'Karim Nabil' }).click();
  await expect(page.locator('.tl .tli').first()).toContainText('Lumbar strain.');
});

test('G3 editing a saved visit record keeps a revision history (who, when) and is audited', async ({
  app,
}) => {
  const { page } = app;
  await app.open('admin');
  await app.goTo('Patients');
  await page.locator('input[type=search]').fill('Sherif');
  await page.locator('button.doc', { hasText: 'Sherif Mansour' }).click();
  const first = page.locator('.tl .tli').first();
  await first.locator('.chip', { hasText: /^Edit$/ }).click();
  await expect(page.locator('h1', { hasText: 'Edit visit record' })).toBeVisible();
  await expect(page.getByLabel('Diagnosis')).toHaveValue(
    'Essential hypertension, partially controlled.',
  );
  await expect(app.button('Save and complete visit')).toHaveCount(0);
  await page.getByLabel('Diagnosis').fill('Essential hypertension, controlled on amlodipine.');
  await app.button('Save changes').click();
  await expect(page.locator('.toast')).toHaveText('Saved');
  await expect(first).toContainText('Essential hypertension, controlled on amlodipine.');
  await first.locator('.chip', { hasText: 'Edited' }).click();
  await expect(first).toContainText('Edited by Dr. Karim · 2026-10-24 10:15');
  await app.goTo('Audit log');
  await expect(page.locator('.scr .card .row').first()).toContainText(
    'Admin edited a visit record (Sherif Mansour, 24 Oct 2026)',
  );
});

test('H1 medication rows and a preview with clinic, doctor, patient, date and medications', async ({
  app,
}) => {
  const { page } = app;
  await app.open('doctor');
  await startVisit(app, 'Karim Nabil');
  await app.button('Add prescription').click();
  await app.button('Add medication').click();
  const labels = (await page.locator('.rxr').first().locator('.lbl').allInnerTexts()).map((l) =>
    l.trim(),
  );
  expect(labels).toEqual(['Drug', 'Dose', 'Frequency', 'Duration', 'Instructions']);
  const inputs = page.locator('.rxr').first().locator('input');
  for (const [i, v] of ['Ibuprofen', '400 mg', 'Twice daily', '5 days', 'After meals'].entries()) {
    await inputs.nth(i).fill(v);
  }
  const preview = page.locator('.rxp');
  await expect(preview).toContainText('Nile Care Clinic');
  await expect(preview).toContainText('24 Oct 2026');
  await expect(preview).toContainText('Karim Nabil');
  await expect(preview).toContainText('Dr. Karim Adel');
  await expect(preview).toContainText('Ibuprofen — 400 mg');
  await expect(preview).toContainText('Twice daily · 5 days · After meals');
});

test('H2 send via WhatsApp shows Sent then Delivered; simulated failure shows Failed; Resend works', async ({
  app,
}) => {
  const { page } = app;
  await app.open('doctor');
  await startVisit(app, 'Karim Nabil');
  await app.button('Add prescription').click();
  await app.button('Add medication').click();
  await page.locator('.rxr input').first().fill('Paracetamol');
  await app.button('Finalize and send via WhatsApp').click();
  const badge = page.locator('.card', { hasText: 'Delivery status' }).locator('.badge');
  await expect(badge).toHaveText('Sent', { timeout: 1000 });
  await expect(badge).toHaveText('Delivered');
  await expect(page.locator('.wa')).toContainText('WhatsApp · 01066554433');
  await page.getByRole('button', { name: 'Demo: mark Failed' }).click();
  await expect(badge).toHaveText('Failed');
  await app.button('Resend').click();
  await expect(badge).toHaveText('Sent', { timeout: 1000 });
  await expect(badge).toHaveText('Delivered');
});

test('H3 the prescription is stored under the visit in the patient history', async ({ app }) => {
  const { page } = app;
  await app.open('doctor');
  await startVisit(app, 'Karim Nabil');
  await fillVisit(app, 'Headache.', 'Tension headache.', 'Analgesia.');
  await app.button('Add prescription').click();
  await app.button('Add medication').click();
  await page.locator('.rxr input').first().fill('Paracetamol');
  await app.button('Back').click();
  await expect(app.button('Prescription (1)')).toBeVisible();
  await app.button('Save and complete visit').click();
  const top = page.locator('.tl .tli').first();
  await expect(top).toContainText('Tension headache.');
  await expect(top.locator('.badge', { hasText: 'Prescription' })).toBeVisible();
});
