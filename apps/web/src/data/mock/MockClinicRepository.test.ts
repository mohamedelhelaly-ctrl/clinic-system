import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSeed } from '../../demo/seed';
import { fixedClock } from '../../demo/fixedClock';
import { MockClinicRepository } from './MockClinicRepository';
import {
  MOCK_DELIVERY_DELAY_MS,
  MockPrescriptionRenderer,
  MockWhatsAppProvider,
} from './mockServices';
import { memorySnapshotStorage } from './storage';

const rec = { userId: 'u-nour', role: 'receptionist' } as const;
const doc = { userId: 'u-karim', role: 'doctor' } as const;
const admin = { userId: 'u-karim', role: 'admin' } as const;

function makeRepo() {
  return new MockClinicRepository({
    seed: createSeed,
    clock: fixedClock,
    storage: memorySnapshotStorage(),
    whatsapp: new MockWhatsAppProvider(),
    renderer: new MockPrescriptionRenderer(),
  });
}
const appt = (r: MockClinicRepository, id: string) =>
  r.getSnapshot().appointments.find((a) => a.id === id)!;

afterEach(() => vi.useRealTimers());

describe('seed', () => {
  it('covers the required status combinations for today', () => {
    const today = makeRepo()
      .getSnapshot()
      .appointments.filter((a) => a.date === '2026-10-24');
    const combos = today.map((a) => `${a.status}+${a.paymentStatus}`);
    expect(combos).toEqual(
      expect.arrayContaining([
        'scheduled+unpaid',
        'needs_call+unpaid',
        'confirmed+unpaid',
        'arrived+unpaid',
        'arrived+paid',
        'in_consultation+paid',
        'completed+paid',
        'no_show+unpaid',
        'cancelled+unpaid',
      ]),
    );
  });
  it('uses fictional 010 numbers and one shared family phone', () => {
    const patients = makeRepo().getSnapshot().patients;
    expect(patients.every((p) => /^010\d{8}$/.test(p.phone))).toBe(true);
    expect(patients.filter((p) => p.phone === '01012345678')).toHaveLength(2);
  });
  it('stamps every record with the clinic id', () => {
    const s = makeRepo().getSnapshot();
    const rows = [
      ...s.patients,
      ...s.appointments,
      ...s.visitRecords,
      ...s.payments,
      ...s.packages,
      ...s.messages,
      ...s.calls,
      ...s.auditLog,
    ];
    expect(rows.every((r) => r.clinicId === 'clinic-nile')).toBe(true);
  });
});

describe('MockClinicRepository', () => {
  it('blocks the consultation until paid, then allows it', async () => {
    const r = makeRepo();
    await expect(r.changeAppointmentStatus(doc, 'a4', 'in_consultation')).rejects.toThrow(
      'payment_required',
    );
    await r.recordPayment(rec, 'a4', { amount: 400, method: 'cash' });
    expect(appt(r, 'a4').paymentStatus).toBe('paid');
    await r.changeAppointmentStatus(doc, 'a4', 'in_consultation');
    expect(appt(r, 'a4').status).toBe('in_consultation');
  });

  it('lets an admin override the payment gate and audits it', async () => {
    const r = makeRepo();
    await r.changeAppointmentStatus(admin, 'a4', 'in_consultation', {
      override: { reason: 'Insurance letter' },
    });
    expect(appt(r, 'a4').status).toBe('in_consultation');
    expect(r.getSnapshot().auditLog[0]!.action).toBe('payment.gate_overridden');
  });

  it('consumes a package visit only on completion', async () => {
    const r = makeRepo();
    const left = () =>
      r.getSnapshot().packages[0]!.totalVisits - r.getSnapshot().packages[0]!.visitsUsed;
    expect(left()).toBe(7);
    await r.changeAppointmentStatus(rec, 'a3', 'arrived');
    await r.changeAppointmentStatus(doc, 'a3', 'in_consultation');
    expect(left()).toBe(7);
    await r.completeVisit(doc, 'a3', {
      fields: { complaint: 'x', diagnosis: 'y', treatment: 'z' },
      items: [],
    });
    expect(left()).toBe(6);
    expect(appt(r, 'a3').status).toBe('completed');
  });

  it('books with "Covered by package" when the patient has one, and walk-ins arrive immediately', async () => {
    const r = makeRepo();
    const booked = await r.bookAppointment(rec, {
      patientId: 'p4',
      doctorId: 'd2',
      date: '2026-10-25',
      time: '11:00',
      reason: { value: 'Follow-up' },
    });
    expect(booked).toMatchObject({ status: 'scheduled', paymentStatus: 'package' });
    expect(
      r.getSnapshot().messages.some((m) => m.appointmentId === booked.id && m.status === 'queued'),
    ).toBe(true);
    const walkIn = await r.bookAppointment(rec, {
      patientId: 'p1',
      doctorId: 'd1',
      date: '2026-10-24',
      time: null,
      reason: { value: 'Pain' },
    });
    expect(walkIn).toMatchObject({ status: 'arrived', paymentStatus: 'unpaid' });
  });

  it('reschedules by cancelling the old appointment and creating a new one', async () => {
    const r = makeRepo();
    const next = await r.rescheduleAppointment(rec, 'a7', { date: '2026-10-25', time: '13:00' });
    expect(appt(r, 'a7')).toMatchObject({
      status: 'cancelled',
      cancellation: { source: 'rescheduled' },
    });
    expect(next).toMatchObject({ status: 'scheduled', rescheduledFromId: 'a7' });
  });

  it('logs call outcomes in the call log, not in a status', async () => {
    const r = makeRepo();
    await r.logCall(rec, 'a6', 'no_answer');
    expect(appt(r, 'a6').status).toBe('needs_call');
    await r.logCall(rec, 'a6', 'confirmed');
    expect(appt(r, 'a6').status).toBe('confirmed');
    expect(
      r
        .getSnapshot()
        .calls.filter((c) => c.appointmentId === 'a6')
        .map((c) => c.outcome),
    ).toEqual(['no_answer', 'no_answer', 'confirmed']);
  });

  it('sends a prescription as Sent, then Delivered', async () => {
    vi.useFakeTimers();
    const r = makeRepo();
    await r.changeAppointmentStatus(doc, 'a10', 'in_consultation');
    const msg = await r.sendPrescription(doc, 'a10', {
      fields: { complaint: '', diagnosis: '', treatment: '' },
      items: [
        {
          drug: 'Ibuprofen',
          dose: '400 mg',
          frequency: 'Twice daily',
          duration: '5 days',
          instructions: '',
        },
      ],
    });
    expect(msg.status).toBe('sent');
    vi.advanceTimersByTime(MOCK_DELIVERY_DELAY_MS);
    expect(r.getSnapshot().messages.find((m) => m.id === msg.id)!.status).toBe('delivered');
    r.demo.simulateDeliveryFailure(msg.id);
    expect(r.getSnapshot().messages.find((m) => m.id === msg.id)!.status).toBe('failed');
  });

  it('resets to the seed', async () => {
    const r = makeRepo();
    await r.recordPayment(rec, 'a4', { amount: 400, method: 'cash' });
    r.reset();
    expect(appt(r, 'a4').paymentStatus).toBe('unpaid');
  });
});
