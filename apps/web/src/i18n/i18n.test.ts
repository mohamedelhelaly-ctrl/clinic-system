import { describe, expect, it } from 'vitest';
import { ar } from './ar';
import { en } from './en';
import { createFormatters } from './format';
import { interpolate } from './I18nProvider';

describe('translations', () => {
  it('Arabic covers exactly the English keys', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });
  it('keeps the same placeholders in both languages', () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(ar[key]), key).toEqual(placeholders(en[key]));
    }
  });
  it('interpolates parameters', () => {
    expect(interpolate('{n} yrs', { n: 54 })).toBe('54 yrs');
  });
  it('formats demo dates and money', () => {
    const f = createFormatters('en', 'EGP');
    expect(f.dayLabel('2026-10-24')).toBe('Sat 24 Oct');
    expect(f.money(8000)).toBe('8,000 EGP');
    expect(f.reminderTime('2026-10-23T09:00')).toBe('Fri 23 Oct, 09:00');
    expect(createFormatters('ar', 'ج.م').reminderTime('2026-10-23T09:00')).toBe(
      'الجمعة 23 أكتوبر، 09:00',
    );
  });
});
