import { describe, expect, it } from 'vitest';
import type { Appointment } from '../appointment';
import type { Package } from '../billing';
import type { CallLog, MessageLog } from '../communication';
import type { DoctorSchedule } from '../people';
import { addHours, ageOn, daysBetween } from './dates';
import { needsAttention } from './attention';
import { adjustPackage, findActivePackage, isPackageActive, remainingVisits } from './packages';
import { confirmationChannel, reminderPolicy } from './reminders';
import { isSlotUnavailable, slotTimes } from './slots';

const pkg: Package = {
  id: 'k1',
  clinicId: 'c1',
  patientId: 'p4',
  totalPrice: 8000,
  totalVisits: 10,
  visitsUsed: 3,
  expiryDate: '2027-03-31',
  notes: '',
};

describe('dates', () => {
  it('computes age from date of birth', () => {
    expect(ageOn('1971-11-02', '2026-10-24')).toBe(54);
    expect(ageOn('1986-03-12', '2026-10-24')).toBe(40);
    expect(ageOn('2000-10-24', '2026-10-24')).toBe(26);
  });
  it('does date arithmetic', () => {
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(addHours('2026-10-24T09:00', -24)).toBe('2026-10-23T09:00');
  });
});

describe('packages', () => {
  it('tracks remaining visits and activity', () => {
    expect(remainingVisits(pkg)).toBe(7);
    expect(isPackageActive(pkg, '2026-10-24')).toBe(true);
    expect(isPackageActive({ ...pkg, visitsUsed: 10 }, '2026-10-24')).toBe(false);
    expect(isPackageActive(pkg, '2027-04-01')).toBe(false);
    expect(findActivePackage([pkg], 'p4', '2026-10-24')).toBe(pkg);
    expect(findActivePackage([pkg], 'p1', '2026-10-24')).toBeUndefined();
  });
  it('adjusts packages without going below used visits', () => {
    expect(adjustPackage(pkg, 'add_visit', '2026-10-24').totalVisits).toBe(11);
    expect(
      adjustPackage({ ...pkg, totalVisits: 3 }, 'remove_visit', '2026-10-24').totalVisits,
    ).toBe(3);
    expect(adjustPackage(pkg, 'extend_expiry', '2026-10-24').expiryDate).toBe('2027-04-30');
  });
});

describe('slots', () => {
  const schedule: DoctorSchedule = {
    clinicId: 'c1',
    doctorId: 'd1',
    weekdays: [6, 0, 1, 2, 3, 4],
    firstSlot: '09:00',
    lastSlot: '10:30',
  };
  const taken = {
    doctorId: 'd1',
    date: '2026-10-25',
    time: '09:30',
    status: 'confirmed',
  } as Appointment;
  const ctx = {
    schedule,
    appointments: [taken],
    exceptions: [],
    now: { date: '2026-10-24', time: '10:15' },
  };
  it('lists slot start times', () => {
    expect(slotTimes(schedule, 30)).toEqual(['09:00', '09:30', '10:00', '10:30']);
  });
  it('blocks past, taken, off-day and blocked slots', () => {
    expect(isSlotUnavailable('d1', '2026-10-24', '10:00', ctx)).toBe(true);
    expect(isSlotUnavailable('d1', '2026-10-24', '10:30', ctx)).toBe(false);
    expect(isSlotUnavailable('d1', '2026-10-25', '09:30', ctx)).toBe(true);
    expect(
      isSlotUnavailable('d1', '2026-10-25', '09:30', {
        ...ctx,
        appointments: [{ ...taken, status: 'cancelled' }],
      }),
    ).toBe(false);
    expect(isSlotUnavailable('d1', '2026-10-30', '09:00', ctx)).toBe(true); // Friday
    expect(
      isSlotUnavailable('d1', '2026-10-26', '09:00', {
        ...ctx,
        exceptions: [
          {
            id: 'x',
            clinicId: 'c1',
            doctorId: 'd1',
            date: '2026-10-26',
            from: null,
            to: null,
            reason: { value: 'Leave' },
          },
        ],
      }),
    ).toBe(true);
  });
});

describe('reminders', () => {
  it('applies the 24 hour rule', () => {
    expect(
      reminderPolicy({ date: '2026-10-25', time: '11:00', bookedAt: '2026-10-24T10:15' }, 24),
    ).toBe('automatic');
    expect(
      reminderPolicy({ date: '2026-10-25', time: '09:00', bookedAt: '2026-10-24T10:15' }, 24),
    ).toBe('booked_too_late');
    expect(
      reminderPolicy({ date: '2026-10-24', time: null, bookedAt: '2026-10-24T10:15' }, 24),
    ).toBe('walk_in');
  });
  it('derives the confirmation channel from the logs', () => {
    const reply = {
      id: 'm',
      clinicId: 'c1',
      type: 'reminder',
      channel: 'whatsapp',
      appointmentId: 'a',
      prescriptionId: null,
      status: 'delivered',
      providerMessageId: null,
      scheduledFor: null,
      sentAt: null,
      deliveredAt: null,
      replies: [{ reply: 'confirm', at: '' }],
    } as MessageLog;
    const call = {
      id: 'c',
      clinicId: 'c1',
      appointmentId: 'a',
      outcome: 'confirmed',
      loggedBy: 'u',
      loggedAt: '',
    } as CallLog;
    expect(confirmationChannel([reply], [])).toBe('whatsapp');
    expect(confirmationChannel([reply], [call])).toBe('phone');
    expect(confirmationChannel([], [{ ...call, outcome: 'no_answer' }])).toBeNull();
  });
});

describe('needs attention', () => {
  it('flags unpaid or needs-call appointments that are still open', () => {
    expect(needsAttention({ status: 'needs_call', paymentStatus: 'paid' })).toBe(true);
    expect(needsAttention({ status: 'confirmed', paymentStatus: 'unpaid' })).toBe(true);
    expect(needsAttention({ status: 'completed', paymentStatus: 'paid' })).toBe(false);
    expect(needsAttention({ status: 'cancelled', paymentStatus: 'unpaid' })).toBe(false);
    expect(needsAttention({ status: 'no_show', paymentStatus: 'unpaid' })).toBe(false);
  });
});
