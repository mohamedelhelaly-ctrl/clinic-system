import type { Clock, IsoDateTime } from '../domain';
import { addHours, addMonthsAt, datePart, timePart } from '../domain';
import { DEMO_TIME, DEMO_TODAY } from './fixedClock';

const KEY = 'clinic-demo:clock';
const START: IsoDateTime = `${DEMO_TODAY}T${DEMO_TIME}`;

/**
 * The demo's "now". Starts at the fixed demo moment and only moves forward
 * when the demo controls advance it, so time-based rules (24 h reminder,
 * no-reply cut-off, no-show grace) can be shown on demand. Kept across
 * reloads; Reset demo puts it back.
 */
export class DemoClock implements Clock {
  private current: IsoDateTime;
  private listeners = new Set<() => void>();

  constructor() {
    this.current = this.load() ?? START;
  }

  today = () => datePart(this.current);
  time = () => timePart(this.current);
  now = () => this.current;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Moves to `target`; earlier moments are ignored so time never runs backwards. */
  advanceTo(target: IsoDateTime): void {
    if (target <= this.current) return;
    this.set(target);
  }

  advanceHours(hours: number): void {
    this.advanceTo(addHours(this.current, hours));
  }

  advanceMonths(months: number): void {
    this.advanceTo(addMonthsAt(this.current, months));
  }

  reset(): void {
    this.set(START);
  }

  private set(value: IsoDateTime): void {
    this.current = value;
    try {
      window.localStorage.setItem(KEY, value);
    } catch {
      // Storage can be unavailable; the clock still works in memory.
    }
    this.listeners.forEach((l) => l());
  }

  private load(): IsoDateTime | null {
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }

  static clearStored(): void {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }
}
