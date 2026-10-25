import { expect, test } from './helpers';

test('B1 search by name or phone shows live results', async ({ app }) => {
  const { page } = app;
  await app.open('receptionist');
  await app.goTo('Patients');
  const search = page.locator('input[type=search]');
  const results = page.locator('button.doc b');
  await search.fill('Mon');
  await expect(results).toHaveText(['Mona Hassan']);
  await search.fill('0101234');
  await expect(results).toHaveText(['Mona Hassan', 'Omar Ibrahim']);
  await search.fill('نورهان');
  await expect(results).toHaveText(['Nourhan Adel']);
  await search.fill('Ahmed Samir');
  await expect(results).toHaveCount(0);
});

test('B2 register a patient: phone required, optional fields, age computed and read-only', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  await app.newAppointment();
  const form = await app.registerPatient({ name: 'Laila Fathy', phone: '' });
  const save = form.locator('.btn.p');
  await expect(save).toBeDisabled();
  await form.locator('input[inputmode=tel]').fill('01099887766');
  await expect(save).toBeEnabled();
  const age = form.locator('label', { hasText: 'Age' }).locator('input');
  await expect(age).toHaveValue('—');
  await form.locator('input[type=date]').fill('2000-01-15');
  await expect(age).toHaveValue('26 yrs');
  await expect(age).toHaveAttribute('readonly', '');
  await form.locator('select').selectOption('F');
  await form.locator('label', { hasText: 'Address' }).locator('input').fill('Maadi, Cairo');
  await form.locator('label', { hasText: 'Allergies & alerts' }).locator('input').fill('Asthma');
  await save.click();
  await expect(page.locator('.toast')).toHaveText('Patient registered');
  await app.goTo('Patients');
  await page.locator('input[type=search]').fill('Laila');
  await page.locator('button.doc', { hasText: 'Laila Fathy' }).click();
  const file = page.locator('.split');
  await expect(file).toContainText('Female · 26 yrs');
  await expect(file).toContainText('01099887766');
  await expect(file).toContainText('15 Jan 2000');
  await expect(file).toContainText('Maadi, Cairo');
  await expect(file.locator('.alert')).toContainText('Asthma');
});

test('B3 a phone number already on file warns but still saves another patient', async ({ app }) => {
  const { page } = app;
  await app.open('receptionist');
  await app.newAppointment();
  const form = await app.registerPatient({ name: 'Laila Hassan', phone: '01012345678' });
  await expect(form.locator('.alert')).toHaveText(
    'This number is already linked to Mona Hassan, Omar Ibrahim. Add as another patient?',
  );
  await form.locator('.btn.p', { hasText: 'Add as another patient' }).click();
  await expect(page.locator('.toast')).toHaveText('Patient registered');
  await app.goTo('Patients');
  await page.locator('input[type=search]').fill('01012345678');
  await expect(page.locator('button.doc b')).toHaveText([
    'Mona Hassan',
    'Omar Ibrahim',
    'Laila Hassan',
  ]);
  await page.locator('button.doc', { hasText: 'Laila Hassan' }).click();
  await expect(page.locator('.split')).toContainText('Mona Hassan, Omar Ibrahim');
});

test('B4 allergies live on the patient file, are editable, and are not on the appointment form', async ({
  app,
}) => {
  const { page } = app;
  await app.open('receptionist');
  await app.goTo('Patients');
  await page.locator('input[type=search]').fill('Mona');
  await page.locator('button.doc', { hasText: 'Mona Hassan' }).click();
  await expect(page.locator('.locked', { hasText: 'None recorded' })).toBeVisible();
  await page.locator('.btn.sm', { hasText: 'Edit' }).click();
  await page
    .locator('.sheet label', { hasText: 'Allergies & alerts' })
    .locator('input')
    .fill('Latex allergy');
  await page.locator('.sheet .btn.p').click();
  await expect(page.locator('.split .alert')).toContainText('Latex allergy');
  // Book for her: the appointment details step has no allergy field.
  await page.locator('.btn.p', { hasText: 'New appointment' }).click();
  await app.pickDoctor('Dr. Karim Adel');
  await app.pickSlot('Sun 25 Oct', '12:00');
  const details = page.locator('.card', {
    has: page.locator('h2', { hasText: 'Appointment details' }),
  });
  await expect(details.locator('.lbl')).toHaveCount(4);
  await expect(details).not.toContainText('Allergies');
  await app.saveAppointment('Check-up');
  await app.rosterDay('Sun 25 Oct');
  await app.openRow('Mona Hassan');
  // The appointment shows the alert read from the patient file.
  await expect(page.locator('.alert').first()).toContainText('Latex allergy');
});
