import { useUi } from '../../app/uiState';
import { useClinicData } from '../../data';
import type { Patient } from '../../domain';

/** Name (English or Arabic) or phone, partial match (spec PM-4). */
export function matchesPatient(p: Patient, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  return (
    p.name.value.toLowerCase().includes(q) ||
    (p.name.ar ?? '').includes(q) ||
    (digits.length > 1 && p.phone.includes(digits))
  );
}

/** Patients matching the shared search box; optionally only the first few when it is empty. */
export function usePatientSearch({ limitWhenEmpty }: { limitWhenEmpty?: number } = {}): Patient[] {
  const { ui } = useUi();
  const { patients } = useClinicData();
  const matched = patients.filter((p) => matchesPatient(p, ui.q));
  return limitWhenEmpty && !ui.q.trim() ? matched.slice(0, limitWhenEmpty) : matched;
}
