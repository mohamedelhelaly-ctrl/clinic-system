import type { Appointment } from '../appointment';
import type { Moment } from '../clock';
import type { ClockTime, DoctorId, IsoDate } from '../common';
import type { DoctorSchedule, ScheduleException } from '../people';
import { minutesOf, timeOf, weekday } from './dates';

/** Start times of every slot in a doctor's working day. */
export function slotTimes(schedule: DoctorSchedule, slotMinutes: number): ClockTime[] {
  const out: ClockTime[] = [];
  for (let m = minutesOf(schedule.firstSlot); m <= minutesOf(schedule.lastSlot); m += slotMinutes) {
    out.push(timeOf(m));
  }
  return out;
}

export function findDayException(
  exceptions: readonly ScheduleException[],
  doctorId: DoctorId,
  date: IsoDate,
): ScheduleException | undefined {
  return exceptions.find((e) => e.doctorId === doctorId && e.date === date);
}

export function worksOn(schedule: DoctorSchedule, date: IsoDate): boolean {
  return schedule.weekdays.includes(weekday(date));
}

export interface SlotContext {
  schedule: DoctorSchedule;
  appointments: readonly Appointment[];
  exceptions: readonly ScheduleException[];
  now: Moment;
}

/**
 * A slot cannot be booked when the doctor is off, the time has passed, or a
 * non-cancelled appointment already holds it (spec AM-3, AM-5).
 */
export function isSlotUnavailable(
  doctorId: DoctorId,
  date: IsoDate,
  time: ClockTime,
  { schedule, appointments, exceptions, now }: SlotContext,
): boolean {
  if (!worksOn(schedule, date)) return true;
  const exception = findDayException(exceptions, doctorId, date);
  if (exception && (exception.from === null || (time >= exception.from && time < exception.to!))) {
    return true;
  }
  if (date < now.date || (date === now.date && time <= now.time)) return true;
  return appointments.some(
    (a) =>
      a.doctorId === doctorId && a.date === date && a.time === time && a.status !== 'cancelled',
  );
}
