import type { Appointment } from '../appointment';
import type { IsoDateTime } from '../common';
import type { CallLog, MessageLog } from '../communication';
import { addHours, dateTime } from './dates';

export type ReminderPolicy = 'walk_in' | 'booked_too_late' | 'automatic';

/** When the automatic reminder goes out, or null for a walk-in. */
export function reminderDueAt(
  appointment: Pick<Appointment, 'date' | 'time'>,
  leadHours: number,
): IsoDateTime | null {
  if (appointment.time === null) return null;
  return addHours(dateTime(appointment.date, appointment.time), -leadHours);
}

/**
 * Walk-ins get no reminder. Appointments booked less than `leadHours` ahead
 * skip the automatic reminder (spec RC-3).
 */
export function reminderPolicy(
  appointment: Pick<Appointment, 'date' | 'time' | 'bookedAt'>,
  leadHours: number,
): ReminderPolicy {
  const due = reminderDueAt(appointment, leadHours);
  if (due === null) return 'walk_in';
  return appointment.bookedAt > due ? 'booked_too_late' : 'automatic';
}

export type ConfirmationChannel = 'whatsapp' | 'phone';

/** How the patient confirmed, derived from the message and call logs. */
export function confirmationChannel(
  messages: readonly MessageLog[],
  calls: readonly CallLog[],
): ConfirmationChannel | null {
  if (calls.some((c) => c.outcome === 'confirmed')) return 'phone';
  if (messages.some((m) => m.type === 'reminder' && m.replies.some((r) => r.reply === 'confirm'))) {
    return 'whatsapp';
  }
  return null;
}
