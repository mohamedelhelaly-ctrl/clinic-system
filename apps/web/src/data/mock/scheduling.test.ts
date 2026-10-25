import { describe, expect, it } from 'vitest';
import type { Clock, IsoDateTime } from '../../domain';
import { createSeed } from '../../demo/seed';
import { MockClinicRepository } from './MockClinicRepository';
import { MockPrescriptionRenderer, MockWhatsAppProvider } from './mockServices';
import { memorySnapshotStorage } from './storage';

const rec = { userId: 'u-nour', role: 'receptionist' } as const;
const doc = { userId: 'u-karim', role: 'doctor' } as const;

function makeRepo(start: IsoDateTime = '2026-10-24T10:15') {
  let now = start;
  const clock: Clock = { now: () => now, today: () => now.slice(0, 10), time: () => now.slice(11) };
  const repo = new MockClinicRepository({
    seed: createSeed,
    clock,
    storage: memorySnapshotStorage(),
    whatsapp: new MockWhatsAppProvider(),
    renderer: new MockPrescriptionRenderer(),
  });
  const moveTo = async (t: IsoDateTime) => {
    now = t;
    await repo.demo.runScheduledJobs();
  };
  return { repo, moveTo };
}
const appt = (r: MockClinicRepository, id: string) =>
  r.getSnapshot().appointments.find((a) => a.id === id)!;
const reminderOf = (r: MockClinicRepository, id: string) =>
  r.getSnapshot().messages.find((m) => m.type === 'reminder' && m.appointmentId === id)!;
const book = (r: MockClinicRepository, date: string, time: string, patientId = 'p5') =>
  r.bookAppointment(rec, { patientId, doctorId: 'd1', date, time, reason: { value: 'Cough' } });

describe('seed (per the brief)', () => {
  it('has the three named doctors and no Ahmed Samir', () => {
    const s = createSeed();
    expect(s.doctors.map((d) => [d.name.value, d.specialty.value])).toEqual([
      ['Dr. Karim Adel', 'Internal Medicine'],
      ['Dr. Salma Nabil', 'Dermatology'],
      ['Dr. Dina Farouk', 'Pediatrics'],
    ]);
    expect(JSON.stringify(s)).not.toContain('Ahmed Samir');
  });
  it('has a penicillin patient with several past visits and an 8000 EGP / 10-visit package with 7 left', () => {
    const s = createSeed();
    const allergic = s.patients.find((p) => /penicillin/i.test(p.allergiesAndAlerts.value))!;
    expect(s.visitRecords.filter((v) => v.patientId === allergic.id).length).toBeGreaterThan(2);
    expect(s.packages).toEqual([
      expect.objectContaining({ totalPrice: 8000, totalVisits: 10, visitsUsed: 3 }),
    ]);
  });
});

describe('scheduler: 24 h reminder and cut-off', () => {
  it('sends the reminder at its time, then moves to Needs call at the cut-off without a reply', async () => {
    const { repo, moveTo } = makeRepo();
    const a = await book(repo, '2026-10-25', '11:00');
    expect(reminderOf(repo, a.id)).toMatchObject({
      status: 'queued',
      scheduledFor: '2026-10-24T11:00',
    });
    await moveTo('2026-10-24T10:59');
    expect(reminderOf(repo, a.id).status).toBe('queued');
    await moveTo('2026-10-24T11:00');
    expect(reminderOf(repo, a.id)).toMatchObject({ status: 'sent', sentAt: '2026-10-24T11:00' });
    await moveTo('2026-10-25T07:59');
    expect(appt(repo, a.id).status).toBe('scheduled');
    await moveTo('2026-10-25T08:00');
    expect(appt(repo, a.id).status).toBe('needs_call');
    expect(
      repo
        .getSnapshot()
        .appointmentEvents.some((e) => e.appointmentId === a.id && e.kind === 'moved_to_call_list'),
    ).toBe(true);
  });

  it('applies Confirm and Cancel replies; Cancel frees the slot', async () => {
    const { repo, moveTo } = makeRepo();
    const a = await book(repo, '2026-10-25', '11:00');
    const b = await book(repo, '2026-10-25', '11:30', 'p6');
    await expect(repo.demo.simulatePatientReply(a.id, 'confirm')).rejects.toThrow(
      'no_reminder_sent',
    );
    await moveTo('2026-10-24T11:30');
    await repo.demo.simulatePatientReply(a.id, 'confirm');
    expect(appt(repo, a.id).status).toBe('confirmed');
    expect(reminderOf(repo, a.id).replies).toEqual([{ reply: 'confirm', at: '2026-10-24T11:30' }]);
    await repo.demo.simulatePatientReply(b.id, 'cancel');
    expect(appt(repo, b.id)).toMatchObject({
      status: 'cancelled',
      cancellation: { source: 'patient_whatsapp' },
    });
    // The freed slot can be booked again.
    await expect(book(repo, '2026-10-25', '11:30', 'p7')).resolves.toBeTruthy();
    // A confirmed appointment is not moved at the cut-off.
    await moveTo('2026-10-25T09:00');
    expect(appt(repo, a.id).status).toBe('confirmed');
  });

  it('gives appointments booked less than 24 h ahead no reminder; they stay Scheduled', async () => {
    const { repo, moveTo } = makeRepo();
    const a = await book(repo, '2026-10-24', '14:00');
    expect(reminderOf(repo, a.id)).toBeUndefined();
    await moveTo('2026-10-24T13:59');
    expect(appt(repo, a.id).status).toBe('scheduled');
    await repo.changeAppointmentStatus(rec, a.id, 'confirmed');
    expect(appt(repo, a.id).status).toBe('confirmed');
  });
});

