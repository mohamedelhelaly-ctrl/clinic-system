import type {
  Appointment,
  AppointmentEvent,
  AuditLog,
  CallLog,
  Clinic,
  Doctor,
  DoctorSchedule,
  MessageLog,
  Package,
  PackageUsage,
  Patient,
  Payment,
  Prescription,
  ScheduleException,
  User,
  VisitRecord,
  VisitRecordRevision,
} from '../domain';

/**
 * Everything the UI reads for one clinic. The demo keeps a whole clinic in
 * memory; a production client would hold a cached, paginated subset of this
 * shape fetched from the API.
 */
export interface ClinicSnapshot {
  clinic: Clinic;
  users: User[];
  doctors: Doctor[];
  schedules: DoctorSchedule[];
  scheduleExceptions: ScheduleException[];
  patients: Patient[];
  appointments: Appointment[];
  appointmentEvents: AppointmentEvent[];
  visitRecords: VisitRecord[];
  visitRecordRevisions: VisitRecordRevision[];
  prescriptions: Prescription[];
  payments: Payment[];
  packages: Package[];
  packageUsages: PackageUsage[];
  messages: MessageLog[];
  calls: CallLog[];
  auditLog: AuditLog[];
}
