import type { Appointment } from '../appointment';
import type { Moment } from '../clock';
import type { AppointmentStatus } from './appointmentStatus';
import type { PaymentStatus } from './paymentStatus';
import { isPaymentSettled } from './paymentStatus';

/**
 * Allowed appointment status changes. Anything not listed is rejected.
 * Rescheduling is not a status: the old appointment becomes Cancelled
 * (source "rescheduled") and a new Scheduled one is created.
 */
export const APPOINTMENT_TRANSITIONS: Readonly<
  Record<AppointmentStatus, readonly AppointmentStatus[]>
> = {
  scheduled: ['confirmed', 'needs_call', 'arrived', 'cancelled', 'no_show'],
  needs_call: ['confirmed', 'arrived', 'cancelled', 'no_show'],
  confirmed: ['arrived', 'cancelled', 'no_show'],
  arrived: ['in_consultation'],
  in_consultation: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export const PAYMENT_TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  unpaid: ['paid', 'package'],
  paid: [],
  package: [],
};

export type TransitionRejection =
  | 'not_allowed'
  | 'payment_required'
  | 'slot_not_passed'
  | 'override_reason_required'
  | 'appointment_closed'
  | 'no_active_package';

export type TransitionCheck = { ok: true } | { ok: false; reason: TransitionRejection };

const OK: TransitionCheck = { ok: true };
const reject = (reason: TransitionRejection): TransitionCheck => ({ ok: false, reason });

export function allowedNextStatuses(from: AppointmentStatus): readonly AppointmentStatus[] {
  return APPOINTMENT_TRANSITIONS[from];
}

export function isTransitionAllowed(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return APPOINTMENT_TRANSITIONS[from].includes(to);
}

/** Initial status of a new appointment. Walk-ins join today's queue already arrived. */
export function initialAppointmentStatus(walkIn: boolean): AppointmentStatus {
  return walkIn ? 'arrived' : 'scheduled';
}

/** True once the slot start time has passed (a walk-in has no slot). */
export function hasSlotPassed(
  appointment: Pick<Appointment, 'date' | 'time'>,
  now: Moment,
): boolean {
  if (appointment.time === null) return false;
  if (appointment.date < now.date) return true;
  return appointment.date === now.date && appointment.time <= now.time;
}

export interface AppointmentTransitionContext {
  now: Moment;
  /** Admin override of the payment gate; requires a reason (spec PY-1). */
  override?: { reason: string };
}

/** Full check for an appointment status change, including the business guards. */
export function checkAppointmentTransition(
  appointment: Pick<Appointment, 'status' | 'paymentStatus' | 'date' | 'time'>,
  to: AppointmentStatus,
  context: AppointmentTransitionContext,
): TransitionCheck {
  if (!isTransitionAllowed(appointment.status, to)) return reject('not_allowed');
  if (to === 'in_consultation' && !isPaymentSettled(appointment.paymentStatus)) {
    if (!context.override) return reject('payment_required');
    if (context.override.reason.trim() === '') return reject('override_reason_required');
  }
  if (to === 'no_show' && !hasSlotPassed(appointment, context.now)) {
    return reject('slot_not_passed');
  }
  return OK;
}

export interface PaymentTransitionContext {
  hasActivePackage: boolean;
}

/** Check for a payment status change on an appointment. */
export function checkPaymentTransition(
  appointment: Pick<Appointment, 'status' | 'paymentStatus'>,
  to: PaymentStatus,
  context: PaymentTransitionContext,
): TransitionCheck {
  if (appointment.status === 'cancelled' || appointment.status === 'no_show') {
    return reject('appointment_closed');
  }
  if (!PAYMENT_TRANSITIONS[appointment.paymentStatus].includes(to)) return reject('not_allowed');
  if (to === 'package' && !context.hasActivePackage) return reject('no_active_package');
  return OK;
}

/** A package visit is consumed when a package-covered appointment is completed (spec PY-6). */
export function consumesPackageVisit(
  appointment: Pick<Appointment, 'paymentStatus'>,
  to: AppointmentStatus,
): boolean {
  return to === 'completed' && appointment.paymentStatus === 'package';
}
