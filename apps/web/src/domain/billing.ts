import type {
  AppointmentId,
  ClinicScoped,
  IsoDate,
  IsoDateTime,
  PackageId,
  PatientId,
  PaymentId,
  UserId,
} from './common';

export type PaymentMethod = 'cash' | 'card' | 'transfer';

export const PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'card', 'transfer'];

export interface Payment extends ClinicScoped {
  id: PaymentId;
  /** Set for a single-visit payment. */
  appointmentId: AppointmentId | null;
  /** Set for a package sale. */
  packageId: PackageId | null;
  patientId: PatientId;
  amount: number;
  method: PaymentMethod;
  recordedBy: UserId;
  recordedAt: IsoDateTime;
  voided: boolean;
}

export interface Package extends ClinicScoped {
  id: PackageId;
  patientId: PatientId;
  totalPrice: number;
  totalVisits: number;
  visitsUsed: number;
  expiryDate: IsoDate | null;
  notes: string;
}

export interface PackageUsage extends ClinicScoped {
  packageId: PackageId;
  appointmentId: AppointmentId;
  consumedAt: IsoDateTime;
}

export type PackageAdjustment = 'add_visit' | 'remove_visit' | 'extend_expiry';
