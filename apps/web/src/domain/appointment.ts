import type {
  AppointmentId,
  ClinicScoped,
  ClockTime,
  DoctorId,
  IsoDate,
  IsoDateTime,
  LocalizedText,
  PatientId,
} from './common';
import type { AppointmentStatus } from './status/appointmentStatus';
import type { PaymentStatus } from './status/paymentStatus';

export type BookingSource = 'phone' | 'whatsapp' | 'walk_in' | 'in_person';

export type CancellationSource = 'patient_whatsapp' | 'patient_phone' | 'clinic' | 'rescheduled';

export interface Cancellation {
  source: CancellationSource;
  reason: string;
}

/**
 * An appointment carries exactly two statuses: where it is in the visit
 * (`status`) and whether it is paid (`paymentStatus`). Reminders, replies and
 * calls are recorded in MessageLog / CallLog, not in a status.
 */
export interface Appointment extends ClinicScoped {
  id: AppointmentId;
  patientId: PatientId;
  doctorId: DoctorId;
  date: IsoDate;
  /** Slot start; null for a walk-in added to the queue without a slot. */
  time: ClockTime | null;
  durationMinutes: number;
  reason: LocalizedText;
  source: BookingSource;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  bookedAt: IsoDateTime;
  arrivedAt: IsoDateTime | null;
  consultationStartedAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  cancellation: Cancellation | null;
  /** Set on the new appointment created by a reschedule. */
  rescheduledFromId: AppointmentId | null;
}

export function isWalkIn(appointment: Pick<Appointment, 'time'>): boolean {
  return appointment.time === null;
}
