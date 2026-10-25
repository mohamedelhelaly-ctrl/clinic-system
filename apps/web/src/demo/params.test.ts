import { describe, expect, it } from 'vitest';
import { parseDemoParams } from './params';

describe('demo URL parameters', () => {
  it('reads role, language and reset', () => {
    expect(parseDemoParams('?role=doctor&lang=ar&reset=1')).toEqual({
      role: 'doctor',
      lang: 'ar',
      reset: true,
      clean: false,
    });
  });
  it('accepts short role names and ignores unknown values', () => {
    expect(parseDemoParams('?role=adm').role).toBe('admin');
    expect(parseDemoParams('?role=patient&lang=fr')).toEqual({
      role: null,
      lang: null,
      reset: false,
      clean: false,
    });
  });
  it('treats reset=0 as no reset', () => {
    expect(parseDemoParams('?reset=0').reset).toBe(false);
    expect(parseDemoParams('?reset').reset).toBe(true);
  });
  it('reads the recording mode flag', () => {
    expect(parseDemoParams('?clean=1').clean).toBe(true);
    expect(parseDemoParams('?clean=0').clean).toBe(false);
  });
});
