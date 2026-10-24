import type { Clock } from '../domain';

/**
 * The demo always runs on Saturday 24 October 2026 at 10:15, during clinic
 * hours, so the roster, call list and "needs attention" look the same on every run.
 */
export const DEMO_TODAY = '2026-10-24';
export const DEMO_TIME = '10:15';

export const fixedClock: Clock = {
  today: () => DEMO_TODAY,
  time: () => DEMO_TIME,
  now: () => `${DEMO_TODAY}T${DEMO_TIME}`,
};
