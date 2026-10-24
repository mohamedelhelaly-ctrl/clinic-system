import type { ClockTime, IsoDate, IsoDateTime } from './common';

/** Source of "now". The demo injects a fixed clock; production uses the system clock. */
export interface Clock {
  today(): IsoDate;
  time(): ClockTime;
  now(): IsoDateTime;
}

export interface Moment {
  date: IsoDate;
  time: ClockTime;
}

export function momentOf(clock: Clock): Moment {
  return { date: clock.today(), time: clock.time() };
}
