import type {
  Appointment,
  AppointmentEvent,
  AppointmentEventKind,
  AppointmentId,
  AppointmentStatus,
  AuditAction,
  AuditEntity,
  AuditParams,
  CallOutcome,
  ClinicSettings,
  Clock,
  ClockTime,
  DoctorId,
  IsoDate,
  MessageLog,
  Package,
  PackageAdjustment,
  PackageId,
  Patient,
  PatientId,
  Payment,
  PaymentMethod,
  Prescription,
  VisitRecord,
} from '../../domain';
import {
  adjustPackage,
  checkAppointmentTransition,
  checkPaymentTransition,
  consumeVisit,
  consumesPackageVisit,
  dateTime,
  findActivePackage,
  hasDrug,
  initialAppointmentStatus,
  momentOf,
  reminderPolicy,
} from '../../domain';
import type {
  Actor,
  ClinicRepository,
  NewAppointmentInput,
  NewPackageInput,
  NewPatientInput,
  PatientPatch,
  StatusChangeOptions,
  VisitDraft,
} from '../repository';
import { DomainError } from '../repository';
import type { PrescriptionRenderer } from '../services';
import type { ClinicSnapshot } from '../snapshot';
import type { MockWhatsAppProvider } from './mockServices';
import { LeadTimeReminderScheduler } from './mockServices';
import type { SnapshotStorage } from './storage';
import { STORAGE_VERSION } from './storage';

export interface MockRepositoryOptions {
  seed: () => ClinicSnapshot;
  clock: Clock;
  storage: SnapshotStorage;
  whatsapp: MockWhatsAppProvider;
  renderer: PrescriptionRenderer;
  /** First generated id number (ids look like `a101`, `p102`). */
  initialCounter?: number;
}

/**
 * In-browser implementation of the repository for the demo. It applies the
 * same domain rules the backend will, persists to localStorage, and fakes the
 * server-side effects (WhatsApp delivery, PDF rendering, reminder scheduling).
 */
export class MockClinicRepository implements ClinicRepository {
  private state: ClinicSnapshot;
  private counter: number;
  private listeners = new Set<() => void>();
  private readonly reminders: LeadTimeReminderScheduler;

