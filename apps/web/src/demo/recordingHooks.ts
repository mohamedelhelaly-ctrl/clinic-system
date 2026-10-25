import type { MockClinicRepository } from '../data/mock';
import type { Appointment, IsoDateTime, PatientReply } from '../domain';
import { addHours, cutoffAt, dateTime, isPreArrival } from '../domain';
import type { DemoClock } from './demoClock';

interface RecordingEnv {
  repository: MockClinicRepository;
  clock: DemoClock;
  reset(): void;
  advance(move: (clock: DemoClock) => void): Promise<void>;
  reply(appointmentId: string, reply: PatientReply): Promise<void>;
}

/** What the recording script can call on `window.__demo` in clean mode. */
export interface RecordingHooks {
  reset(): void;
  advance(by: { hours?: number; days?: number; months?: number }): Promise<string>;
  jumpToReminder(patientName: string): Promise<string>;
  jumpToAppointment(patientName: string): Promise<string>;
  jumpPastCutoff(patientName: string): Promise<string>;
  reply(patientName: string, reply: PatientReply | 'none'): Promise<string>;
  markDelivery(patientName: string, status: 'delivered' | 'failed'): Promise<string>;
  /** Read-only: the patient's latest appointment, for end-state checks. */
  appointment(patientName: string): Pick<Appointment, 'status' | 'paymentStatus' | 'date' | 'time'>;
  now(): IsoDateTime;
}

declare global {
  interface Window {
    __demo?: RecordingHooks;
  }
}

/**
 * Recording mode (`?clean=1`): lets the clip script move time and play patient
 * replies off-camera while the screen updates live, and keeps tel: links from
 * leaving the page. Demo builds only.
 */
export function installRecordingHooks(env: RecordingEnv): void {
  const snapshot = () => env.repository.getSnapshot();
  const patientId = (name: string) => {
    const p = snapshot().patients.find((x) => x.name.value === name);
    if (!p) throw new Error(`No patient named ${name}`);
    return p.id;
  };
  const start = (a: Appointment) => dateTime(a.date, a.time!);
  /** The patient's next appointment that has not started yet. */
  const upcoming = (name: string): Appointment => {
    const id = patientId(name);
    const now = env.clock.now();
    const next = snapshot()
      .appointments.filter(
        (a) => a.patientId === id && a.time !== null && isPreArrival(a.status) && start(a) > now,
      )
      .sort((a, b) => (start(a) < start(b) ? -1 : 1))[0];
    if (!next) throw new Error(`${name} has no upcoming appointment`);
    return next;
  };
  const jump = async (target: IsoDateTime) => {
    await env.advance((c) => c.advanceTo(target));
    return env.clock.now();
  };
  const latest = (name: string): Appointment => {
    const id = patientId(name);
    const mine = snapshot().appointments.filter((a) => a.patientId === id);
    if (!mine.length) throw new Error(`${name} has no appointment`);
    return mine.reduce((a, b) => (a.bookedAt > b.bookedAt ? a : b));
  };

  const hooks: RecordingHooks = {
    reset: () => env.reset(),
    advance: async ({ hours = 0, days = 0, months = 0 }) => {
      await env.advance((c) => {
        if (months) c.advanceMonths(months);
        if (hours || days) c.advanceHours(hours + days * 24);
      });
      return env.clock.now();
    },
    jumpToReminder: (name) => {
      const a = upcoming(name);
      const reminder = snapshot().messages.find(
        (m) => m.type === 'reminder' && m.appointmentId === a.id,
      );
      if (!reminder?.scheduledFor) throw new Error(`${name}'s appointment has no reminder`);
      return jump(reminder.scheduledFor);
    },
    jumpToAppointment: (name) => jump(start(upcoming(name))),
    jumpPastCutoff: (name) => {
      const a = upcoming(name);
      const cutoff = cutoffAt(a, snapshot().clinic.settings.callListCutoffHours)!;
      return jump(addHours(cutoff, 1 / 60));
    },
    reply: async (name, reply) => {
      if (reply === 'none') return hooks.jumpPastCutoff(name);
      await env.reply(upcoming(name).id, reply);
      return env.clock.now();
    },
    markDelivery: async (name, status) => {
      const id = patientId(name);
      const appointments = new Set(
        snapshot()
          .appointments.filter((a) => a.patientId === id)
          .map((a) => a.id),
      );
      const message = snapshot()
        .messages.filter(
          (m) => m.type === 'prescription' && m.appointmentId && appointments.has(m.appointmentId),
        )
        .sort((a, b) => ((a.sentAt ?? '') < (b.sentAt ?? '') ? 1 : -1))[0];
      if (!message) throw new Error(`${name} has no prescription message`);
      // The fake provider reports Delivered on its own after a short delay.
      if (status === 'failed') env.repository.demo.simulateDeliveryFailure(message.id);
      return status;
    },
    appointment: (name) => {
      const { status, paymentStatus, date, time } = latest(name);
      return { status, paymentStatus, date, time };
    },
    now: () => env.clock.now(),
  };
  window.__demo = hooks;

  // Tapping the call button would open the phone dialer and leave the page.
  document.addEventListener(
    'click',
    (e) => {
      if ((e.target as Element | null)?.closest?.('a[href^="tel:"]')) e.preventDefault();
    },
    true,
  );
}
