import { describe, expect, it } from 'vitest';
import type { AppointmentStatus } from './appointmentStatus';
import { APPOINTMENT_STATUSES, FINAL_STATUSES, isFinal, isPreArrival } from './appointmentStatus';
import { isPaymentSettled } from './paymentStatus';
import {
  allowedNextStatuses,
  checkAppointmentTransition,
  checkPaymentTransition,
  consumesPackageVisit,
  hasSlotPassed,
  initialAppointmentStatus,
  isTransitionAllowed,
} from './transitions';

const now = { date: '2026-10-24', time: '10:15' };
const appt = (over: Partial<Parameters<typeof checkAppointmentTransition>[0]> = {}) => ({
  status: 'scheduled' as AppointmentStatus,
  paymentStatus: 'unpaid' as const,
  date: '2026-10-24',
  time: '12:00' as string | null,
  ...over,
});

describe('appointment status model', () => {
  it('has exactly the eight decided statuses in display order', () => {
    expect(APPOINTMENT_STATUSES).toEqual([
      'scheduled',
      'confirmed',
      'needs_call',
      'arrived',
      'in_consultation',
      'completed',
      'cancelled',
      'no_show',
    ]);
  });

  it('classifies pre-arrival and final statuses', () => {
    expect(
      ['scheduled', 'confirmed', 'needs_call'].every((s) => isPreArrival(s as AppointmentStatus)),
    ).toBe(true);
    expect(isPreArrival('arrived')).toBe(false);
    expect(FINAL_STATUSES.every(isFinal)).toBe(true);
    expect(isFinal('in_consultation')).toBe(false);
  });

  it('final statuses never transition', () => {
    for (const s of FINAL_STATUSES) expect(allowedNextStatuses(s)).toEqual([]);
  });

  it.each([
    ['scheduled', 'confirmed'],
    ['scheduled', 'needs_call'],
    ['scheduled', 'arrived'],
    ['scheduled', 'cancelled'],
    ['needs_call', 'confirmed'],
    ['needs_call', 'cancelled'],
    ['confirmed', 'arrived'],
    ['arrived', 'in_consultation'],
    ['in_consultation', 'completed'],
  ] as const)('allows %s → %s', (from, to) => {
    expect(isTransitionAllowed(from, to)).toBe(true);
  });

  it.each([
    ['confirmed', 'scheduled'],
    ['confirmed', 'needs_call'],
    ['scheduled', 'in_consultation'],
    ['scheduled', 'completed'],
    ['arrived', 'cancelled'],
    ['arrived', 'completed'],
    ['in_consultation', 'arrived'],
    ['completed', 'arrived'],
    ['cancelled', 'scheduled'],
  ] as const)('rejects %s → %s', (from, to) => {
    expect(isTransitionAllowed(from, to)).toBe(false);
    expect(checkAppointmentTransition(appt({ status: from }), to, { now })).toEqual({
      ok: false,
      reason: 'not_allowed',
    });
  });

  it('starts walk-ins as arrived and bookings as scheduled', () => {
    expect(initialAppointmentStatus(true)).toBe('arrived');
    expect(initialAppointmentStatus(false)).toBe('scheduled');
  });
});

describe('payment gate', () => {
  it('blocks the consultation while unpaid', () => {
    expect(
      checkAppointmentTransition(appt({ status: 'arrived' }), 'in_consultation', { now }),
    ).toEqual({
      ok: false,
      reason: 'payment_required',
    });
  });

  it.each(['paid', 'package'] as const)('allows the consultation when %s', (paymentStatus) => {
    expect(
      checkAppointmentTransition(appt({ status: 'arrived', paymentStatus }), 'in_consultation', {
        now,
      }),
    ).toEqual({ ok: true });
  });

  it('lets an override through only with a reason', () => {
    const a = appt({ status: 'arrived' });
    expect(
      checkAppointmentTransition(a, 'in_consultation', { now, override: { reason: '  ' } }),
    ).toEqual({
      ok: false,
      reason: 'override_reason_required',
    });
    expect(
      checkAppointmentTransition(a, 'in_consultation', {
        now,
        override: { reason: 'Insurance letter' },
      }),
    ).toEqual({ ok: true });
  });

  it('treats paid and package as settled', () => {
    expect(isPaymentSettled('unpaid')).toBe(false);
    expect(isPaymentSettled('paid')).toBe(true);
    expect(isPaymentSettled('package')).toBe(true);
  });
});

describe('no show', () => {
  it('needs the slot time to have passed', () => {
    expect(checkAppointmentTransition(appt({ time: '12:00' }), 'no_show', { now }).ok).toBe(false);
    expect(checkAppointmentTransition(appt({ time: '10:00' }), 'no_show', { now }).ok).toBe(true);
    expect(checkAppointmentTransition(appt({ time: '10:15' }), 'no_show', { now }).ok).toBe(true);
    expect(
      checkAppointmentTransition(appt({ date: '2026-10-23', time: '16:00' }), 'no_show', { now })
        .ok,
    ).toBe(true);
  });

  it('never applies to a walk-in without a slot', () => {
    expect(hasSlotPassed({ date: '2026-10-24', time: null }, now)).toBe(false);
  });
});

describe('payment status transitions', () => {
  it('moves unpaid to paid', () => {
    expect(checkPaymentTransition(appt(), 'paid', { hasActivePackage: false })).toEqual({
      ok: true,
    });
  });

  it('needs an active package to cover a visit', () => {
    expect(checkPaymentTransition(appt(), 'package', { hasActivePackage: false })).toEqual({
      ok: false,
      reason: 'no_active_package',
    });
    expect(checkPaymentTransition(appt(), 'package', { hasActivePackage: true })).toEqual({
      ok: true,
    });
  });

  it('does not change a settled payment', () => {
    expect(
      checkPaymentTransition(appt({ paymentStatus: 'paid' }), 'package', { hasActivePackage: true })
        .ok,
    ).toBe(false);
    expect(
      checkPaymentTransition(appt({ paymentStatus: 'package' }), 'paid', { hasActivePackage: true })
        .ok,
    ).toBe(false);
  });

  it.each(['cancelled', 'no_show'] as const)('rejects payments on %s appointments', (status) => {
    expect(checkPaymentTransition(appt({ status }), 'paid', { hasActivePackage: false })).toEqual({
      ok: false,
      reason: 'appointment_closed',
    });
  });
});

describe('package consumption', () => {
  it('consumes a visit only when a package-covered appointment completes', () => {
    expect(consumesPackageVisit({ paymentStatus: 'package' }, 'completed')).toBe(true);
    expect(consumesPackageVisit({ paymentStatus: 'paid' }, 'completed')).toBe(false);
    expect(consumesPackageVisit({ paymentStatus: 'package' }, 'arrived')).toBe(false);
    expect(consumesPackageVisit({ paymentStatus: 'package' }, 'cancelled')).toBe(false);
    expect(consumesPackageVisit({ paymentStatus: 'package' }, 'no_show')).toBe(false);
  });
});
