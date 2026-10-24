import { useClock } from '../../app/ClockProvider';
import {
  useActor,
  useConfirmationChannels,
  useDirectory,
  useNow,
  usePatientHistory,
} from '../../app/hooks';
import { useUi } from '../../app/uiState';
import { useRequiredSession } from '../../auth';
import {
  Alert,
  Icon,
  Locked,
  StatusBadges,
  PaymentBadge,
  VisitHistoryItems,
} from '../../components';
import { useClinicData, useRepository } from '../../data';
import type { AppointmentStatus } from '../../domain';
import {
  ageOn,
  can,
  canSeeClinicalContent,
  daysBetween,
  findActivePackage,
  getAppointmentActions,
  hasSlotPassed,
  isPreArrival,
  remainingVisits,
} from '../../domain';
import type { MessageKey } from '../../i18n';
import { useI18n } from '../../i18n';
import { useAppointmentLog } from './useAppointmentLog';
import { useOpenVisit } from '../visit-record/useOpenVisit';

const CANCEL_TEXT: Record<string, MessageKey> = {
  patient_whatsapp: 'cxWhatsapp',
  patient_phone: 'cxPhone',
  clinic: 'cxClinic',
  rescheduled: 'cxResched',
};

export function AppointmentScreen() {
  const { t, text, fmt } = useI18n();
  const { ui, set, nav, root, toast } = useUi();
  const data = useClinicData();
  const dir = useDirectory();
  const repo = useRepository();
  const actor = useActor();
  const session = useRequiredSession();
  const now = useNow();
  const today = useClock().today();
  const channelOf = useConfirmationChannels();
  const openVisit = useOpenVisit();

  const a = dir.appointment(ui.apptId) ?? data.appointments[0]!;
  const p = dir.patient(a.patientId);
  const d = dir.doctor(a.doctorId);
  const logs = useAppointmentLog(a);
  const history = usePatientHistory(a.patientId);
  const pkg = findActivePackage(data.packages, a.patientId, today);
  const act = getAppointmentActions(session.role, a, { now, hasActivePackage: !!pkg });
  const clinical = canSeeClinicalContent(session.role);
  const payment = data.payments.find((x) => x.appointmentId === a.id);
  const alerts = text(p.allergiesAndAlerts);

  let detail = '';
  if (a.status === 'cancelled') {
    const c = a.cancellation ?? { source: 'clinic', reason: '' };
    detail = t(CANCEL_TEXT[c.source]!);
    if (c.source === 'clinic' && c.reason)
      detail = t('withReason', { text: detail, reason: c.reason });
  } else if (isPreArrival(a.status) && hasSlotPassed(a, now) && a.date === today) {
    detail = t('slotPassed');
  }

  const change = (to: AppointmentStatus) => () => {
    void repo.changeAppointmentStatus(actor, a.id, to);
  };

  return (
    <div className="scr">
      <div className="row">
        <button className="btn sm" onClick={() => root('home')}>
          <Icon name="back" small />
          {t('back')}
        </button>
      </div>
      <div className="split">
        <div className="col" style={{ gap: 16 }}>
          <div className="card col">
            <div className="badges">
              <StatusBadges
                status={a.status}
                paymentStatus={a.paymentStatus}
                channel={channelOf(a.id)}
              />
              <span className="sub">{detail}</span>
            </div>
            <h1>{text(p.name)}</h1>
            <div className="form" style={{ gap: '10px 20px' }}>
              <div>
                <span className="mini">{t('phone')}</span>
                <br />
                {p.phone}
              </div>
              <div>
                <span className="mini">{t('age')}</span>
                <br />
                {p.dateOfBirth ? t('ageYears', { n: ageOn(p.dateOfBirth, today) }) : ''}
              </div>
              <div>
                <span className="mini">{t('doctor')}</span>
                <br />
                {text(d.name)} · <span className="sub">{text(d.specialty)}</span>
              </div>
              <div>
                <span className="mini">{t('when')}</span>
                <br />
                {`${fmt.dayLabel(a.date)} · ${a.time ?? t('walkinTag')}`}
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <span className="mini">{t('reason')}</span>
                <br />
                {text(a.reason)}
              </div>
            </div>
            {alerts && (
              <Alert>
                <b>{t('alerts')}</b>
                <br />
                {alerts}
              </Alert>
            )}
            <div>
              <button className="btn sm" onClick={() => nav('patient', { patId: p.id })}>
                <Icon name="user" small />
                {t('openFile')}
              </button>
            </div>
          </div>
          <div className="card col">
            <h2>{t('actions')}</h2>
            <div className="row">
              {act.confirm && (
                <button className="btn" onClick={change('confirmed')}>
                  {t('markConfirmed')}
                </button>
              )}
              {act.markArrived && (
                <button className="btn p" onClick={change('arrived')}>
                  {t('markArrived')}
                </button>
              )}
              {act.startConsultation && (
                <button
                  className="btn p"
                  disabled={act.startConsultationBlocked}
                  onClick={change('in_consultation')}
                >
                  {t('startConsult')}
                </button>
              )}
              {act.overridePaymentGate && (
                <button className="btn d" onClick={() => set({ sheet: 'override', ovReason: '' })}>
                  {t('override')}
                </button>
              )}
              {act.openVisitRecord && (
                <button className="btn p" onClick={() => openVisit(a.id)}>
                  {t('openVisit')}
                </button>
              )}
              {act.complete && (
                <button className="btn p" onClick={change('completed')}>
                  {t('markCompleted')}
                </button>
              )}
              {act.markNoShow && (
                <button className="btn" onClick={change('no_show')}>
                  {t('markNoShow')}
                </button>
              )}
              {act.reschedule && (
                <button
                  className="btn"
                  onClick={() =>
                    set((s) => ({
                      sheet: 'resched',
                      canReason: '',
                      bk: {
                        ...s.bk,
                        doctorId: a.doctorId,
                        day: daysBetween(today, a.date),
                        slot: null,
                      },
                    }))
                  }
                >
                  {t('reschedule')}
                </button>
              )}
              {act.cancel && (
                <button className="btn d" onClick={() => set({ sheet: 'cancel', canReason: '' })}>
                  {t('cancel')}
                </button>
              )}
            </div>
            {act.paymentRequiredHint && (
              <p className="sub row" style={{ gap: 6 }}>
                <Icon name="lock" small />
                {t('payRequired')}
              </p>
            )}
            {act.isFinal && <p className="sub">{t('finalNote')}</p>}
            {!clinical && a.status === 'completed' && <Locked>{t('clinicalLocked')}</Locked>}
          </div>
          <div className="card col">
            <div className="row sb">
              <h2>{t('payment')}</h2>
              <PaymentBadge status={a.paymentStatus} />
            </div>
            {payment && <p>{`${fmt.money(payment.amount)} · ${payment.method}`}</p>}
            <div className="row">
              {act.recordPayment && (
                <button
                  className="btn p"
                  onClick={() => set({ sheet: 'pay', payAmt: String(d.fee) })}
                >
                  {t('recordPayment')}
                </button>
              )}
              {act.applyPackage && pkg && (
                <button
                  className="btn"
                  onClick={async () => {
                    await repo.applyPackageVisit(actor, a.id);
                    toast(t('toastPackageApplied'));
                  }}
                >
                  {`${t('applyPackageVisit')} (${remainingVisits(pkg)})`}
                </button>
              )}
            </div>
            {!can(session.role, 'payment.record') && <p className="sub">{t('readOnly')}</p>}
          </div>
        </div>
        <div className="col" style={{ gap: 16 }}>
          <div className="card col">
            <h2>{t('logTitle')}</h2>
            {logs.map((l, i) => (
              <div
                className="row"
                key={i}
                style={{ gap: 10, alignItems: 'flex-start', flexWrap: 'nowrap' }}
              >
                <Icon name={l.icon} small style={{ marginTop: 3 }} />
                <div>
                  <div>{l.text}</div>
                  <div className="sub">{l.when}</div>
                </div>
              </div>
            ))}
          </div>
          {clinical && (
            <div className="card col">
              <h2>{t('history')}</h2>
              {alerts && <Alert>{alerts}</Alert>}
              <VisitHistoryItems entries={history} />
              {history.length === 0 && <p className="sub">{t('noHistory')}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
