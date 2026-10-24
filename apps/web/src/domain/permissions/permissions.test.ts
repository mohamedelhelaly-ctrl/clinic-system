import { describe, expect, it } from 'vitest';
import type { AppointmentStatus, PaymentStatus } from '../status';
import { getAppointmentActions } from './appointmentActions';
import type { Permission } from './permissions';
import { can, canSeeClinicalContent, PERMISSIONS, permissionsFor } from './permissions';
import { isRole } from './roles';

describe('permission matrix', () => {
  it('admin can do everything', () => {
    expect(permissionsFor('admin')).toEqual([...PERMISSIONS]);
  });

  it('receptionists never see clinical content', () => {
    expect(canSeeClinicalContent('receptionist')).toBe(false);
    expect(can('receptionist', 'visitRecord.view')).toBe(false);
    expect(can('receptionist', 'visitRecord.write')).toBe(false);
    expect(can('receptionist', 'prescription.write')).toBe(false);
    expect(canSeeClinicalContent('doctor')).toBe(true);
    expect(canSeeClinicalContent('admin')).toBe(true);
  });

  it('receptionists can view prescriptions to resend them', () => {
    expect(can('receptionist', 'prescription.view')).toBe(true);
  });

  it('doctors see payments read-only', () => {
    expect(can('doctor', 'payment.view')).toBe(true);
    expect(can('doctor', 'payment.record')).toBe(false);
    expect(can('doctor', 'package.manage')).toBe(false);
  });

  it('only admins override the payment gate, manage settings and read the audit log', () => {
    const adminOnly: Permission[] = [
      'payment.overrideGate',
      'settings.manage',
      'schedule.manage',
      'audit.view',
    ];
    for (const p of adminOnly) {
      expect(can('admin', p)).toBe(true);
      expect(can('doctor', p)).toBe(false);
      expect(can('receptionist', p)).toBe(false);
    }
  });

  it('gives each role the screens of the prototype', () => {
    const screens = (r: 'receptionist' | 'doctor' | 'admin') =>
      permissionsFor(r).filter((p) => p.startsWith('screen.'));
    expect(screens('receptionist')).toEqual([
      'screen.home',
      'screen.calendar',
      'screen.callList',
      'screen.payments',
      'screen.patients',
    ]);
    expect(screens('doctor')).toEqual([
      'screen.home',
      'screen.calendar',
      'screen.payments',
      'screen.patients',
    ]);
    expect(screens('admin')).toHaveLength(7);
  });

  it('validates role names', () => {
    expect(isRole('doctor')).toBe(true);
    expect(isRole('patient')).toBe(false);
  });
});

describe('appointment actions', () => {
  const now = { date: '2026-10-24', time: '10:15' };
  const actions = (
    role: 'receptionist' | 'doctor' | 'admin',
    status: AppointmentStatus,
    paymentStatus: PaymentStatus = 'unpaid',
    time: string | null = '12:00',
    hasActivePackage = false,
  ) =>
    getAppointmentActions(
      role,
      { status, paymentStatus, date: '2026-10-24', time },
      { now, hasActivePackage },
    );

  it('receptionist handles a scheduled appointment but cannot start it', () => {
    const a = actions('receptionist', 'scheduled');
    expect(a).toMatchObject({
      confirm: true,
      markArrived: true,
      reschedule: true,
      cancel: true,
      startConsultation: false,
    });
    expect(a.markNoShow).toBe(false);
  });

  it('offers no-show once the slot has passed', () => {
    expect(actions('receptionist', 'confirmed', 'unpaid', '10:00').markNoShow).toBe(true);
    expect(actions('receptionist', 'confirmed', 'unpaid', null).markNoShow).toBe(false);
  });

  it('hides "Mark confirmed" once confirmed', () => {
    expect(actions('receptionist', 'confirmed').confirm).toBe(false);
    expect(actions('receptionist', 'needs_call').confirm).toBe(true);
  });

  it('doctor starts the consultation, blocked until paid', () => {
    const unpaid = actions('doctor', 'arrived');
    expect(unpaid).toMatchObject({
      startConsultation: true,
      startConsultationBlocked: true,
      overridePaymentGate: false,
      paymentRequiredHint: true,
    });
    expect(unpaid.markArrived).toBe(false);
    const paid = actions('doctor', 'arrived', 'paid');
    expect(paid).toMatchObject({
      startConsultation: true,
      startConsultationBlocked: false,
      paymentRequiredHint: false,
    });
  });

  it('admin may override the payment gate', () => {
    expect(actions('admin', 'arrived').overridePaymentGate).toBe(true);
    expect(actions('admin', 'arrived', 'package').overridePaymentGate).toBe(false);
  });

  it('opens the visit record and completes during the consultation', () => {
    expect(actions('doctor', 'in_consultation', 'paid')).toMatchObject({
      openVisitRecord: true,
      complete: true,
    });
    expect(actions('receptionist', 'in_consultation', 'paid')).toMatchObject({
      openVisitRecord: false,
      complete: false,
    });
  });

  it('marks final appointments and stops payments on closed ones', () => {
    expect(actions('receptionist', 'completed', 'paid').isFinal).toBe(true);
    expect(actions('receptionist', 'cancelled').recordPayment).toBe(false);
    expect(actions('receptionist', 'no_show').recordPayment).toBe(false);
  });

  it('records payments and applies packages for front desk roles only', () => {
    expect(actions('receptionist', 'arrived', 'unpaid', '12:00', true)).toMatchObject({
      recordPayment: true,
      applyPackage: true,
    });
    expect(actions('receptionist', 'arrived', 'unpaid', '12:00', false).applyPackage).toBe(false);
    expect(actions('doctor', 'arrived', 'unpaid', '12:00', true)).toMatchObject({
      recordPayment: false,
      applyPackage: false,
    });
  });
});
