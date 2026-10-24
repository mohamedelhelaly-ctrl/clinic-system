/** Calendar date in the clinic's local time zone, `YYYY-MM-DD`. */
export type IsoDate = string;
/** Wall-clock time in the clinic's local time zone, `HH:mm` (24h). */
export type ClockTime = string;
/** Local date-time, `YYYY-MM-DDTHH:mm`. Production stores UTC instants; the demo has one clinic and one zone. */
export type IsoDateTime = string;

export type ClinicId = string;
export type UserId = string;
export type DoctorId = string;
export type PatientId = string;
export type AppointmentId = string;
export type VisitRecordId = string;
export type PrescriptionId = string;
export type PaymentId = string;
export type PackageId = string;

export type Language = 'en' | 'ar';

/**
 * Free text as entered, with an optional Arabic display form.
 * Real records hold one value in whatever script the user typed; the demo seed
 * carries both so the language toggle reads naturally.
 */
export interface LocalizedText {
  value: string;
  ar?: string;
}

export function localize(text: LocalizedText | undefined, lang: Language): string {
  if (!text) return '';
  return lang === 'ar' && text.ar ? text.ar : text.value;
}

export function plainText(value: string): LocalizedText {
  return { value };
}

/** Every stored record belongs to a clinic (multi-clinic ready from day one). */
export interface ClinicScoped {
  clinicId: ClinicId;
}
