import type { ReactNode } from 'react';
import { useClock } from '../../app/ClockProvider';
import { useDirectory } from '../../app/hooks';
import { useUi } from '../../app/uiState';
import { APPOINTMENT_STATUS_UI, statusClass } from '../../components';
import { useClinicData } from '../../data';
import type { Appointment } from '../../domain';
import { addDays, findDayException, slotTimes } from '../../domain';
import { useI18n } from '../../i18n';

export function CalendarScreen() {
  const { t, text, fmt } = useI18n();
  const { ui, set, nav } = useUi();
  const data = useClinicData();
  const dir = useDirectory();
  const today = useClock().today();
  const doctorId = ui.cdoc;
  const doctor = dir.doctor(doctorId);
  const schedule = data.schedules.find((s) => s.doctorId === doctorId)!;
  const chip = (on: boolean) => (on ? 'chip on' : 'chip');
  const ofDoctorOn = (date: string) =>
    data.appointments.filter(
      (a) => a.doctorId === doctorId && a.date === date && a.status !== 'cancelled',
    );
  const open = (a: Appointment) => () => nav('appt', { apptId: a.id });
  const badge = (a: Appointment) => (
    <span className={statusClass(a.status)}>{t(APPOINTMENT_STATUS_UI[a.status].label)}</span>
  );

  const day = addDays(today, ui.cday);
  const dayAppointments = ofDoctorOn(day);
  const blocked = findDayException(data.scheduleExceptions, doctorId, day);

  return (
    <div className="scr">
      <div className="row sb">
        <h1>{t('calendar')}</h1>
        <div className="tabs">
          <button className={chip(ui.cview === 'day')} onClick={() => set({ cview: 'day' })}>
            {t('dayView')}
          </button>
          <button className={chip(ui.cview === 'week')} onClick={() => set({ cview: 'week' })}>
            {t('weekView')}
          </button>
        </div>
      </div>
      <div className="tabs">
        {data.doctors.map((d) => (
          <button
            key={d.id}
            className={chip(doctorId === d.id)}
            onClick={() => set({ cdoc: d.id })}
          >
            {text(d.name)}
          </button>
        ))}
      </div>
      {ui.cview === 'day' && (
        <div className="card col">
          <div className="tabs">
            {[0, 1, 2].map((i) => (
              <button key={i} className={chip(ui.cday === i)} onClick={() => set({ cday: i })}>
                {fmt.dayLabel(addDays(today, i))}
              </button>
            ))}
          </div>
          <div className="cal">
            {slotTimes(schedule, doctor.slotMinutes).map((time) => (
              <CalendarRow key={time} time={time}>
                {dayAppointments
                  .filter((a) => a.time === time)
                  .map((a) => (
                    <button className="ev" key={a.id} onClick={open(a)}>
                      <span>
                        <b>{text(dir.patient(a.patientId).name)}</b>{' '}
                        <span className="sub">· {text(a.reason)}</span>
                      </span>
                      {badge(a)}
                    </button>
                  ))}
              </CalendarRow>
            ))}
          </div>
          {blocked && <p className="sub">{text(blocked.reason)}</p>}
        </div>
      )}
      {ui.cview === 'week' && (
        <div className="week">
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const date = addDays(today, i);
            const items = ofDoctorOn(date).sort((x, y) =>
              (x.time ?? '') < (y.time ?? '') ? -1 : 1,
            );
            const isBlocked = !!findDayException(data.scheduleExceptions, doctorId, date);
            return (
              <div className="card col" style={{ padding: 14, gap: 8 }} key={i}>
                <b>{fmt.dayLabel(date)}</b>
                {items.map((a) => (
                  <button
                    className="ev"
                    key={a.id}
                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
                    onClick={open(a)}
                  >
                    <span className="time">{a.time ?? t('walkinTag')}</span>
                    <span>{text(dir.patient(a.patientId).name)}</span>
                    {badge(a)}
                  </button>
                ))}
                {items.length === 0 && !isBlocked && <span className="sub">{t('free')}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CalendarRow({ time, children }: { time: string; children: ReactNode }) {
  return (
    <>
      <div className="h">{time}</div>
      <div className="c col" style={{ gap: 6 }}>
        {children}
      </div>
    </>
  );
}
