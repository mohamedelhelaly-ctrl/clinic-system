import type {
  ClinicScoped,
  ClockTime,
  DoctorId,
  IsoDate,
  LocalizedText,
  PatientId,
  UserId,
} from './common';
import type { Role } from './permissions/roles';

export type Gender = 'F' | 'M';

export interface User extends ClinicScoped {
  id: UserId;
  name: LocalizedText;
  /** How the user is named in activity text, e.g. "Nour" or "Dr. Karim". */
  shortName: LocalizedText;
  email: string;
  roles: Role[];
  gender: Gender;
  active: boolean;
}

export interface Doctor extends ClinicScoped {
  id: DoctorId;
  userId: UserId;
  name: LocalizedText;
  specialty: LocalizedText;
  /** Single-visit consultation fee in EGP. */
  fee: number;
  slotMinutes: number;
}

export interface DoctorSchedule extends ClinicScoped {
  doctorId: DoctorId;
  /** JavaScript weekday numbers (0 = Sunday … 6 = Saturday). */
  weekdays: number[];
  /** Start time of the first bookable slot. */
  firstSlot: ClockTime;
  /** Start time of the last bookable slot. */
  lastSlot: ClockTime;
}

export interface ScheduleException extends ClinicScoped {
  id: string;
  doctorId: DoctorId;
  date: IsoDate;
  /** Whole day when both are null. */
  from: ClockTime | null;
  to: ClockTime | null;
  reason: LocalizedText;
}

export interface Patient extends ClinicScoped {
  id: PatientId;
  name: LocalizedText;
  phone: string;
  dateOfBirth: IsoDate | null;
  gender: Gender;
  address: LocalizedText;
  /** Stored on the patient only, never copied onto appointments (spec PM-3). */
  allergiesAndAlerts: LocalizedText;
  archived: boolean;
}
