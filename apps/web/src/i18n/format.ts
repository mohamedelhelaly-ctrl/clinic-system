import type { IsoDate, IsoDateTime, Language } from '../domain';

const locale = (lang: Language) => (lang === 'ar' ? 'ar-EG' : 'en-GB');
const utc = (date: IsoDate) => new Date(`${date}T00:00:00Z`);

export interface Formatters {
  /** 24 Oct 2026 */
  date(date: IsoDate): string;
  /** Sat 24 Oct */
  dayLabel(date: IsoDate): string;
  /** Saturday, 24 October 2026 */
  longDate(date: IsoDate): string;
  /** 8,000 EGP */
  money(amount: number): string;
  /** Fri 23 Oct, 09:00 — when an automatic reminder went out. */
  reminderTime(at: IsoDateTime): string;
}

export function createFormatters(lang: Language, egp: string): Formatters {
  const loc = locale(lang);
  return {
    date: (d) =>
      utc(d).toLocaleDateString(loc, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }),
    dayLabel: (d) =>
      utc(d).toLocaleDateString(loc, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }),
    longDate: (d) =>
      utc(d).toLocaleDateString(loc, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }),
    money: (n) => `${Number(n).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} ${egp}`,
    reminderTime: (at) => {
      const date = at.slice(0, 10);
      const time = at.slice(11, 16);
      if (lang === 'en') {
        const label = utc(date).toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          timeZone: 'UTC',
        });
        return `${label}, ${time}`;
      }
      const parts = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
      }).formatToParts(utc(date));
      const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
      return `${part('weekday')} ${part('day')} ${part('month')}، ${time}`;
    },
  };
}
