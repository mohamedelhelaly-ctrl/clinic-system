import type { Language, Role } from '../domain';

export interface DemoParams {
  role: Role | null;
  lang: Language | null;
  reset: boolean;
}

const ROLE_ALIASES: Record<string, Role> = {
  receptionist: 'receptionist',
  rec: 'receptionist',
  doctor: 'doctor',
  doc: 'doctor',
  admin: 'admin',
  adm: 'admin',
};

/** Reads `?role=receptionist|doctor|admin`, `?lang=en|ar` and `?reset=1`. */
export function parseDemoParams(search: string): DemoParams {
  const params = new URLSearchParams(search);
  const role = ROLE_ALIASES[(params.get('role') ?? '').toLowerCase()] ?? null;
  const langParam = (params.get('lang') ?? '').toLowerCase();
  const lang = langParam === 'en' || langParam === 'ar' ? langParam : null;
  const resetParam = params.get('reset');
  const reset = resetParam !== null && resetParam !== '0' && resetParam !== 'false';
  return { role, lang, reset };
}

/** Removes `reset` from the address bar so a reload does not wipe the demo again. */
export function stripResetParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('reset')) return;
  url.searchParams.delete('reset');
  window.history.replaceState(null, '', url.toString());
}
