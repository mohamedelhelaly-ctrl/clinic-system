import { useClock } from '../../app/ClockProvider';
import { useActor, useDirectory } from '../../app/hooks';
import type { RxRow } from '../../app/uiState';
import { useUi } from '../../app/uiState';
import { Icon } from '../../components';
import { useClinicData, useRepository } from '../../data';
import { useI18n } from '../../i18n';
import { DELIVERY_UI } from '../visit-record/deliveryStatus';
import { draftFromUi, usePrescriptionDelivery } from '../visit-record/useOpenVisit';

const FIELDS: {
  key: keyof RxRow;
  label: 'drug' | 'dose' | 'freq' | 'duration' | 'instructions';
}[] = [
  { key: 'drug', label: 'drug' },
  { key: 'dose', label: 'dose' },
  { key: 'freq', label: 'freq' },
  { key: 'dur', label: 'duration' },
  { key: 'note', label: 'instructions' },
];

export function PrescriptionScreen() {
  const { t, text, fmt } = useI18n();
  const { ui, set, goBack } = useUi();
  const data = useClinicData();
  const dir = useDirectory();
  const repo = useRepository();
  const actor = useActor();
  const today = useClock().today();
  const a = dir.appointment(ui.apptId) ?? data.appointments[0]!;
  const p = dir.patient(a.patientId);
  const d = dir.doctor(a.doctorId);
  const { prescription, message } = usePrescriptionDelivery(a.id);
  const delivery = message ? DELIVERY_UI[message.status] : undefined;

  const filled = ui.rxRows.filter((r) => r.drug.trim());
  const setRow = (i: number, key: keyof RxRow, value: string) =>
    set((s) => ({ rxRows: s.rxRows.map((r, j) => (j === i ? { ...r, [key]: value } : r)) }));

  const send = () => void repo.sendPrescription(actor, a.id, draftFromUi(ui));
  const resend = () => {
    if (message) void repo.resendMessage(actor, message.id);
  };

  return (
    <div className="scr">
      <div className="row sb">
        <button className="btn sm" onClick={goBack}>
          <Icon name="back" small />
          {t('back')}
        </button>
        <h1>{t('prescription')}</h1>
      </div>
      <div className="split">
        <div className="card col">
          {ui.rxRows.map((row, i) => (
            <div className="rxr" key={i}>
              {FIELDS.map((f) => (
                <label className="lbl" key={f.key}>
                  {t(f.label)}
                  <input
                    className="inp"
                    value={row[f.key]}
                    onChange={(e) => setRow(i, f.key, e.target.value)}
                  />
                </label>
              ))}
              <button
                className="btn"
                aria-label={t('remove')}
                onClick={() => set((s) => ({ rxRows: s.rxRows.filter((_, j) => j !== i) }))}
              >
                <Icon name="trash" />
              </button>
            </div>
          ))}
          <div>
            <button
              className="btn"
              onClick={() =>
                set((s) => ({
                  rxRows: [...s.rxRows, { drug: '', dose: '', freq: '', dur: '', note: '' }],
                }))
              }
            >
              <Icon name="plus" small />
              {t('addMed')}
            </button>
          </div>
        </div>
        <div className="col">
          <div className="rxp">
            <div className="row sb">
              <b style={{ fontSize: 18 }}>{text(data.clinic.name)}</b>
              <span className="sub">{fmt.date(today)}</span>
            </div>
            <div className="sub">{text(data.clinic.address)}</div>
            <hr style={{ border: 0, borderTop: '1px solid var(--ln)', width: '100%' }} />
            <div className="row sb">
              <span>
                <span className="mini">{t('patient')}</span>
                <br />
                {text(p.name)}
              </span>
              <span>
                <span className="mini">{t('doctor')}</span>
                <br />
                {text(d.name)}
              </span>
            </div>
            {filled.map((r, i) => (
              <div key={i}>
                <b>{r.drug + (r.dose ? ` — ${r.dose}` : '')}</b>
                <br />
                <span className="sub">{[r.freq, r.dur, r.note].filter(Boolean).join(' · ')}</span>
              </div>
            ))}
            {filled.length === 0 && <p className="sub">{t('rxEmpty')}</p>}
          </div>
          <button className="btn p lg full" disabled={filled.length === 0} onClick={send}>
            <Icon name="wa" />
            {t('finalizeSend')}
          </button>
          {message && (
            <div className="card col">
              <div className="row sb">
                <b>{t('delivery')}</b>
                <span className={delivery?.cls ?? ''}>{delivery ? t(delivery.label) : ''}</span>
              </div>
              <div className="wa">
                <span className="mini">{t('whatsappTo', { phone: p.phone })}</span>
                <div className="m">
                  {t('rxMessage', { patient: text(p.name), doctor: text(d.name) })}
                </div>
                <div className="m row" style={{ gap: 8 }}>
                  <Icon name="file" small />
                  {prescription?.pdfUrl}
                </div>
              </div>
              <div className="row">
                <button className="btn" onClick={resend}>
                  {t('resend')}
                </button>
                {repo.demo && (
                  <button
                    className="chip"
                    style={{ minHeight: 44 }}
                    onClick={() => repo.demo!.simulateDeliveryFailure(message.id)}
                  >
                    {t('demoMarkFailed')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
