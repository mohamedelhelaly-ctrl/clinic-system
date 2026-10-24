import { useClock } from '../../app/ClockProvider';
import { useDirectory } from '../../app/hooks';
import { useUi } from '../../app/uiState';
import { useRequiredSession } from '../../auth';
import { Alert, Icon, initial, Locked, statusClass, APPOINTMENT_STATUS_UI } from '../../components';
import { useClinicData } from '../../data';
import {
  ageOn,
  canSeeClinicalContent,
  isActive,
  percentRemaining,
  primaryPackage,
  remainingVisits,
} from '../../domain';
import { useI18n } from '../../i18n';
import { useStartBooking } from '../booking/useStartBooking';

export function PatientFileScreen() {
  const { t, text, fmt } = useI18n();
  const { ui, set, nav, goBack } = useUi();
  const data = useClinicData();
  const dir = useDirectory();
  const session = useRequiredSession();
  const today = useClock().today();
  const startBooking = useStartBooking();
  const clinical = canSeeClinicalContent(session.role);

  const p = dir.patient(ui.patId ?? 'p3');
  const pkg = primaryPackage(data.packages, p.id);
  const sharedWith = data.patients
    .filter((x) => x.phone === p.phone && x.id !== p.id)
    .map((x) => text(x.name))
    .join(', ');
  const alerts = text(p.allergiesAndAlerts);
  const upcoming = data.appointments.filter((a) => a.patientId === p.id && isActive(a.status));
  const history = data.visitRecords
    .filter((v) => v.patientId === p.id && v.finalizedAt !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const ageText = p.dateOfBirth ? t('ageYears', { n: ageOn(p.dateOfBirth, today) }) : '';

  const openEdit = () =>
    set({
      sheet: 'editpt',
      edPhone: p.phone,
      edAddr: p.address.value,
      edAlerts: p.allergiesAndAlerts.value,
    });

  return (
    <div className="scr">
      <div className="row sb">
        <button className="btn sm" onClick={goBack}>
          <Icon name="back" small />
          {t('back')}
        </button>
        <button className="btn p" onClick={() => startBooking(p.id)}>
          <Icon name="plus" small />
          {t('newAppt')}
        </button>
      </div>
      <div className="split">
        <div className="col" style={{ gap: 16 }}>
          <div className="card col">
            <div className="row sb">
              <div className="row">
                <span className="av" style={{ width: 56, height: 56, fontSize: 20 }}>
                  {initial(text(p.name))}
                </span>
                <div>
                  <h1>{text(p.name)}</h1>
                  <span className="sub">
                    {(p.gender === 'F' ? t('female') : t('male')) + ' · ' + ageText}
                  </span>
                </div>
              </div>
              <button className="btn sm" onClick={openEdit}>
                <Icon name="edit" small />
                {t('edit')}
              </button>
            </div>
            {p.allergiesAndAlerts.value ? (
              <Alert>
                <b>{t('alerts')}</b>
                <br />
                {alerts}
              </Alert>
            ) : (
              <div className="locked">
                <b>{t('alerts')}</b> · <span>{t('noAlerts')}</span>
              </div>
            )}
            <div className="form" style={{ gap: '10px 20px' }}>
              <div>
                <span className="mini">{t('phone')}</span>
                <br />
                {p.phone}
              </div>
              <div>
                <span className="mini">{t('dob')}</span>
                <br />
                {p.dateOfBirth ? fmt.date(p.dateOfBirth) : '—'}
              </div>
              <div>
                <span className="mini">{t('address')}</span>
                <br />
                {text(p.address) || '—'}
              </div>
              {sharedWith && (
                <div>
                  <span className="mini">{t('sharedPhone')}</span>
                  <br />
                  {sharedWith}
                </div>
              )}
            </div>
          </div>
          <div className="card col">
            <h2>{t('pkgTitle')}</h2>
            {pkg ? (
              <>
                <div className="row sb">
                  <b>{`${fmt.money(pkg.totalPrice)} · ${t('pkgVisits', { n: pkg.totalVisits })}`}</b>
                  <span className="sub">
                    {pkg.expiryDate ? t('expires', { date: fmt.date(pkg.expiryDate) }) : ''}
                  </span>
                </div>
                <div
                  className="prog"
                  role="img"
                  aria-label={t('pkgLeft', { n: remainingVisits(pkg) })}
                >
                  <i style={{ width: `${percentRemaining(pkg)}%` }} />
                </div>
                <div className="row sb">
                  <span>{t('pkgLeft', { n: remainingVisits(pkg) })}</span>
                  <span className="sub">{t('pkgUsed', { n: pkg.visitsUsed })}</span>
                </div>
              </>
            ) : (
              <p className="sub">{t('noPkg')}</p>
            )}
          </div>
          <div className="card col">
            <h2>{t('upcoming')}</h2>
            {upcoming.map((a) => (
              <button className="doc" key={a.id} onClick={() => nav('appt', { apptId: a.id })}>
                <span className="time">{`${fmt.dayLabel(a.date)} ${a.time ?? ''}`}</span>
                <span style={{ flex: 1 }}>{text(dir.doctor(a.doctorId).name)}</span>
                <span className={`${statusClass(a.status)} badge`}>
                  {t(APPOINTMENT_STATUS_UI[a.status].label)}
                </span>
              </button>
            ))}
            {upcoming.length === 0 && <p className="sub">{t('noUpcoming')}</p>}
          </div>
        </div>
        <div className="card col">
          <h2>{t('historyTl')}</h2>
          {!clinical && <Locked>{t('clinicalLocked')}</Locked>}
          <div className="tl">
            {history.map((v) => {
              const prescription = data.prescriptions.find((x) => x.visitRecordId === v.id);
              const revision = data.visitRecordRevisions
                .filter((r) => r.visitRecordId === v.id)
                .at(-1);
              const editor = revision ? dir.user(revision.editedBy) : undefined;
              return (
                <div className="tli" key={v.id}>
                  <div className="row sb">
                    <b>{fmt.date(v.date)}</b>
                    <span className="sub">{text(dir.doctor(v.doctorId).name)}</span>
                  </div>
                  {!clinical && (
                    <div className="row" style={{ gap: 8 }}>
                      <Icon name="lock" small />
                      {t('visitDone')}
                    </div>
                  )}
                  {clinical && (
                    <>
                      <div className="blk">
                        <b>{t('complaint')}</b>
                        {v.complaint}
                      </div>
                      <div className="blk">
                        <b>{t('diagnosis')}</b>
                        {v.diagnosis}
                      </div>
                      <div className="blk">
                        <b>{t('treatment')}</b>
                        {v.treatment}
                      </div>
                      <div className="row">
                        {prescription && prescription.items.length > 0 && (
                          <span className="badge p-pkg">{t('prescription')}</span>
                        )}
                        {revision && (
                          <button
                            className="chip"
                            style={{ minHeight: 32, fontSize: 13 }}
                            onClick={() =>
                              set((s) => ({ edOpen: { ...s.edOpen, [v.id]: !s.edOpen[v.id] } }))
                            }
                          >
                            {t('edited')}
                          </button>
                        )}
                      </div>
                      {revision && ui.edOpen[v.id] && (
                        <p className="sub">
                          {t('editedBy', {
                            name: text(editor?.shortName),
                            when: revision.editedAt.replace('T', ' '),
                          })}
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
