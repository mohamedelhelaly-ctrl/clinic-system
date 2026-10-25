import { useClock } from '../app/ClockProvider';
import { useUi } from '../app/uiState';
import { useClinicData } from '../data';
import type { AppointmentId, IsoDateTime, PatientReply } from '../domain';
import {
  addHours,
  cutoffAt,
  datePart,
  dateTime,
  isPreArrival,
  timePart,
  wasReminderSent,
} from '../domain';
import { useI18n } from '../i18n';
import { useDemo } from './DemoProvider';

/**
 * Simulates the outside world for one appointment: jump the demo clock to the
 * reminder or the visit, and play the patient's WhatsApp reply. Demo builds only.
 */
export function DemoAppointmentPanel({ appointmentId }: { appointmentId: AppointmentId }) {
  const { t, fmt } = useI18n();
  const { toast } = useUi();
  const demo = useDemo();
  const data = useClinicData();
  const now = useClock().now();
  const a = data.appointments.find((x) => x.id === appointmentId);
  if (!a) return null;

  const reminder = data.messages.find(
    (m) => m.type === 'reminder' && m.appointmentId === appointmentId,
  );
  const sent = wasReminderSent(reminder);
  const open = isPreArrival(a.status);
  const start = a.time ? dateTime(a.date, a.time) : null;
  const due = reminder?.scheduledFor ?? null;
  const cutoff = cutoffAt(a, data.clinic.settings.callListCutoffHours);
  const at = (v: IsoDateTime) => `${fmt.dayLabel(datePart(v))} ${timePart(v)}`;
  const jumpTo = (target: IsoDateTime) => () => void demo.advance((c) => c.advanceTo(target));
  const reply = (r: PatientReply) => async () => {
    await demo.reply(appointmentId, r);
    toast(t('toastDemoReply'));
  };

  const status = !reminder
    ? t('demoReminderNone')
    : sent
      ? t('demoReminderSent', { when: at(reminder.sentAt!) })
      : t('demoReminderQueued', { when: at(due!) });

  return (
    <div className="card col demo-panel" data-testid="demo-appointment-panel">
      <div className="row sb">
        <h2>{t('demoSimulate')}</h2>
        <span className="demo-badge">{t('demoBadge')}</span>
      </div>
      <p className="sub" data-testid="demo-reminder-status">
        {status}
      </p>
      <div className="row">
        <button
          className="btn sm"
          data-testid="demo-jump-reminder"
          disabled={!open || !due || due <= now}
          onClick={jumpTo(due ?? now)}
        >
          {t('demoJumpReminder')}
        </button>
        <button
          className="btn sm"
          data-testid="demo-jump-appointment"
          disabled={!start || start <= now}
          onClick={jumpTo(start ?? now)}
        >
          {t('demoJumpAppt')}
        </button>
      </div>
      <div className="lbl">
        {t('demoReply')}
        <div className="row">
          <button
            className="chip"
            data-testid="demo-reply-confirm"
            disabled={!open || !sent}
            onClick={reply('confirm')}
          >
            {t('demoReplyConfirm')}
          </button>
          <button
            className="chip"
            data-testid="demo-reply-cancel"
            disabled={!open || !sent}
            onClick={reply('cancel')}
          >
            {t('demoReplyCancel')}
          </button>
          <button
            className="chip"
            data-testid="demo-no-reply"
            disabled={a.status !== 'scheduled' || !reminder || !cutoff || cutoff < now}
            onClick={jumpTo(addHours(cutoff ?? now, 1 / 60))}
          >
            {t('demoNoReply')}
          </button>
        </div>
      </div>
    </div>
  );
}
