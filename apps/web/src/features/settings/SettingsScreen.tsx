import { useActor } from '../../app/hooks';
import { useUi } from '../../app/uiState';
import { Icon, initial } from '../../components';
import { useClinicData, useRepository } from '../../data';
import type { Role } from '../../domain';
import type { MessageKey } from '../../i18n';
import { useI18n } from '../../i18n';

const ROLE_LABEL: Record<Role, MessageKey> = {
  receptionist: 'rRec',
  doctor: 'rDoc',
  admin: 'rAdm',
};
const TABS = [
  ['docs', 'doctors'],
  ['clinic', 'clinic'],
  ['rem', 'reminders'],
  ['users', 'users'],
] as const;

export function SettingsScreen() {
  const { t, text, fmt } = useI18n();
  const { ui, set, toast } = useUi();
  const data = useClinicData();
  const repo = useRepository();
  const actor = useActor();
  const settings = data.clinic.settings;
  const chip = (on: boolean) => (on ? 'chip on' : 'chip');

  const setCutoff = (h: number) =>
    void repo.updateClinicSettings(actor, { callListCutoffHours: Math.min(12, Math.max(1, h)) });

  return (
    <div className="scr">
      <h1>{t('settings')}</h1>
      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={chip(ui.stab === key)} onClick={() => set({ stab: key })}>
            {t(label)}
          </button>
        ))}
      </div>
      {ui.stab === 'docs' &&
        data.doctors.map((d) => {
          const schedule = data.schedules.find((s) => s.doctorId === d.id)!;
          const blocks = data.scheduleExceptions.filter((b) => b.doctorId === d.id);
          return (
            <div className="card col" key={d.id}>
              <div className="row">
                <span className="av">{initial(text(d.name))}</span>
                <div>
                  <b>{text(d.name)}</b>
                  <br />
                  <span className="sub">{text(d.specialty)}</span>
                </div>
              </div>
              <div className="form">
                <div>
                  <span className="mini">{t('workDays')}</span>
                  <br />
                  {t('daysTxt')}
                </div>
                <div>
                  <span className="mini">{t('hours')}</span>
                  <br />
                  {`${schedule.firstSlot} – ${schedule.lastSlot}`}
                </div>
                <div>
                  <span className="mini">{t('slotLen')}</span>
                  <br />
                  {t('slotMinutes', { n: d.slotMinutes })}
                </div>
              </div>
              {blocks.map((b) => (
                <div className="locked" key={b.id}>
                  {`${fmt.dayLabel(b.date)} · ${text(b.reason)}`}
                </div>
              ))}
              <div>
                <button
                  className="btn sm"
                  onClick={() => set({ sheet: 'block', blkDoc: d.id, blkNote: '' })}
                >
                  {t('blockOff')}
                </button>
              </div>
            </div>
          );
        })}
      {ui.stab === 'clinic' && (
        <div className="card col">
          <div className="form">
            <label className="lbl">
              {t('clinicLbl')}
              <input
                className="inp"
                defaultValue={text(data.clinic.name)}
                key={`n${text(data.clinic.name)}`}
              />
            </label>
            <label className="lbl">
              {t('address')}
              <input
                className="inp"
                defaultValue={text(data.clinic.address)}
                key={`a${text(data.clinic.address)}`}
              />
            </label>
            <label className="lbl">
              {t('phone')}
              <input className="inp" defaultValue={data.clinic.phone} />
            </label>
            <div className="lbl">
              {t('logo')}
              <div className="row">
                <span className="logo" style={{ width: 56, height: 56 }}>
                  <Icon name="cross" />
                </span>
                <button className="btn sm">{t('upload')}</button>
              </div>
            </div>
          </div>
          <div>
            <button className="btn p" onClick={() => toast(t('savedCheck'))}>
              {t('save')}
            </button>
          </div>
        </div>
      )}
      {ui.stab === 'rem' && (
        <div className="card col">
          <div className="row sb">
            <div>
              <b>{t('rem24')}</b>
              <br />
              <span className="sub">{t('rem24d')}</span>
            </div>
            <span className="badge b-conf">{t('on')}</span>
          </div>
          <div className="row sb">
            <div>
              <b>{t('cutoff')}</b>
              <br />
              <span className="sub">{t('cutoffd')}</span>
            </div>
            <div className="row">
              <button
                className="btn"
                aria-label="-"
                onClick={() => setCutoff(settings.callListCutoffHours - 1)}
              >
                −
              </button>
              <b style={{ minWidth: 70, textAlign: 'center' }}>
                {`${settings.callListCutoffHours} ${t('hSuffix')}`}
              </b>
              <button
                className="btn"
                aria-label="+"
                onClick={() => setCutoff(settings.callListCutoffHours + 1)}
              >
                +
              </button>
            </div>
          </div>
          <div className="row sb">
            <div>
              <b>{t('rem2')}</b>
              <br />
              <span className="sub">{t('rem2d')}</span>
            </div>
            <button
              className={chip(settings.secondReminderEnabled)}
              role="switch"
              aria-checked={settings.secondReminderEnabled}
              onClick={() =>
                void repo.updateClinicSettings(actor, {
                  secondReminderEnabled: !settings.secondReminderEnabled,
                })
              }
            >
              {settings.secondReminderEnabled ? t('on') : t('off')}
            </button>
          </div>
        </div>
      )}
      {ui.stab === 'users' && (
        <div className="card col">
          {data.users.map((u) => (
            <div className="row sb" key={u.id}>
              <span className="row">
                <span className="av">{initial(text(u.name))}</span>
                <span>
                  <b>{text(u.name)}</b>
                  <br />
                  <span className="sub">{u.email}</span>
                </span>
              </span>
              <span className="badge b-sched">
                {u.roles.map((r) => t(ROLE_LABEL[r])).join(' · ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
