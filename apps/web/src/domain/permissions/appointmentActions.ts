import type { Appointment } from '../appointment';
import type { Moment } from '../clock';
import { isFinal, isPreArrival } from '../status/appointmentStatus';
import {
  checkAppointmentTransition,
  checkPaymentTransition,
  isTransitionAllowed,
} from '../status/transitions';
import { can } from './permissions';
import type { Role } from './roles';

export interface AppointmentActions {
  confirm: boolean;
  markArrived: boolean;
  /** Shown to clinicians once the patient has arrived. */
  startConsultation: boolean;
  /** Start is shown but blocked until payment is settled. */
  startConsultationBlocked: boolean;
  overridePaymentGate: boolean;
  openVisitRecord: boolean;
  complete: boolean;
  markNoShow: boolean;
  reschedule: boolean;
  cancel: boolean;
  paymentRequiredHint: boolean;
  isFinal: boolean;
  recordPayment: boolean;
  applyPackage: boolean;
}

export interface AppointmentActionContext {
  now: Moment;
  hasActivePackage: boolean;
}

type ActionAppointment = Pick<Appointment, 'status' | 'paymentStatus' | 'date' | 'time'>;

/**
 * Which buttons the appointment screen shows for a role. Combines the status
 * transition table with the permission matrix so the UI hardcodes neither.
 */
export function getAppointmentActions(
  role: Role,
  appointment: ActionAppointment,
  context: AppointmentActionContext,
): AppointmentActions {
  const { status, paymentStatus } = appointment;
  const allowed = (to: Appointment['status']) => isTransitionAllowed(status, to);
  const preArrival = isPreArrival(status);

  const startConsultation =
    can(role, 'appointment.startConsultation') && allowed('in_consultation');
  const startBlocked =
    startConsultation &&
    !checkAppointmentTransition(appointment, 'in_consultation', { now: context.now }).ok;
  const paymentCheck = (to: Appointment['paymentStatus']) =>
    checkPaymentTransition(appointment, to, { hasActivePackage: context.hasActivePackage }).ok;

  return {
    confirm: can(role, 'appointment.confirm') && allowed('confirmed'),
    markArrived: can(role, 'appointment.markArrived') && allowed('arrived'),
    startConsultation,
    startConsultationBlocked: startBlocked,
    overridePaymentGate: startBlocked && can(role, 'payment.overrideGate'),
    openVisitRecord: can(role, 'visitRecord.write') && status === 'in_consultation',
    complete: can(role, 'appointment.complete') && allowed('completed'),
    markNoShow:
      can(role, 'appointment.markNoShow') &&
      checkAppointmentTransition(appointment, 'no_show', { now: context.now }).ok,
    reschedule: can(role, 'appointment.reschedule') && preArrival,
    cancel: can(role, 'appointment.cancel') && preArrival && allowed('cancelled'),
    paymentRequiredHint: status === 'arrived' && paymentStatus === 'unpaid',
    isFinal: isFinal(status),
    recordPayment: can(role, 'payment.record') && paymentCheck('paid'),
    applyPackage: can(role, 'payment.applyPackage') && paymentCheck('package'),
  };
}
