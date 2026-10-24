import { useCallback, useMemo } from 'react';
import { useRequiredSession } from '../auth';
import type { HistoryEntry } from '../components';
import type { Actor, ClinicSnapshot } from '../data';
import { useClinicData } from '../data';
import type {
  Appointment,
  AppointmentId,
  ConfirmationChannel,
  Doctor,
  Patient,
  PatientId,
  Role,
  User,
  UserId,
} from '../domain';
import { confirmationChannel, momentOf } from '../domain';
import { useI18n } from '../i18n';
import { useClock } from './ClockProvider';

/** The signed-in user as the author of writes. */
export function useActor(): Actor {
  const session = useRequiredSession();
  return useMemo(() => ({ userId: session.userId, role: session.role }), [session]);
}

export function useNow() {
  return momentOf(useClock());
}

export interface Directory {
  patient(id: PatientId): Patient;
  doctor(id: string): Doctor;
  appointment(id: AppointmentId | null): Appointment | undefined;
  user(id: UserId): User | undefined;
}

/** Lookups by id over the current snapshot. Missing ids fall back like the prototype did. */
export function useDirectory(): Directory {
  const data = useClinicData();
  return useMemo(() => directoryOf(data), [data]);
}

export function directoryOf(data: ClinicSnapshot): Directory {
  const patients = new Map(data.patients.map((p) => [p.id, p]));
  const doctors = new Map(data.doctors.map((d) => [d.id, d]));
  const appointments = new Map(data.appointments.map((a) => [a.id, a]));
  const users = new Map(data.users.map((u) => [u.id, u]));
  return {
    patient: (id) => patients.get(id) ?? data.patients[0]!,
    doctor: (id) => doctors.get(id) ?? data.doctors[0]!,
    appointment: (id) => (id ? appointments.get(id) : undefined),
    user: (id) => users.get(id),
  };
}

/** "Receptionist Nour", "Dr. Karim" or "Admin", as activity text names people. */
export function useActorLabel() {
  const { t, text } = useI18n();
  const dir = useDirectory();
  return useCallback(
    (userId: UserId, role: Role) => {
      const user = dir.user(userId);
      if (role === 'admin') return t('actorAdmin');
      if (role === 'receptionist') return t('actorReceptionist', { name: text(user?.shortName) });
      return text(user?.shortName);
    },
    [dir, t, text],
  );
}

/** Finalized visit records of a patient, newest first. */
export function usePatientHistory(patientId: PatientId): HistoryEntry[] {
  const data = useClinicData();
  const { text } = useI18n();
  const dir = useDirectory();
  return useMemo(
    () =>
      data.visitRecords
        .filter((v) => v.patientId === patientId && v.finalizedAt !== null)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((record) => ({ record, doctorName: text(dir.doctor(record.doctorId).name) })),
    [data.visitRecords, patientId, dir, text],
  );
}

/** How each appointment was confirmed, derived from its message and call logs. */
export function useConfirmationChannels(): (
  appointmentId: AppointmentId,
) => ConfirmationChannel | null {
  const data = useClinicData();
  return useMemo(() => {
    const cache = new Map<AppointmentId, ConfirmationChannel | null>();
    return (id) => {
      if (!cache.has(id)) {
        cache.set(
          id,
          confirmationChannel(
            data.messages.filter((m) => m.appointmentId === id),
            data.calls.filter((c) => c.appointmentId === id),
          ),
        );
      }
      return cache.get(id)!;
    };
  }, [data.messages, data.calls]);
}