describe('double booking', () => {
  it('rejects a second booking of a taken slot, also on reschedule', async () => {
    const { repo } = makeRepo();
    await book(repo, '2026-10-25', '11:00');
    await expect(book(repo, '2026-10-25', '11:00', 'p6')).rejects.toThrow('slot_taken');
    await expect(
      repo.rescheduleAppointment(rec, 'a7', { date: '2026-10-25', time: '11:00' }),
    ).rejects.toThrow('slot_taken');
  });
});

describe('clinical content by role', () => {
  it('the receptionist view carries no complaint, diagnosis, treatment, revisions or medications', () => {
    const { repo } = makeRepo();
    const view = repo.getSnapshotFor('receptionist');
    const text = JSON.stringify(view);
    expect(text).not.toContain('Essential hypertension');
    expect(text).not.toContain('Amlodipine');
    expect(view.visitRecords.every((v) => !v.complaint && !v.diagnosis && !v.treatment)).toBe(true);
    expect(view.visitRecordRevisions).toEqual([]);
    expect(view.prescriptions.every((p) => p.items.length === 0)).toBe(true);
    // Doctors and admins get everything.
    expect(JSON.stringify(repo.getSnapshotFor('doctor'))).toContain('Essential hypertension');
    expect(JSON.stringify(repo.getSnapshotFor('admin'))).toContain('Amlodipine');
  });
  it('returns a stable view until the data changes', async () => {
    const { repo } = makeRepo();
    const first = repo.getSnapshotFor('receptionist');
    expect(repo.getSnapshotFor('receptionist')).toBe(first);
    await repo.recordPayment(rec, 'a4', { amount: 400, method: 'cash' });
    expect(repo.getSnapshotFor('receptionist')).not.toBe(first);
  });
});

describe('visit record edits', () => {
  it('keep the previous values as a revision and write the audit log', async () => {
    const { repo } = makeRepo();
    const before = repo.getSnapshot().visitRecords.find((v) => v.id === 'v1')!;
    await repo.editVisitRecord(doc, 'v1', { ...before, diagnosis: 'Controlled hypertension.' });
    const s = repo.getSnapshot();
    expect(s.visitRecords.find((v) => v.id === 'v1')!.diagnosis).toBe('Controlled hypertension.');
    expect(s.visitRecordRevisions.at(-1)).toMatchObject({
      visitRecordId: 'v1',
      editedBy: 'u-karim',
      editedAt: '2026-10-24T10:15',
      diagnosis: before.diagnosis,
    });
    expect(s.auditLog[0]).toMatchObject({ action: 'visit_record.edited', entityId: 'v1' });
  });
  it('are refused for receptionists', async () => {
    const { repo } = makeRepo();
    await expect(
      repo.editVisitRecord(rec, 'v1', { complaint: 'x', diagnosis: 'y', treatment: 'z' }),
    ).rejects.toThrow('forbidden');
  });
});

describe('clinic profile', () => {
  it('saves and is audited', async () => {
    const { repo } = makeRepo();
    await repo.updateClinicProfile(doc, {
      name: { value: 'Nile Care Clinic Heliopolis' },
      address: { value: '1 Street' },
      phone: '0222222222',
    });
    expect(repo.getSnapshot().clinic.name.value).toBe('Nile Care Clinic Heliopolis');
    expect(repo.getSnapshot().auditLog[0]!.action).toBe('clinic.edited');
  });
});

describe('seed is consistent with the time rules', () => {
  it('keeps every required status combination after the scheduler runs at demo start', async () => {
    const { repo } = makeRepo();
    await repo.demo.runScheduledJobs();
    const combos = repo
      .getSnapshot()
      .appointments.filter((a) => a.date === '2026-10-24')
      .map((a) => `${a.status}+${a.paymentStatus}`);
    expect(combos.sort()).toEqual(
      [
        'scheduled+unpaid',
        'needs_call+unpaid',
        'confirmed+unpaid',
        'confirmed+package',
        'arrived+unpaid',
        'arrived+paid',
        'in_consultation+paid',
        'completed+paid',
        'no_show+unpaid',
        'cancelled+unpaid',
      ].sort(),
    );
  });
});
