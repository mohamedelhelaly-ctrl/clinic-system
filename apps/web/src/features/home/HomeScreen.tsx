import { useMemo } from 'react';
import { useConfirmationChannels, useDirectory } from '../../app/hooks';
import { useClock } from '../../app/ClockProvider';
import { useUi } from '../../app/uiState';
import { useRequiredSession } from '../../auth';
import { APPOINTMENT_STATUS_UI, Icon, StatusBadges } from '../../components';
import { useClinicData } from '../../data';
import type { AppointmentStatus } from '../../domain';
import { APPOINTMENT_STATUSES, can, isActive, needsAttention } from '../../domain';
import { useI18n } from '../../i18n';
import { useStartBooking } from '../booking/useStartBooking';

export function HomeScreen() {
  const { t, text, fmt } = useI18n();
  const { ui, set, nav } = useUi();
  const data = useClinicData();
  const dir = useDirectory();
  const channel = useConfirmationChannels();
  const session = useRequiredSession();
  const today = useClock().today();
  const startBooking = useStartBooking();

  const todays = useMemo(() => data.appointments.filter((a) => a.date === today), [data, today]);
  const stats = [
    { n: todays.filter((a) => a.status !== 'cancelled').length, l: t('statTotal') },
    { n: todays.filter((a) => a.status === 'arrived').length, l: t('statArrived') },
    { n: todays.filter((a) => isActive(a.status)).length, l: t('statRemaining') },
  ];
  const sortKey = (a: (typeof todays)[number]) => a.time ?? `99:99${a.id}`;
  const rows = todays
    .filter(
      (a) =>
        (ui.fDoc === 'all' || a.doctorId === ui.fDoc) &&
        (ui.fSt === 'all' || a.status === ui.fSt) &&
        (!ui.attn || needsAttention(a)),
    )
    .sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));
  const canBook = can(session.role, 'appointment.create');

  return (
    <div className="scr">
      <div className="row sb">
        <div>
          <h1>{t('today')}</h1>
          <p className="sub">{fmt.longDate(today)}</p>
        </div>
        {canBook && (
          <div className="row">
            <button className="btn lg" onClick={() => startBooking(null, true)}>
              <Icon name="walk" />
              {t('walkin')}
            </button>
            <button className="btn p lg hide-m" onClick={() => startBooking()}>
              <Icon name="plus" />
              {t('newAppt')}
            </button>
          </div>
        )}
      </div>
      <div className="cards3">
        {stats.map((st) => (
          <div className="card stat" key={st.l}>
            {/* The inner span picks up `.stat span`, matching the prototype as rendered. */}
            <b>
              <span>{st.n}</span>
            </b>
            <span>{st.l}</span>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: '8px 16px 4px' }}>
        <div className="row" style={{ padding: '10px 0 14px' }}>
          <select
            className="inp"
            style={{ width: 'auto', minWidth: 170 }}
            value={ui.fDoc}
            onChange={(e) => set({ fDoc: e.target.value })}
            aria-label={t('doctor')}
          >
            <option value="all">{t('allDocs')}</option>
            {data.doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {text(d.name)}
              </option>
            ))}
          </select>
          <select
            className="inp"
            style={{ width: 'auto', minWidth: 170 }}
            value={ui.fSt}
            onChange={(e) => set({ fSt: e.target.value as 'all' | AppointmentStatus })}
            aria-label={t('status')}
          >
            <option value="all">{t('allStatus')}</option>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(APPOINTMENT_STATUS_UI[s].label)}
              </option>
            ))}
          </select>
          <button className={ui.attn ? 'chip on' : 'chip'} onClick={() => set({ attn: !ui.attn })}>
            <Icon name="alert" small />
            {t('needsAttention')}
          </button>
        </div>
        <div className="th">
          <span>{t('time')}</span>
          <span>{t('patient')}</span>
          <span>{t('doctor')}</span>
          <span>{t('reason')}</span>
          <span>{t('status')}</span>
        </div>
        <div className="tbl">
          {rows.map((a) => {
            const p = dir.patient(a.patientId);
            const d = dir.doctor(a.doctorId);
            return (
              <button className="tr" key={a.id} onClick={() => nav('appt', { apptId: a.id })}>
                <span className="time">{a.time ?? t('walkinTag')}</span>
                <span>
                  <b>{text(p.name)}</b>
                  <br />
                  <span className="sub">{p.phone}</span>
                </span>
                <span>
                  <span>{text(d.name)}</span>
                  <br />
                  <span className="sub">{text(d.specialty)}</span>
                </span>
                <span>{text(a.reason)}</span>
                <span className="badges">
                  <StatusBadges
                    status={a.status}
                    paymentStatus={a.paymentStatus}
                    channel={channel(a.id)}
                  />
                </span>
              </button>
            );
          })}
          {rows.length === 0 && (
            <p className="sub" style={{ padding: '28px 8px', textAlign: 'center' }}>
              {t('noRows')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
