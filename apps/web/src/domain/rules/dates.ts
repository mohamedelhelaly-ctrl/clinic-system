import type { ClockTime, IsoDate, IsoDateTime } from '../common';

const pad = (n: number) => String(n).padStart(2, '0');

function toUtc(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function fromUtc(d: Date): IsoDate {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** Same day of the month `months` later, clamped to the month's last day (31 Mar + 1 → 30 Apr). */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const d = toUtc(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return fromUtc(d);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

export function weekday(date: IsoDate): number {
  return toUtc(date).getUTCDay();
}

/** Age in completed years on `today` (spec PM-2). */
export function ageOn(dateOfBirth: IsoDate, today: IsoDate): number {
  const [by, bm, bd] = dateOfBirth.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let years = ty! - by!;
  if (tm! < bm! || (tm === bm && td! < bd!)) years--;
  return years;
}

export function dateTime(date: IsoDate, time: ClockTime): IsoDateTime {
  return `${date}T${time}`;
}

export function datePart(value: IsoDateTime): IsoDate {
  return value.slice(0, 10);
}

export function timePart(value: IsoDateTime): ClockTime {
  return value.slice(11, 16);
}

export function minutesOf(time: ClockTime): number {
  const [h, m] = time.split(':').map(Number);
  return h! * 60 + m!;
}

export function timeOf(minutes: number): ClockTime {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** Shift a local date-time by a number of hours. */
export function addHours(value: IsoDateTime, hours: number): IsoDateTime {
  const total = minutesOf(timePart(value)) + Math.round(hours * 60);
  const dayShift = Math.floor(total / 1440);
  const minutes = ((total % 1440) + 1440) % 1440;
  return dateTime(addDays(datePart(value), dayShift), timeOf(minutes));
}
