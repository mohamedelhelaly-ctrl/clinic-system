import type { AppointmentId, ClinicScoped, IsoDateTime, LocalizedText, UserId } from './common';
import type { Role } from './permissions/roles';

export type AuditEntity =
  'patient' | 'appointment' | 'visit_record' | 'prescription' | 'payment' | 'package' | 'schedule';

export type AuditAction =
  | 'visit_record.edited'
  | 'visit_record.completed'
  | 'patient.phone_edited'
  | 'patient.edited'
  | 'payment.gate_overridden'
  | 'package.created'
  | 'package.adjusted'
  | 'schedule.blocked';

/** Values used to render the human summary; text values may carry an Arabic form. */
export type AuditParams = Record<string, string | number | LocalizedText>;

export interface AuditLog extends ClinicScoped {
  id: string;
  userId: UserId;
  /** The role the user acted in (one person can be both doctor and admin). */
  role: Role;
  entity: AuditEntity;
  entityId: string;
  action: AuditAction;
  params: AuditParams;
  before: unknown;
  after: unknown;
  at: IsoDateTime;
}

export type AppointmentEventKind =
  | 'booked'
  | 'arrived'
  | 'confirmed_manually'
  | 'call_confirmed'
  | 'call_cancelled'
  | 'consultation_started'
  | 'completed'
  | 'visit_completed'
  | 'no_show'
  | 'cancelled_by_clinic'
  | 'payment_gate_overridden'
  | 'payment_recorded'
  | 'package_applied'
  | 'rescheduled_to'
  | 'rescheduled_from';

/**
 * Activity shown on an appointment's "Reminder & call log". In production this
 * is a filtered view over the audit trail; the demo stores it directly.
 */
export interface AppointmentEvent extends ClinicScoped {
  id: string;
  appointmentId: AppointmentId;
  kind: AppointmentEventKind;
  userId: UserId;
  role: Role;
  params: AuditParams;
  at: IsoDateTime;
}
