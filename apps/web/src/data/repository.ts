import type {
  Appointment,
  AppointmentId,
  AppointmentStatus,
  CallOutcome,
  ClinicSettings,
  ClockTime,
  DoctorId,
  Gender,
  IsoDate,
  LocalizedText,
  MessageLog,
  Package,
  PackageAdjustment,
  PackageId,
  Patient,
  PatientId,
  Payment,
  PaymentMethod,
  PrescriptionItem,
  Role,
  UserId,
  VisitRecord,
  VisitRecordFields,
} from '../domain';
import type { ClinicSnapshot } from './snapshot';

/** Who is performing a write. The server takes this from the authenticated session. */
export interface Actor {
  userId: UserId;
  role: Role;
}

export interface NewPatientInput {
  name: string;
  phone: string;
  dateOfBirth: IsoDate | null;
  gender: Gender;
  address: string;
  allergiesAndAlerts: string;
}

export interface PatientPatch {
  phone: string;
  address: string;
  allergiesAndAlerts: string;
}

export interface NewAppointmentInput {
  patientId: PatientId;
  doctorId: DoctorId;
  /** Ignored for walk-ins, which always join today's queue. */
  date: IsoDate;
  /** null books a walk-in. */
  time: ClockTime | null;
  reason: LocalizedText;
}

export interface StatusChangeOptions {
  /** Admin override of the payment gate (In consultation while unpaid). */
  override?: { reason: string };
  /** Optional reason when the clinic cancels. */
  cancelReason?: string;
}

export interface VisitDraft {
  fields: VisitRecordFields;
  items: PrescriptionItem[];
}

export interface NewPackageInput {
  patientId: PatientId;
  totalPrice: number;
  totalVisits: number;
  expiryDate: IsoDate | null;
  notes: string;
}

/**
 * The only way the UI reads or changes clinic data. `MockClinicRepository`
 * implements it in the browser for the demo; a production `ApiClinicRepository`
 * will implement it over HTTP without any change to the UI.
 *
 * Writes enforce the domain rules (status transitions, payment gate, package
 * consumption) and reject with `DomainError` when a rule is broken.
 */
export interface ClinicRepository {
  getSnapshot(): ClinicSnapshot;
  subscribe(listener: () => void): () => void;

  registerPatient(actor: Actor, input: NewPatientInput): Promise<Patient>;
  updatePatient(actor: Actor, patientId: PatientId, patch: PatientPatch): Promise<Patient>;

  bookAppointment(actor: Actor, input: NewAppointmentInput): Promise<Appointment>;
  changeAppointmentStatus(
    actor: Actor,
    appointmentId: AppointmentId,
    to: AppointmentStatus,
    options?: StatusChangeOptions,
  ): Promise<Appointment>;
  rescheduleAppointment(
    actor: Actor,
    appointmentId: AppointmentId,
    slot: { date: IsoDate; time: ClockTime },
  ): Promise<Appointment>;
  logCall(actor: Actor, appointmentId: AppointmentId, outcome: CallOutcome): Promise<void>;

  recordPayment(
    actor: Actor,
    appointmentId: AppointmentId,
    payment: { amount: number; method: PaymentMethod },
  ): Promise<Payment>;
  applyPackageVisit(actor: Actor, appointmentId: AppointmentId): Promise<void>;
  createPackage(actor: Actor, input: NewPackageInput): Promise<Package>;
  adjustPackage(
    actor: Actor,
    packageId: PackageId,
    adjustment: PackageAdjustment,
    reason: string,
  ): Promise<Package>;

  saveVisitDraft(
    actor: Actor,
    appointmentId: AppointmentId,
    draft: VisitDraft,
  ): Promise<VisitRecord>;
  completeVisit(
    actor: Actor,
    appointmentId: AppointmentId,
    draft: VisitDraft,
  ): Promise<VisitRecord>;
  /** Finalizes the prescription, renders the PDF and sends it on WhatsApp. */
  sendPrescription(
    actor: Actor,
    appointmentId: AppointmentId,
    draft: VisitDraft,
  ): Promise<MessageLog>;
  resendMessage(actor: Actor, messageId: string): Promise<MessageLog>;

  blockDoctorDay(actor: Actor, doctorId: DoctorId, date: IsoDate, note: string): Promise<void>;
  updateClinicSettings(actor: Actor, patch: Partial<ClinicSettings>): Promise<void>;

  /** Demo-only hooks. Absent in production; the UI hides demo controls when undefined. */
  readonly demo?: {
    simulateDeliveryFailure(messageId: string): void;
  };
}

export class DomainError extends Error {
  constructor(
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'DomainError';
  }
}
