import { describe, expect, it } from 'vitest';
import type { AppointmentStatus } from './appointmentStatus';
import { APPOINTMENT_STATUSES } from './appointmentStatus';
import type { PaymentStatus } from './paymentStatus';
import { PAYMENT_STATUSES } from './paymentStatus';
import { checkPaymentTransition, isTransitionAllowed } from './transitions';

/*
 * Every from → to pair of both status models, against an expected table
 * written out by hand from the spec (§4), not derived from the implementation.
 */

const ALLOWED: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ['confirmed', 'needs_call', 'arrived', 'cancelled', 'no_show'],
  confirmed: ['arrived', 'cancelled', 'no_show'],
  needs_call: ['confirmed', 'arrived', 'cancelled', 'no_show'],
  arrived: ['in_consultation'],
  in_consultation: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
};

const pairs = APPOINTMENT_STATUSES.flatMap((from) =>
  APPOINTMENT_STATUSES.map((to) => [from, to, ALLOWED[from].includes(to)] as const),
);

describe('appointment transition matrix (all 64 pairs)', () => {
  it.each(pairs)('%s → %s allowed: %s', (from, to, expected) => {
    expect(isTransitionAllowed(from, to)).toBe(expected);
  });

  it('never allows a status to transition to itself', () => {
    for (const s of APPOINTMENT_STATUSES) expect(isTransitionAllowed(s, s)).toBe(false);
  });

  it('never goes back to Scheduled', () => {
    for (const s of APPOINTMENT_STATUSES) expect(isTransitionAllowed(s, 'scheduled')).toBe(false);
  });
});

const PAYMENT_ALLOWED: Record<PaymentStatus, PaymentStatus[]> = {
  unpaid: ['paid', 'package'],
  paid: [],
  package: [],
};

const paymentPairs = PAYMENT_STATUSES.flatMap((from) =>
  PAYMENT_STATUSES.map((to) => [from, to, PAYMENT_ALLOWED[from].includes(to)] as const),
);

describe('payment transition matrix (all 9 pairs, open appointment)', () => {
  it.each(paymentPairs)('%s → %s allowed: %s', (from, to, expected) => {
    const check = checkPaymentTransition({ status: 'arrived', paymentStatus: from }, to, {
      hasActivePackage: true,
    });
    expect(check.ok).toBe(expected);
  });

  it.each(['cancelled', 'no_show'] as const)('no payment change on a %s appointment', (status) => {
    for (const to of PAYMENT_STATUSES) {
      expect(
        checkPaymentTransition({ status, paymentStatus: 'unpaid' }, to, { hasActivePackage: true })
          .ok,
      ).toBe(false);
    }
  });
});
