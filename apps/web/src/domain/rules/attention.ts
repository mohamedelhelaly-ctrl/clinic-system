import type { Appointment } from '../appointment';

/** "Needs attention": still needs a call or still unpaid, and not closed (spec HV-5). */
export function needsAttention(
  appointment: Pick<Appointment, 'status' | 'paymentStatus'>,
): boolean {
  if (appointment.status === 'cancelled' || appointment.status === 'no_show') return false;
  return appointment.status === 'needs_call' || appointment.paymentStatus === 'unpaid';
}