  constructor(private readonly options: MockRepositoryOptions) {
    const stored = options.storage.load();
    this.state = stored?.snapshot ?? options.seed();
    this.counter = stored?.counter ?? options.initialCounter ?? 100;
    this.reminders = new LeadTimeReminderScheduler(
      () => this.state.clinic.settings.reminderLeadHours,
    );
    options.whatsapp.onStatus((providerMessageId, status) => {
      this.update((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.providerMessageId === providerMessageId
            ? {
                ...m,
                status,
                deliveredAt: status === 'delivered' ? this.options.clock.now() : m.deliveredAt,
              }
            : m,
        ),
      }));
    });
    // A reload can interrupt a pending delivery; let the fake provider finish it.
    this.state.messages
      .filter((m) => m.status === 'sent' && m.providerMessageId)
      .forEach((m) => options.whatsapp.scheduleDelivery(m.providerMessageId!));
  }

  // ---- store plumbing -------------------------------------------------------

  getSnapshot = (): ClinicSnapshot => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Restores the seed data (demo reset). */
  reset(): void {
    this.options.storage.clear();
    this.counter = this.options.initialCounter ?? 100;
    this.state = this.options.seed();
    this.persist();
    this.listeners.forEach((l) => l());
  }

  readonly demo = {
    simulateDeliveryFailure: (messageId: string) => {
      const message = this.state.messages.find((m) => m.id === messageId);
      if (message?.providerMessageId) this.options.whatsapp.fail(message.providerMessageId);
    },
  };

  private update(fn: (s: ClinicSnapshot) => ClinicSnapshot): void {
    this.state = fn(this.state);
    this.persist();
    this.listeners.forEach((l) => l());
  }

  private persist(): void {
    this.options.storage.save({
      version: STORAGE_VERSION,
      counter: this.counter,
      snapshot: this.state,
    });
  }

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}${this.counter}`;
  }

  private now() {
    return this.options.clock.now();
  }

  private get clinicId() {
    return this.state.clinic.id;
  }

  private appointment(id: AppointmentId): Appointment {
    const a = this.state.appointments.find((x) => x.id === id);
    if (!a) throw new DomainError('not_found', `Appointment ${id} not found`);
    return a;
  }

  private patient(id: PatientId): Patient {
    const p = this.state.patients.find((x) => x.id === id);
    if (!p) throw new DomainError('not_found', `Patient ${id} not found`);
    return p;
  }

  private patchAppointment(id: AppointmentId, patch: Partial<Appointment>): Appointment {
    let updated: Appointment | undefined;
    this.update((s) => ({
      ...s,
      appointments: s.appointments.map((a) => (a.id === id ? (updated = { ...a, ...patch }) : a)),
    }));
    return updated!;
  }

  private event(
    actor: Actor,
    appointmentId: AppointmentId,
    kind: AppointmentEventKind,
    params: AuditParams = {},
  ): void {
    const e: AppointmentEvent = {
      id: this.nextId('e'),
      clinicId: this.clinicId,
      appointmentId,
      kind,
      userId: actor.userId,
      role: actor.role,
      params,
      at: this.now(),
    };
    this.update((s) => ({ ...s, appointmentEvents: [...s.appointmentEvents, e] }));
  }

  private audit(
    actor: Actor,
    entity: AuditEntity,
    entityId: string,
    action: AuditAction,
    params: AuditParams,
    before: unknown = null,
    after: unknown = null,
  ): void {
    this.update((s) => ({
      ...s,
      auditLog: [
        {
          id: this.nextId('l'),
          clinicId: this.clinicId,
          userId: actor.userId,
          role: actor.role,
          entity,
          entityId,
          action,
          params,
          before,
          after,
          at: this.now(),
        },
        ...s.auditLog,
      ],
    }));
  }

  private queueReminder(appointment: Appointment): void {
    const leadHours = this.state.clinic.settings.reminderLeadHours;
    if (reminderPolicy(appointment, leadHours) !== 'automatic' || appointment.time === null) return;
    const message: MessageLog = {
      id: this.nextId('m'),
      clinicId: this.clinicId,
      type: 'reminder',
      channel: 'whatsapp',
      appointmentId: appointment.id,
      prescriptionId: null,
      status: 'queued',
      providerMessageId: null,
      scheduledFor: this.reminders.dueAt(dateTime(appointment.date, appointment.time)),
      sentAt: null,
      deliveredAt: null,
      replies: [],
    };
    this.update((s) => ({ ...s, messages: [...s.messages, message] }));
  }

  // ---- patients -------------------------------------------------------------

  async registerPatient(actor: Actor, input: NewPatientInput): Promise<Patient> {
    void actor;
    const patient: Patient = {
      id: this.nextId('p'),
      clinicId: this.clinicId,
      name: { value: input.name.trim() },
      phone: input.phone.replace(/\s/g, ''),
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      address: { value: input.address },
      allergiesAndAlerts: { value: input.allergiesAndAlerts },
      archived: false,
    };
    this.update((s) => ({ ...s, patients: [...s.patients, patient] }));
    return patient;
  }

  async updatePatient(actor: Actor, patientId: PatientId, patch: PatientPatch): Promise<Patient> {
    const before = this.patient(patientId);
    const after: Patient = {
      ...before,
      phone: patch.phone,
      address: { value: patch.address },
      allergiesAndAlerts: { value: patch.allergiesAndAlerts },
    };
    this.update((s) => ({
      ...s,
      patients: s.patients.map((p) => (p.id === patientId ? after : p)),
    }));
    this.audit(
      actor,
      'patient',
      patientId,
      patch.phone !== before.phone ? 'patient.phone_edited' : 'patient.edited',
      { patient: before.name },
      before,
      after,
    );
    return after;
  }

  // ---- appointments ---------------------------------------------------------

  async bookAppointment(actor: Actor, input: NewAppointmentInput): Promise<Appointment> {
    const walkIn = input.time === null;
    const today = this.options.clock.today();
    const doctor = this.state.doctors.find((d) => d.id === input.doctorId);
    const hasPackage = !!findActivePackage(this.state.packages, input.patientId, today);
    const appointment: Appointment = {
      id: this.nextId('a'),
      clinicId: this.clinicId,
      patientId: input.patientId,
      doctorId: input.doctorId,
      date: walkIn ? today : input.date,
      time: input.time,
      durationMinutes: doctor?.slotMinutes ?? 30,
      reason: input.reason,
      source: walkIn ? 'walk_in' : 'phone',
      status: initialAppointmentStatus(walkIn),
      paymentStatus: hasPackage ? 'package' : 'unpaid',
      bookedAt: this.now(),
      arrivedAt: walkIn ? this.now() : null,
      consultationStartedAt: null,
      completedAt: null,
      cancellation: null,
      rescheduledFromId: null,
    };
    this.update((s) => ({ ...s, appointments: [...s.appointments, appointment] }));
    this.event(actor, appointment.id, 'booked');
    this.queueReminder(appointment);
    return appointment;
  }

  async changeAppointmentStatus(
    actor: Actor,
    appointmentId: AppointmentId,
    to: AppointmentStatus,
    options: StatusChangeOptions = {},
  ): Promise<Appointment> {
    const current = this.appointment(appointmentId);
    const check = checkAppointmentTransition(current, to, {
      now: momentOf(this.options.clock),
      override: options.override,
    });
    if (!check.ok) throw new DomainError(check.reason);
    const now = this.now();
    const patch: Partial<Appointment> = { status: to };

    switch (to) {
      case 'confirmed':
        this.addCall(actor, appointmentId, 'confirmed');
        this.event(actor, appointmentId, 'confirmed_manually');
        break;
      case 'arrived':
        patch.arrivedAt = now;
        this.event(actor, appointmentId, 'arrived');
        break;
      case 'in_consultation':
        patch.consultationStartedAt = now;
        if (options.override) {
          const reason = options.override.reason;
          this.event(actor, appointmentId, 'payment_gate_overridden', { reason });
          this.audit(actor, 'appointment', appointmentId, 'payment.gate_overridden', {
            patient: this.patient(current.patientId).name,
            reason,
          });
        } else {
          this.event(actor, appointmentId, 'consultation_started');
        }
        break;
      case 'completed':
        patch.completedAt = now;
        this.event(actor, appointmentId, 'completed');
        break;
      case 'no_show':
        this.event(actor, appointmentId, 'no_show');
        break;
      case 'cancelled':
        patch.cancellation = { source: 'clinic', reason: options.cancelReason ?? '' };
        this.event(actor, appointmentId, 'cancelled_by_clinic', {
          reason: options.cancelReason ?? '',
        });
        break;
      default:
        break;
    }
    if (consumesPackageVisit(current, to)) this.consumePackageVisit(current);
    return this.patchAppointment(appointmentId, patch);
  }

  private consumePackageVisit(appointment: Appointment): void {
    const pkg = findActivePackage(
      this.state.packages,
      appointment.patientId,
      this.options.clock.today(),
    );
    if (!pkg) return;
    this.update((s) => ({
      ...s,
      packages: s.packages.map((k) => (k.id === pkg.id ? consumeVisit(k) : k)),
      packageUsages: [
        ...s.packageUsages,
        {
          clinicId: this.clinicId,
          packageId: pkg.id,
          appointmentId: appointment.id,
          consumedAt: this.now(),
        },
      ],
    }));
  }

  async rescheduleAppointment(
    actor: Actor,
    appointmentId: AppointmentId,
    slot: { date: IsoDate; time: ClockTime },
  ): Promise<Appointment> {
    const old = this.appointment(appointmentId);
    const check = checkAppointmentTransition(old, 'cancelled', {
      now: momentOf(this.options.clock),
    });
    if (!check.ok) throw new DomainError(check.reason);
    const today = this.options.clock.today();
    const replacement: Appointment = {
      ...old,
      id: this.nextId('a'),
      date: slot.date,
      time: slot.time,
      status: 'scheduled',
      paymentStatus:
        old.paymentStatus === 'paid'
          ? 'paid'
          : findActivePackage(this.state.packages, old.patientId, today)
            ? 'package'
            : 'unpaid',
      bookedAt: this.now(),
      arrivedAt: null,
      consultationStartedAt: null,
      completedAt: null,
      cancellation: null,
      rescheduledFromId: old.id,
    };
    this.patchAppointment(old.id, {
      status: 'cancelled',
      cancellation: { source: 'rescheduled', reason: '' },
    });
    this.event(actor, old.id, 'rescheduled_to', { date: slot.date, time: slot.time });
    this.update((s) => ({ ...s, appointments: [...s.appointments, replacement] }));
    this.event(actor, replacement.id, 'rescheduled_from', {
      date: old.date,
      time: old.time ?? '',
    });
    this.queueReminder(replacement);
    return replacement;
  }

  private addCall(actor: Actor, appointmentId: AppointmentId, outcome: CallOutcome): void {
    this.update((s) => ({
      ...s,
      calls: [
        ...s.calls,
        {
          id: this.nextId('c'),
          clinicId: this.clinicId,
          appointmentId,
          outcome,
          loggedBy: actor.userId,
          loggedAt: this.now(),
        },
      ],
    }));
  }

  async logCall(actor: Actor, appointmentId: AppointmentId, outcome: CallOutcome): Promise<void> {
    const current = this.appointment(appointmentId);
    const now = momentOf(this.options.clock);
    if (outcome === 'no_answer') {
      this.addCall(actor, appointmentId, outcome);
      return;
    }
    const to = outcome === 'confirmed' ? 'confirmed' : 'cancelled';
    const check = checkAppointmentTransition(current, to, { now });
    if (!check.ok) throw new DomainError(check.reason);
    this.addCall(actor, appointmentId, outcome);
    if (outcome === 'confirmed') {
      this.event(actor, appointmentId, 'call_confirmed');
      this.patchAppointment(appointmentId, { status: 'confirmed' });
    } else {
      this.event(actor, appointmentId, 'call_cancelled');
      this.patchAppointment(appointmentId, {
        status: 'cancelled',
        cancellation: { source: 'patient_phone', reason: '' },
      });
    }
  }

  // ---- payments and packages -----------------------------------------------

  async recordPayment(
    actor: Actor,
    appointmentId: AppointmentId,
    { amount, method }: { amount: number; method: PaymentMethod },
  ): Promise<Payment> {
    const appointment = this.appointment(appointmentId);
    const check = checkPaymentTransition(appointment, 'paid', { hasActivePackage: false });
    if (!check.ok) throw new DomainError(check.reason);
    if (!(amount > 0)) throw new DomainError('invalid_amount');
    const payment: Payment = {
      id: this.nextId('y'),
      clinicId: this.clinicId,
      appointmentId,
      packageId: null,
      patientId: appointment.patientId,
      amount,
      method,
      recordedBy: actor.userId,
      recordedAt: this.now(),
      voided: false,
    };
    this.update((s) => ({ ...s, payments: [...s.payments, payment] }));
    this.patchAppointment(appointmentId, { paymentStatus: 'paid' });
    this.event(actor, appointmentId, 'payment_recorded', { amount, method });
    return payment;
  }

  async applyPackageVisit(actor: Actor, appointmentId: AppointmentId): Promise<void> {
    const appointment = this.appointment(appointmentId);
    const hasActivePackage = !!findActivePackage(
      this.state.packages,
      appointment.patientId,
      this.options.clock.today(),
    );
    const check = checkPaymentTransition(appointment, 'package', { hasActivePackage });
    if (!check.ok) throw new DomainError(check.reason);
    this.patchAppointment(appointmentId, { paymentStatus: 'package' });
    this.event(actor, appointmentId, 'package_applied');
  }

  async createPackage(actor: Actor, input: NewPackageInput): Promise<Package> {
    if (!(input.totalPrice > 0) || !(input.totalVisits > 0)) {
      throw new DomainError('invalid_package');
    }
    const pkg: Package = {
      id: this.nextId('k'),
      clinicId: this.clinicId,
      patientId: input.patientId,
      totalPrice: input.totalPrice,
      totalVisits: input.totalVisits,
      visitsUsed: 0,
      expiryDate: input.expiryDate,
      notes: input.notes,
    };
    const sale: Payment = {
      id: this.nextId('y'),
      clinicId: this.clinicId,
      appointmentId: null,
      packageId: pkg.id,
      patientId: input.patientId,
      amount: input.totalPrice,
      method: 'cash',
      recordedBy: actor.userId,
      recordedAt: this.now(),
      voided: false,
    };
    this.update((s) => ({ ...s, packages: [...s.packages, pkg], payments: [...s.payments, sale] }));
    this.audit(
      actor,
      'package',
      pkg.id,
      'package.created',
      {
        patient: this.patient(input.patientId).name,
        price: input.totalPrice,
        visits: input.totalVisits,
      },
      null,
      pkg,
    );
    return pkg;
  }

  async adjustPackage(
    actor: Actor,
    packageId: PackageId,
    adjustment: PackageAdjustment,
    reason: string,
  ): Promise<Package> {
    if (reason.trim() === '') throw new DomainError('reason_required');
    const before = this.state.packages.find((k) => k.id === packageId);
    if (!before) throw new DomainError('not_found');
    const after = adjustPackage(before, adjustment, this.options.clock.today());
    this.update((s) => ({
      ...s,
      packages: s.packages.map((k) => (k.id === packageId ? after : k)),
    }));
    this.audit(
      actor,
      'package',
      packageId,
      'package.adjusted',
      { patient: this.patient(before.patientId).name, adjustment, reason },
      before,
      after,
    );
    return after;
  }

  // ---- visit records and prescriptions --------------------------------------

  private upsertDraft(appointmentId: AppointmentId, draft: VisitDraft): VisitRecord {
    const appointment = this.appointment(appointmentId);
    const existing = this.state.visitRecords.find((v) => v.appointmentId === appointmentId);
    const record: VisitRecord = existing
      ? { ...existing, ...draft.fields }
      : {
          id: this.nextId('v'),
          clinicId: this.clinicId,
          appointmentId,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          date: this.options.clock.today(),
          finalizedAt: null,
          ...draft.fields,
        };
    const items = draft.items.filter(hasDrug);
    const existingRx = this.state.prescriptions.find((p) => p.visitRecordId === record.id);
    const prescriptions = existingRx
      ? this.state.prescriptions.map((p) => (p.id === existingRx.id ? { ...p, items } : p))
      : items.length
        ? [
            ...this.state.prescriptions,
            {
              id: this.nextId('rx'),
              clinicId: this.clinicId,
              visitRecordId: record.id,
              items,
              pdfUrl: null,
              finalizedAt: null,
            } satisfies Prescription,
          ]
        : this.state.prescriptions;
    this.update((s) => ({
      ...s,
      visitRecords: existing
        ? s.visitRecords.map((v) => (v.id === record.id ? record : v))
        : [record, ...s.visitRecords],
      prescriptions,
    }));
    return record;
  }

  async saveVisitDraft(
    actor: Actor,
    appointmentId: AppointmentId,
    draft: VisitDraft,
  ): Promise<VisitRecord> {
    void actor;
    return this.upsertDraft(appointmentId, draft);
  }

  async completeVisit(
    actor: Actor,
    appointmentId: AppointmentId,
    draft: VisitDraft,
  ): Promise<VisitRecord> {
    const appointment = this.appointment(appointmentId);
    const check = checkAppointmentTransition(appointment, 'completed', {
      now: momentOf(this.options.clock),
    });
    if (!check.ok) throw new DomainError(check.reason);
    const dash = (v: string) => v || '—';
    const record = this.upsertDraft(appointmentId, {
      fields: {
        complaint: dash(draft.fields.complaint),
        diagnosis: dash(draft.fields.diagnosis),
        treatment: dash(draft.fields.treatment),
      },
      items: draft.items,
    });
    const finalized = { ...record, finalizedAt: this.now() };
    this.update((s) => ({
      ...s,
      visitRecords: s.visitRecords.map((v) => (v.id === record.id ? finalized : v)),
    }));
    this.patchAppointment(appointmentId, { status: 'completed', completedAt: this.now() });
    this.event(actor, appointmentId, 'visit_completed');
    if (consumesPackageVisit(appointment, 'completed')) this.consumePackageVisit(appointment);
    this.audit(
      actor,
      'visit_record',
      record.id,
      'visit_record.completed',
      { patient: this.patient(appointment.patientId).name },
      null,
      finalized,
    );
    return finalized;
  }

  async sendPrescription(
    actor: Actor,
    appointmentId: AppointmentId,
    draft: VisitDraft,
  ): Promise<MessageLog> {
    const record = this.upsertDraft(appointmentId, draft);
    const prescription = this.state.prescriptions.find((p) => p.visitRecordId === record.id);
    if (!prescription || prescription.items.length === 0)
      throw new DomainError('empty_prescription');
    const patient = this.patient(record.patientId);
    const { url } = await this.options.renderer.render(prescription, patient);
    this.update((s) => ({
      ...s,
      prescriptions: s.prescriptions.map((p) =>
        p.id === prescription.id ? { ...p, pdfUrl: url, finalizedAt: this.now() } : p,
      ),
    }));
    const { providerMessageId } = await this.options.whatsapp.send({
      to: patient.phone,
      template: 'prescription',
      params: { patient: patient.name.value },
      attachmentUrl: url,
    });
    const existing = this.state.messages.find(
      (m) => m.type === 'prescription' && m.prescriptionId === prescription.id,
    );
    const message: MessageLog = {
      id: existing?.id ?? this.nextId('m'),
      clinicId: this.clinicId,
      type: 'prescription',
      channel: 'whatsapp',
      appointmentId,
      prescriptionId: prescription.id,
      status: 'sent',
      providerMessageId,
      scheduledFor: null,
      sentAt: this.now(),
      deliveredAt: null,
      replies: [],
    };
    this.update((s) => ({
      ...s,
      messages: existing
        ? s.messages.map((m) => (m.id === existing.id ? message : m))
        : [...s.messages, message],
    }));
    void actor;
    return message;
  }

  async resendMessage(actor: Actor, messageId: string): Promise<MessageLog> {
    void actor;
    const message = this.state.messages.find((m) => m.id === messageId);
    if (!message) throw new DomainError('not_found');
    const { providerMessageId } = await this.options.whatsapp.send({
      to: '',
      template: message.type === 'prescription' ? 'prescription' : 'appointment_reminder',
      params: {},
    });
    const resent: MessageLog = {
      ...message,
      status: 'sent',
      providerMessageId,
      sentAt: this.now(),
      deliveredAt: null,
    };
    this.update((s) => ({
      ...s,
      messages: s.messages.map((m) => (m.id === messageId ? resent : m)),
    }));
    return resent;
  }

  // ---- administration -------------------------------------------------------

  async blockDoctorDay(
    actor: Actor,
    doctorId: DoctorId,
    date: IsoDate,
    note: string,
  ): Promise<void> {
    const doctor = this.state.doctors.find((d) => d.id === doctorId);
    this.update((s) => ({
      ...s,
      scheduleExceptions: [
        ...s.scheduleExceptions,
        {
          id: this.nextId('b'),
          clinicId: this.clinicId,
          doctorId,
          date,
          from: null,
          to: null,
          reason: note ? { value: note } : { value: 'Blocked', ar: 'محجوب' },
        },
      ],
    }));
    this.audit(actor, 'schedule', doctorId, 'schedule.blocked', {
      doctor: doctor?.name ?? { value: doctorId },
    });
  }

  async updateClinicSettings(actor: Actor, patch: Partial<ClinicSettings>): Promise<void> {
    void actor;
    this.update((s) => ({
      ...s,
      clinic: { ...s.clinic, settings: { ...s.clinic.settings, ...patch } },
    }));
  }
}
