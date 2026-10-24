import { useClock } from '../../app/ClockProvider';
import { useActorLabel, useConfirmationChannels } from '../../app/hooks';
import type { IconName } from '../../components';
import { useClinicData } from '../../data';
import type {
  Appointment,
  AppointmentEvent,
  AppointmentEventKind,
  IsoDateTime,
} from '../../domain';
import { reminderDueAt, reminderPolicy } from '../../domain';
import type { MessageKey } from '../../i18n';
import { useI18n } from '../../i18n';

export interface LogLine {
  icon: IconName;
  text: string;
  when: string;
}

const EVENT_UI: Record<AppointmentEventKind, { icon: IconName; text: MessageKey }> = {
  booked: { icon: 'edit', text: 'evBooked' },
  arrived: { icon: 'check', text: 'evArrived' },
  confirmed_manually: { icon: 'phone', text: 'evConfirmedManually' },
  call_confirmed: { icon: 'phone', text: 'evCallConfirmed' },
  call_cancelled: { icon: 'x', text: 'evCallCancelled' },
  consultation_started: { icon: 'check', text: 'evConsultationStarted' },
  completed: { icon: 'check', text: 'evCompleted' },
  visit_completed: { icon: 'check', text: 'evVisitCompleted' },
  no_show: { icon: 'alert', text: 'evNoShow' },
  cancelled_by_clinic: { icon: 'x', text: 'evCancelled' },
  payment_gate_overridden: { icon: 'alert', text: 'evOverride' },
  payment_recorded: { icon: 'card', text: 'evPaymentRecorded' },
  package_applied: { icon: 'card', text: 'evPackageApplied' },
  rescheduled_to: { icon: 'edit', text: 'evRescheduledTo' },
  rescheduled_from: { icon: 'edit', text: 'evRescheduledFrom' },
};

/**
 * The "Reminder & call log" for an appointment, built from the message log,
 * call log and appointment events (not from any status field).
 */
export function useAppointmentLog(appointment: Appointment): LogLine[] {
  const { t, fmt } = useI18n();
  const data = useClinicData();
  const today = useClock().today();
  const channelOf = useConfirmationChannels();
  const actorLabel = useActorLabel();
  const { reminderLeadHours, callListCutoffHours } = data.clinic.settings;

  const at = (value: IsoDateTime) =>
    value.slice(0, 10) === today
      ? t('todayAt', { time: value.slice(11, 16) })
      : `${fmt.dayLabel(value.slice(0, 10))} ${value.slice(11, 16)}`;

  const eventText = (e: AppointmentEvent) => {
    const p = e.params;
    switch (e.kind) {
      case 'booked':
        return t('evBooked', { actor: actorLabel(e.userId, e.role) });
      case 'cancelled_by_clinic':
        return p.reason
          ? t('withReason', { text: t('evCancelled'), reason: String(p.reason) })
          : t('evCancelled');
      case 'rescheduled_to':
      case 'rescheduled_from':
        return t(EVENT_UI[e.kind].text, {
          when: `${fmt.dayLabel(String(p.date))} ${String(p.time)}`,
        });
      case 'payment_gate_overridden':
        return t('evOverride', { reason: String(p.reason) });
      case 'payment_recorded':
        return t('evPaymentRecorded', { amount: Number(p.amount), method: String(p.method) });
      default:
        return t(EVENT_UI[e.kind].text);
    }
  };

  const lines: LogLine[] = [];
  const policy = reminderPolicy(appointment, reminderLeadHours);
  const reminder = data.messages.find(
    (m) => m.type === 'reminder' && m.appointmentId === appointment.id,
  );
  const channel = channelOf(appointment.id);

  if (policy === 'walk_in') lines.push({ icon: 'walk', text: t('logWalkin'), when: t('today') });
  else if (policy === 'booked_too_late') {
    lines.push({ icon: 'bell', text: t('logShort'), when: t('today') });
  } else {
    const sendAt = reminder?.scheduledFor ?? reminderDueAt(appointment, reminderLeadHours)!;
    lines.push({ icon: 'bell', text: t('logReminder'), when: fmt.reminderTime(sendAt) });
  }
  for (const r of reminder?.replies ?? []) {
    lines.push({
      icon: 'wa',
      text: r.reply === 'confirm' ? t('logReplyConfirm') : t('logReplyCancel'),
      when: t('viaWhatsapp'),
    });
  }
  if (channel === 'phone')
    lines.push({ icon: 'phone', text: t('logPhoneConfirmed'), when: t('today') });
  if (
    !channel &&
    policy === 'automatic' &&
    appointment.status !== 'cancelled' &&
    appointment.status !== 'no_show'
  ) {
    lines.push({ icon: 'clock', text: t('logNoReply'), when: '' });
  }
  if (appointment.status === 'needs_call') {
    lines.push({ icon: 'alert', text: t('logCutoff', { h: callListCutoffHours }), when: '' });
  }
  data.calls
    .filter((c) => c.appointmentId === appointment.id && c.outcome === 'no_answer')
    .forEach((c) =>
      lines.push({
        icon: 'phone',
        text: t('logCallAttempt', { outcome: t('noAnswer') }),
        when: at(c.loggedAt),
      }),
    );
  data.appointmentEvents
    .filter((e) => e.appointmentId === appointment.id)
    .forEach((e) =>
      lines.push({ icon: EVENT_UI[e.kind].icon, text: eventText(e), when: at(e.at) }),
    );
  return lines;
}
