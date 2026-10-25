import { addDays, dayLabel, expect, test } from './helpers';

/*
 * M — the full journey, one continuous story from reset data, run at phone
 * and desktop size. A screenshot per numbered step goes to
 * docs/audit-screenshots/<viewport>/.
 */
test('M full journey: register, remind, confirm, pay, consult, prescribe, return visit, Arabic', async ({
  app,
}) => {
  const { page } = app;
  const tomorrow = dayLabel('2026-10-25');

  // 1. Receptionist opens the dashboard.
  await app.open('receptionist');
  await expect(page.locator('h1', { hasText: 'Today' })).toBeVisible();
  await expect(page.locator('.cards3 .stat').first()).toContainText('Total patients today');
  await app.shot('01-dashboard');

  // 2. Register Ahmed Samir (penicillin allergy), book tomorrow 11:00 with Dr. Karim Adel.
  await app.newAppointment();
  await app.registerPatient({
    name: 'Ahmed Samir',
    phone: '01087654321',
    dob: '1990-05-14',
    gender: 'M',
    alerts: 'Penicillin allergy',
  });
  await app.button('Save and continue').click();
  await app.pickDoctor('Dr. Karim Adel');
  await app.pickSlot(tomorrow, '11:00');
  await app.saveAppointment('Persistent cough');
  const ahmedRow = app.row('Ahmed Samir');
  await expect(ahmedRow).toContainText('11:00');
  await expect(ahmedRow).toContainText('Dr. Karim Adel');
  await expect(ahmedRow).toContainText('Persistent cough');
  await expect(ahmedRow.locator('.badge')).toHaveText(['Scheduled', 'Unpaid']);
  await app.shot('02-booked-scheduled-unpaid');

  // 3. Advance to 24 hours before: reminder sent; simulated Confirm → Confirmed.
  await app.openRow('Ahmed Samir');
  await expect(page.getByTestId('demo-reminder-status')).toHaveText(
    'Reminder due Sat 24 Oct 11:00',
  );
  await app.demoClick('demo-jump-reminder');
  await expect(page.getByTestId('demo-clock')).toHaveText('Sat 24 Oct 11:00');
  await expect(page.getByTestId('demo-reminder-status')).toHaveText(
    'Reminder sent Sat 24 Oct 11:00',
  );
  await expect(page.locator('.card', { hasText: 'Reminder & call log' })).toContainText(
    'WhatsApp reminder sent 24 hours before (Confirm / Cancel).',
  );
  await app.demoClick('demo-reply-confirm');
  await expect(page.locator('.card .badges .badge').first()).toHaveText('Confirmed');
  await expect(page.locator('.card', { hasText: 'Reminder & call log' })).toContainText(
    'Patient replied: Confirm',
  );
  await app.shot('03-reminder-sent-confirmed');

  // 4. Second appointment, no reply past the cut-off → Needs call → Call list → Confirmed by phone.
  await app.button('Back').click();
  await app.rosterDay(tomorrow);
  await app.openRow('Farida Mostafa');
  await expect(page.locator('.card .badges .badge').first()).toHaveText('Scheduled');
  await app.demoClick('demo-no-reply');
  await expect(page.locator('.card .badges .badge').first()).toHaveText('Needs call');
  await expect(page.locator('.card', { hasText: 'Reminder & call log' })).toContainText(
    'No reply by the 3 h cut-off. Moved to the Call list.',
  );
  await app.goTo('Call list');
  const card = page.locator('.card', { hasText: 'Farida Mostafa' });
  await expect(card).toBeVisible();
  await app.shot('04a-call-list');
  await card.locator('.btn', { hasText: 'Confirmed by phone' }).click();
  await expect(card).toHaveCount(0);
  await app.goTo('Today');
  await app.rosterDay(tomorrow);
  await expect(app.row('Farida Mostafa').locator('.badge').first()).toHaveText('Confirmed');
  await expect(app.row('Ahmed Samir').locator('.badge').first()).toHaveText('Confirmed');
  await app.shot('04b-confirmed-by-phone');

  // 5. Advance to the appointment time; arrive; consultation blocked until paid; pay 900 EGP cash.
  await app.openRow('Ahmed Samir');
  await app.demoClick('demo-jump-appointment');
  await expect(page.getByTestId('demo-clock')).toHaveText('Sun 25 Oct 11:00');
  await app.button('Mark arrived').click();
  await expect(page.locator('.card .badges .badge').first()).toHaveText('Arrived & waiting');
  await expect(page.getByText('Payment required before the consultation')).toBeVisible();
  // The receptionist cannot start a consultation; check the gate from the doctor's side.
  await app.switchRole('doctor');
  await app.rosterDay('Sun 25 Oct');
  await app.openRow('Ahmed Samir');
  await expect(page.locator('.btn.p', { hasText: 'Start consultation' })).toBeDisabled();
  await expect(page.getByText('Payment required before the consultation')).toBeVisible();
  await app.shot('05a-consultation-blocked');
  await app.switchRole('receptionist');
  await app.rosterDay('Sun 25 Oct');
  await app.openRow('Ahmed Samir');
  await app.recordPayment('900', 'Cash');
  await expect(page.locator('.card .badges .badge').last()).toHaveText('Paid');
  await expect(
    page.locator('.card', { has: page.locator('h2', { hasText: /^Payment$/ }) }),
  ).toContainText('900 EGP · Cash');
  await expect(page.getByText('Payment required before the consultation')).toHaveCount(0);
  await app.shot('05b-paid');

  // 6. Doctor: dashboard, calendar, open Ahmed's appointment; penicillin warning visible.
  await app.switchRole('doctor');
  await expect(app.row('Ahmed Samir')).toBeVisible();
  await app.shot('06a-doctor-dashboard');
  await app.goTo('Calendar');
  await expect(page.locator('.tabs .chip.on', { hasText: 'Dr. Karim Adel' })).toBeVisible();
  const event = page.locator('.cal .ev', { hasText: 'Ahmed Samir' });
  await expect(event).toBeVisible();
  await app.shot('06b-doctor-calendar');
  await event.click();
  await expect(page.locator('.alert').first()).toContainText('Penicillin allergy');
  await expect(page.locator('.btn.p', { hasText: 'Start consultation' })).toBeEnabled();
  await app.shot('06c-appointment-allergy');

  // 7. Consultation, visit record, prescription with two medications, send, complete.
  await app.button('Start consultation').click();
  await app.button('Open visit record').click();
  await page.getByLabel('Complaint').fill('Persistent dry cough for 3 weeks, worse at night.');
  await page.getByLabel('Diagnosis').fill('Post-viral cough.');
  await page
    .getByLabel('Treatment')
    .fill('Antitussive at night, honey and warm fluids; review in 2 weeks.');
  await app.button('Add prescription').click();
  const meds = [
    ['Dextromethorphan syrup', '15 ml', 'At night', '7 days', 'Avoid driving'],
    ['Azithromycin', '500 mg', 'Once daily', '3 days', 'No penicillin'],
  ];
  for (const [i, med] of meds.entries()) {
    await app.button('Add medication').click();
    const inputs = page.locator('.rxr').nth(i).locator('input');
    for (const [j, value] of med.entries()) await inputs.nth(j).fill(value);
  }
  const preview = page.locator('.rxp');
  await expect(preview).toContainText('Nile Care Clinic');
  await expect(preview).toContainText('Ahmed Samir');
  await expect(preview).toContainText('Dr. Karim Adel');
  await expect(preview).toContainText('25 Oct 2026');
  await expect(preview).toContainText('Dextromethorphan syrup — 15 ml');
  await expect(preview).toContainText('Azithromycin — 500 mg');
  await app.button('Finalize and send via WhatsApp').click();
  const delivery = page.locator('.card', { hasText: 'Delivery status' }).locator('.badge');
  await expect(delivery).toHaveText('Sent', { timeout: 1000 });
  await expect(delivery).toHaveText('Delivered');
  await app.shot('07a-prescription-delivered');
  await app.button('Back').click();
  await app.button('Save and complete visit').click();
  await expect(page.locator('.toast')).toHaveText('Visit saved to history');

  // 8. Ahmed's file: visit and prescription on top; the receptionist sees no clinical text.
  await expect(page.locator('h1', { hasText: 'Ahmed Samir' })).toBeVisible();
  const top = page.locator('.tl .tli').first();
  await expect(top).toContainText('Post-viral cough.');
  await expect(top).toContainText('Prescription');
  await app.shot('08a-history-doctor');
  await app.switchRole('receptionist');
  await app.goTo('Patients');
  await page.locator('input[type=search]').fill('Ahmed');
  await page.locator('button.doc', { hasText: 'Ahmed Samir' }).click();
  await expect(page.getByText('Clinical notes visible to doctors only')).toBeVisible();
  await expect(page.locator('.tl .tli').first()).toContainText('Visit completed');
  expect(await page.content()).not.toContain('Post-viral cough');
  await app.shot('08b-history-receptionist-locked');

  // 9. Three months later: a new appointment; the doctor sees the previous visit and the allergy first.
  for (let i = 0; i < 3; i++) await app.demoClick('demo-plus-month');
  const today = await app.today();
  expect(today).toBe('2027-01-25');
  await app.button('New appointment').click();
  await app.pickDoctor('Dr. Karim Adel');
  const day = dayLabel(addDays(today, 1));
  const time = await app.pickFirstFreeSlot(day);
  await app.saveAppointment('Follow-up on cough');
  await app.switchRole('doctor');
  await app.rosterDay(day);
  const followUp = app.row('Ahmed Samir');
  await expect(followUp).toContainText(time);
  await expect(followUp.locator('.badge').first()).toHaveText('Scheduled');
  await app.openRow('Ahmed Samir');
  const history = page.locator('.card', {
    has: page.locator('h2', { hasText: 'Patient history' }),
  });
  await expect(history.locator('.alert')).toContainText('Penicillin allergy');
  const previous = history.locator('.tli').first();
  await expect(previous).toContainText('Persistent dry cough');
  await expect(previous).toContainText('Post-viral cough.');
  await expect(previous).toContainText('Antitussive at night');
  await expect(previous.locator('.badge', { hasText: 'Prescription' })).toBeVisible();
  await app.shot('09-return-visit-history');

  // 10. Arabic, right to left, no layout breakage.
  await expect(page.locator('.toast')).toHaveCount(0);
  await page.locator('header .btn.lang').click();
  await expect(page.locator('.app')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('h2', { hasText: 'تاريخ المريض' })).toBeVisible();
  await app.expectNoHorizontalScroll();
  await app.shot('10-arabic-rtl');
});
