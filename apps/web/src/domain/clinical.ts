import type {
  AppointmentId,
  ClinicScoped,
  DoctorId,
  IsoDate,
  IsoDateTime,
  PatientId,
  PrescriptionId,
  UserId,
  VisitRecordId,
} from './common';

export interface VisitRecordFields {
  complaint: string;
  diagnosis: string;
  treatment: string;
}

export interface VisitRecord extends ClinicScoped, VisitRecordFields {
  id: VisitRecordId;
  appointmentId: AppointmentId | null;
  patientId: PatientId;
  doctorId: DoctorId;
  date: IsoDate;
  /** null while the doctor is still drafting (spec VR-7). */
  finalizedAt: IsoDateTime | null;
}

/** Previous values kept whenever a saved visit record is edited (spec VR-6). */
export interface VisitRecordRevision extends ClinicScoped, VisitRecordFields {
  visitRecordId: VisitRecordId;
  editedBy: UserId;
  editedAt: IsoDateTime;
}

export interface PrescriptionItem {
  drug: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Prescription extends ClinicScoped {
  id: PrescriptionId;
  visitRecordId: VisitRecordId;
  items: PrescriptionItem[];
  /** Produced by the PDF renderer; a file name in the demo. */
  pdfUrl: string | null;
  finalizedAt: IsoDateTime | null;
}

export function hasDrug(item: PrescriptionItem): boolean {
  return item.drug.trim() !== '';
}
