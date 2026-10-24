import { useClock } from '../../app/ClockProvider';
import { useActor, useDirectory } from '../../app/hooks';
import { useUi } from '../../app/uiState';
import { Alert, Icon, initial } from '../../components';
import { useClinicData, useRepository } from '../../data';
import { addDays, ageOn, findActivePackage, remainingVisits, reminderPolicy } from '../../domain';
import { bilingual, useI18n } from '../../i18n';
import { useSlotPicker } from './useSlots';
import { usePatientSearch } from '../patients/usePatientSearch';

export function BookingScreen() {
  const { t, text, fmt } = useI18n();
  const { ui, set, root, toast } = useUi();
  const data = useClinicData();
  const dir = useDirectory();
  const repo = useRepository();
  const actor = useActor();
  const clock = useClock();
  const today = clock.today();
  const b = ui.bk;
  const { days, slots, date, dayBlocked } = useSlotPicker(b.doctorId);
  const results = usePatientSearch({ limitWhenEmpty: 5 });
  const setBk = (patch: Partial<typeof b>) => set((s) => ({ bk: { ...s.bk, ...patch } }));

  const patient = b.patientId ? dir.patient(b.patientId) : null;
  const doctor = b.doctorId ? dir.doctor(b.doctorId) : null;
  const ageText = (dob: string | null) => (dob ? t('ageYears', { n: ageOn(dob, today) }) : '');

  // Step chips; walk-ins skip the time step.
  const stepN = b.walkIn
    ? (({ 0: 1, 1: 2, 3: 3 } as Record<number, number>)[b.step] ?? 3)
    : b.step + 1;
  const labels = [t('stepPatient'), t('stepDoctor'), t('stepTime'), t('stepDetails')].filter(
    (_, i) => !(b.walkIn && i === 2),
  );

  // Registration
  const phoneDigits = ui.rgPhone.replace(/\D/g, '');
  const phoneClean = ui.rgPhone.replace(/\s/g, '');
  const duplicates = data.patients
    .filter((p) => phoneDigits.length >= 8 && p.phone === phoneClean)
    .map((p) => text(p.name));
  const regDisabled = !ui.rgName.trim() || phoneDigits.length < 10;

  const openRegistration = () =>
    set((s) => ({
      rgName: /\d/.test(s.q) ? '' : s.q,
      rgPhone: /^[\d\s]+$/.test(s.q) ? s.q : '',
      bk: { ...s.bk, registering: true },
    }));

  const saveRegistration = async () => {
    const p = await repo.registerPatient(actor, {
      name: ui.rgName,
      phone: ui.rgPhone,
      dateOfBirth: ui.rgDob || null,
      gender: ui.rgGender,
      address: ui.rgAddr,
      allergiesAndAlerts: ui.rgAlerts,
    });
    set((s) => ({
      rgName: '',
      rgPhone: '',
      rgDob: '',
      rgAddr: '',
      rgAlerts: '',
      q: '',
      bk: { ...s.bk, patientId: p.id, step: 1, registering: false },
    }));
    toast(t('toastPatientRegistered'));
  };

  // Details step
  const pkg = patient ? findActivePackage(data.packages, patient.id, today) : undefined;
  const whenText = b.walkIn
    ? `${t('walkinTag')} · ${t('today')}`
    : b.slot
      ? `${fmt.dayLabel(date)} · ${b.slot}`
      : '';
  const reminderNote = b.walkIn
    ? t('reminderWalkin')
    : b.slot &&
        reminderPolicy(
          { date, time: b.slot, bookedAt: clock.now() },
          data.clinic.settings.reminderLeadHours,
        ) === 'booked_too_late'
      ? t('reminderShort')
      : t('reminderAuto');

  const saveBooking = async () => {
    if (!b.patientId || !b.doctorId) return;
    await repo.bookAppointment(actor, {
      patientId: b.patientId,
      doctorId: b.doctorId,
      date: b.walkIn ? today : addDays(today, b.day),
      time: b.walkIn ? null : b.slot,
      reason: ui.reason ? { value: ui.reason } : bilingual('defaultReason'),
    });
    root('home', {
      reason: '',
      fDoc: actor.role === 'doctor' ? ui.fDoc : 'all',
      fSt: 'all',
      attn: false,
    });
    toast(t('toastBooked'));
  };

  return (
    <div className="scr" style={{ maxWidth: 860 }}>
      <div className="row sb">
        <h1>{t('newAppt')}</h1>
        <button className="btn sm" onClick={() => root('home')}>
          {t('cancel')}
        </button>
      </div>
      <div className="tabs">
        {labels.map((label, i) => (
          <span
            key={label}
            className={i + 1 === stepN ? 'chip on' : 'chip'}
            style={{ minHeight: 36, cursor: 'default' }}
          >
            <span>{i + 1}</span> · <span>{label}</span>
          </span>
        ))}
      </div>

      {b.step === 0 && (
        <>
          <div className="card col">
            <label className="lbl">
              {t('searchPatient')}
              <input
                className="inp"
                type="search"
                placeholder={t('searchPh')}
                value={ui.q}
                onChange={(e) => set({ q: e.target.value })}
              />
            </label>
            {results.map((p) => (
              <button
                className="doc"
                key={p.id}
                onClick={() => setBk({ patientId: p.id, step: 1 })}
              >
                <span className="av">{initial(text(p.name))}</span>
                <span>
                  <b>{text(p.name)}</b>
                  <br />
                  <span className="sub">
                    {p.phone} · {ageText(p.dateOfBirth)}
                  </span>
                </span>
              </button>
            ))}
            {ui.q.trim() !== '' && results.length === 0 && <p className="sub">{t('noPatient')}</p>}
            <div>
              <button className="btn" onClick={openRegistration}>
                <Icon name="plus" small />
                {t('regNew')}
              </button>
            </div>
          </div>
          {b.registering && (
            <div className="card col">
              <h2>{t('regNew')}</h2>
              <div className="form">
                <label className="lbl">
                  {t('fullName')}
                  <input
                    className="inp"
                    value={ui.rgName}
                    onChange={(e) => set({ rgName: e.target.value })}
                  />
                </label>
                <label className="lbl">
                  <span>{t('phone')}</span> *
                  <input
                    className="inp"
                    inputMode="tel"
                    placeholder="010xxxxxxxx"
                    value={ui.rgPhone}
                    onChange={(e) => set({ rgPhone: e.target.value })}
                  />
                </label>
                <label className="lbl">
                  {t('dob')}
                  <input
                    className="inp"
                    type="date"
                    value={ui.rgDob}
                    onChange={(e) => set({ rgDob: e.target.value })}
                  />
                </label>
                <label className="lbl">
                  {t('age')}
                  <input
                    className="inp"
                    readOnly
                    value={ui.rgDob ? ageText(ui.rgDob) : '—'}
                    style={{ background: '#EEF2F3' }}
                  />
                </label>
                <label className="lbl">
                  {t('gender')}
                  <select
                    className="inp"
                    value={ui.rgGender}
                    onChange={(e) => set({ rgGender: e.target.value as 'F' | 'M' })}
                  >
                    <option value="F">{t('female')}</option>
                    <option value="M">{t('male')}</option>
                  </select>
                </label>
                <label className="lbl">
                  <span>{t('address')}</span> <small>{t('optional')}</small>
                  <input
                    className="inp"
                    value={ui.rgAddr}
                    onChange={(e) => set({ rgAddr: e.target.value })}
                  />
                </label>
                <label className="lbl" style={{ gridColumn: '1/-1' }}>
                  <span>{t('alerts')}</span>{' '}
                  <small>
                    {t('optional')} · {t('alertsHint')}
                  </small>
                  <input
                    className="inp"
                    value={ui.rgAlerts}
                    onChange={(e) => set({ rgAlerts: e.target.value })}
                  />
                </label>
              </div>
              {duplicates.length > 0 && (
                <Alert>{t('duplicatePhone', { names: duplicates.join(t('listSeparator')) })}</Alert>
              )}
              <div className="row">
                <button className="btn p lg" disabled={regDisabled} onClick={saveRegistration}>
                  {duplicates.length ? t('addAnother') : t('saveContinue')}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {b.step === 1 && (
        <div className="card col">
          <div className="row sb">
            <b>{patient ? text(patient.name) : ''}</b>
            <button className="btn sm" onClick={() => setBk({ step: 0, patientId: null })}>
              {t('change')}
            </button>
          </div>
          <h2>{t('chooseDoctor')}</h2>
          {data.doctors.map((d) => (
            <button
              key={d.id}
              className={b.doctorId === d.id ? 'doc on' : 'doc'}
              onClick={() => setBk({ doctorId: d.id, slot: null, step: b.walkIn ? 3 : 2 })}
            >
              <span className="av">{initial(text(d.name))}</span>
              <span>
                <b>{text(d.name)}</b>
                <br />
                <span className="sub">{text(d.specialty)}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {b.step === 2 && (
        <div className="card col">
          <div className="row sb">
            <b>{doctor ? text(doctor.name) : ''}</b>
            <button className="btn sm" onClick={() => setBk({ step: 1 })}>
              {t('change')}
            </button>
          </div>
          <h2>{t('chooseTime')}</h2>
          <div className="tabs">
            {days.map((d) => (
              <button key={d.label} className={d.cls} onClick={d.pick}>
                {d.label}
              </button>
            ))}
          </div>
          <div className="slots slotinline">
            {slots.map((s) => (
              <button
                key={s.time}
                className={s.cls}
                disabled={s.off}
                onClick={() => setBk({ slot: s.time, step: 3 })}
              >
                {s.time}
              </button>
            ))}
          </div>
          <div className="hide-d">
            <button className="btn lg full" onClick={() => set({ sheet: 'slots' })}>
              <Icon name="clock" />
              {b.slot ? `${fmt.dayLabel(date)} · ${b.slot}` : t('slotsPick')}
            </button>
          </div>
          {dayBlocked && <p className="sub">{t('dayBlocked')}</p>}
        </div>
      )}

      {b.step === 3 && (
        <div className="card col">
          <h2>{t('apptDetails')}</h2>
          <div className="form">
            <label className="lbl">
              {t('patient')}
              <input
                className="inp"
                readOnly
                value={patient ? text(patient.name) : ''}
                style={{ background: '#EEF2F3' }}
              />
            </label>
            <label className="lbl">
              {t('doctor')}
              <input
                className="inp"
                readOnly
                value={doctor ? text(doctor.name) : ''}
                style={{ background: '#EEF2F3' }}
              />
            </label>
            <label className="lbl">
              {t('dateTime')}
              <input className="inp" readOnly value={whenText} style={{ background: '#EEF2F3' }} />
            </label>
            <label className="lbl">
              {t('reason')}
              <input
                className="inp"
                placeholder={t('reasonPh')}
                value={ui.reason}
                onChange={(e) => set({ reason: e.target.value })}
              />
            </label>
          </div>
          {pkg && (
            <div>
              <span className="chipg">
                <Icon name="check" small />
                {t('coveredByPackageLeft', { n: remainingVisits(pkg) })}
              </span>
            </div>
          )}
          <p className="sub">{reminderNote}</p>
          <div className="row">
            <button className="btn p lg" onClick={saveBooking}>
              {t('saveAppt')}
            </button>
            <button className="btn lg" onClick={() => setBk({ step: b.walkIn ? 1 : 2 })}>
              {t('back')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
