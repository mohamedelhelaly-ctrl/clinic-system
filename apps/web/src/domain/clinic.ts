import type { ClinicId, ClinicScoped, Language, LocalizedText } from './common';

export interface ClinicSettings {
  /** Hours before the appointment when the WhatsApp reminder goes out. */
  reminderLeadHours: number;
  /** Hours before the appointment when an unanswered reminder becomes "Needs call". */
  callListCutoffHours: number;
  /** Optional second reminder closer to the appointment (spec RC-6). */
  secondReminderEnabled: boolean;
  defaultLanguage: Language;
}

export interface Clinic {
  id: ClinicId;
  name: LocalizedText;
  address: LocalizedText;
  phone: string;
  logoUrl: string | null;
  settings: ClinicSettings;
}

export type ClinicOwned<T> = T & ClinicScoped;
