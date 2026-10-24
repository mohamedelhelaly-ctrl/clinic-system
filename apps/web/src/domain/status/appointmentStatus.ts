/** Appointment status, in the order the UI lists them. */
export const APPOINTMENT_STATUSES = [
  'scheduled',
  'confirmed',
  'needs_call',
  'arrived',
  'in_consultation',
  'completed',
  'cancelled',
  'no_show',
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Booked but the patient has not arrived yet. */
export const PRE_ARRIVAL_STATUSES: readonly AppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'needs_call',
];

/** The appointment is over; it stays in history and never changes again. */
export const FINAL_STATUSES: readonly AppointmentStatus[] = ['completed', 'cancelled', 'no_show'];

export function isPreArrival(status: AppointmentStatus): boolean {
  return PRE_ARRIVAL_STATUSES.includes(status);
}

export function isFinal(status: AppointmentStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

/** Still expected to happen today (counts towards "Remaining"). */
export function isActive(status: AppointmentStatus): boolean {
  return !isFinal(status);
}
