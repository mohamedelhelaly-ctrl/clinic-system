import type { Clock } from '../domain';

const pad = (n: number) => String(n).padStart(2, '0');

/** Wall clock of the browser. Used outside the demo. */
export const systemClock: Clock = {
  today() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },
  time() {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },
  now() {
    return `${this.today()}T${this.time()}`;
  },
};
