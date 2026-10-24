import { useActor, useDirectory } from '../../app/hooks';
import { useUi } from '../../app/uiState';
import { Icon } from '../../components';
import { useClinicData, useRepository } from '../../data';
import type { CallOutcome } from '../../domain';
import type { MessageKey } from '../../i18n';
import { useI18n } from '../../i18n';

const OUTCOME_TOAST: Record<CallOutcome, MessageKey> = {
  confirmed: 'toastConfirmed',
  cancelled: 'toastCancelled',
  no_answer: 'toastAttempt',
};

export function CallListScreen() {
  const { t, text, fmt } = useI18n();
  const { toast } = useUi();
  const data = useClinicData();
  const dir = useDirectory();
  const repo = useRepository();
  const actor = useActor();

  const calls = data.appointments
    .filter((a) => a.status === 'needs_call')
    .sort((x, y) => (`${x.date}${x.time}` < `${y.date}${y.time}` ? -1 : 1));

  const log = (id: string, outcome: CallOutcome) => async () => {
    await repo.logCall(actor, id, outcome);
    toast(t(OUTCOME_TOAST[outcome]));
  };

  return (
    <div className="scr" style={{ maxWidth: 760 }}>
      <div>
        <h1>{t('callList')}</h1>
        <p className="sub">{t('callSub')}</p>
      </div>
      {calls.map((a) => {
        const p = dir.patient(a.patientId);
        const attempts = data.calls.filter(
          (c) => c.appointmentId === a.id && c.outcome === 'no_answer',
        );
        return (
          <div className="card col" key={a.id}>
            <div className="row sb">
              <div>
                <b style={{ fontSize: 19 }}>{text(p.name)}</b>
                <br />
                <span className="sub">
                  {`${fmt.dayLabel(a.date)} · ${a.time}`} · {text(dir.doctor(a.doctorId).name)}
                </span>
              </div>
              <span className="badge b-call">{t('sNeeds')}</span>
            </div>
            <a className="btn p lg full" href={`tel:${p.phone}`}>
              <Icon name="phone" />
              {p.phone}
            </a>
            <div className="row">
              <button className="btn" onClick={log(a.id, 'confirmed')}>
                {t('confByPhone')}
              </button>
              <button className="btn d" onClick={log(a.id, 'cancelled')}>
                {t('cancel')}
              </button>
              <button className="btn" onClick={log(a.id, 'no_answer')}>
                {t('noAnswer')}
              </button>
            </div>
            {attempts.length > 0 && (
              <p className="sub">
                {t('attempts', {
                  list: attempts
                    .map((c) => `${t('noAnswer')} ${c.loggedAt.slice(11, 16)}`)
                    .join(' · '),
                })}
              </p>
            )}
          </div>
        );
      })}
      {calls.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p>{t('noCalls')}</p>
        </div>
      )}
    </div>
  );
}
