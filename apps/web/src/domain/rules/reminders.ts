import type { Appointment } from '../appointment';
import type { IsoDateTime } from '../common';
import type { CallLog, MessageLog, PatientReply } from '../communication';
import type { AppointmentStatus } from '../status/appointmentStatus';
import { isPreArrival } from '../status/appointmentStatus';
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

/** When an unanswered appointment moves to Needs call, or null for a walk-in. */
export function cutoffAt(
  appointment: Pick<Appointment, 'date' | 'time'>,
  cutoffHours: number,
): IsoDateTime | null {
  return reminderDueAt(appointment, cutoffHours);
}

/** A queued reminder whose send time has come (spec RC-1). */
export function isReminderDue(message: MessageLog, now: IsoDateTime): boolean {
  return (
    message.type === 'reminder' &&
    message.status === 'queued' &&
    message.scheduledFor !== null &&
    message.scheduledFor <= now
  );
}

export function wasReminderSent(message: MessageLog | undefined): boolean {
  return !!message && message.sentAt !== null && message.status !== 'queued';
}

/**
 * A Scheduled appointment whose reminder went out but got no reply by the
 * cut-off moves to Needs call (spec RC-4). Appointments that never got a
 * reminder (walk-ins, booked less than 24 h ahead) stay as they are.
 */
export function shouldMoveToNeedsCall(
  appointment: Pick<Appointment, 'status' | 'date' | 'time'>,
  reminder: MessageLog | undefined,
  now: IsoDateTime,
  cutoffHours: number,
): boolean {
  if (appointment.status !== 'scheduled') return false;
  if (!wasReminderSent(reminder) || reminder!.replies.length > 0) return false;
  const cutoff = cutoffAt(appointment, cutoffHours);
  return cutoff !== null && cutoff <= now;
}

/** The appointment status a patient's quick reply asks for (spec RC-2). */
export function statusAfterReply(reply: PatientReply): AppointmentStatus {
  return reply === 'confirm' ? 'confirmed' : 'cancelled';
}

/** Needs-call appointments that start within the next `windowHours` (spec RC-4, call list). */
export function isOnCallList(
  appointment: Pick<Appointment, 'status' | 'date' | 'time'>,
  now: IsoDateTime,
  windowHours = 24,
): boolean {
  if (appointment.status !== 'needs_call' || appointment.time === null) return false;
  const start = dateTime(appointment.date, appointment.time);
  return start >= now && start <= addHours(now, windowHours);
}

/**
 * The patient has not arrived and the grace period after the slot start is
 * over, so the UI suggests marking No show.
 */
export function isNoShowSuggested(
  appointment: Pick<Appointment, 'status' | 'date' | 'time'>,
  now: IsoDateTime,
  graceMinutes: number,
): boolean {
  if (!isPreArrival(appointment.status) || appointment.time === null) return false;
  return addHours(dateTime(appointment.date, appointment.time), graceMinutes / 60) <= now;
}
