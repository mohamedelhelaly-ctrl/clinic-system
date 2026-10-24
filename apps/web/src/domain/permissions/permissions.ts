import type { Role } from './roles';

/**
 * Everything a role can do, in one place. The UI asks `can(role, permission)`
 * and never checks role names directly. The backend must enforce the same table.
 */
export const PERMISSIONS = [
  // Screens
  'screen.home',
  'screen.calendar',
  'screen.callList',
  'screen.payments',
  'screen.patients',
  'screen.settings',
  'screen.audit',
  // Patients
  'patient.create',
  'patient.edit',
  // Appointments
  'appointment.create',
  'appointment.quickCreate',
  'appointment.confirm',
  'appointment.markArrived',
  'appointment.startConsultation',
  'appointment.complete',
  'appointment.markNoShow',
  'appointment.reschedule',
  'appointment.cancel',
  'callList.logOutcome',
  // Clinical
  'visitRecord.view',
  'visitRecord.write',
  'prescription.view',
  'prescription.write',
  // Money
  'payment.view',
  'payment.record',
  'payment.applyPackage',
  'payment.overrideGate',
  'package.manage',
  // Administration
  'schedule.manage',
  'settings.manage',
  'audit.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const RECEPTIONIST: Permission[] = [
  'screen.home',
  'screen.calendar',
  'screen.callList',
  'screen.payments',
  'screen.patients',
  'patient.create',
  'patient.edit',
  'appointment.create',
  'appointment.quickCreate',
  'appointment.confirm',
  'appointment.markArrived',
  'appointment.markNoShow',
  'appointment.reschedule',
  'appointment.cancel',
  'callList.logOutcome',
  // Sees that a prescription exists so it can be resent; never the visit record.
  'prescription.view',
  'payment.view',
  'payment.record',
  'payment.applyPackage',
  'package.manage',
];

const DOCTOR: Permission[] = [
  'screen.home',
  'screen.calendar',
  'screen.patients',
  'screen.payments',
  'patient.create',
  'patient.edit',
  // The prototype lets doctors book from the desktop "New appointment" button and
  // walk-in flow, but not from the phone shortcut. See docs/clinic-system-spec.md §2.
  'appointment.create',
  'appointment.startConsultation',
  'appointment.complete',
  'visitRecord.view',
  'visitRecord.write',
  'prescription.view',
  'prescription.write',
  'payment.view',
];

const ADMIN: Permission[] = [...PERMISSIONS];

const MATRIX: Readonly<Record<Role, ReadonlySet<Permission>>> = {
  receptionist: new Set(RECEPTIONIST),
  doctor: new Set(DOCTOR),
  admin: new Set(ADMIN),
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].has(permission);
}

export function permissionsFor(role: Role): Permission[] {
  return PERMISSIONS.filter((p) => MATRIX[role].has(p));
}

/** Clinical content (complaint, diagnosis, treatment) is for doctors and admins only. */
export function canSeeClinicalContent(role: Role): boolean {
  return can(role, 'visitRecord.view');
}
