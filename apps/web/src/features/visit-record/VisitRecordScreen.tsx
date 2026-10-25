import { useActor, useDirectory, usePatientHistory } from '../../app/hooks';
import { useUi } from '../../app/uiState';
import { Alert, Icon, VisitHistoryItems } from '../../components';
import { useClinicData, useRepository } from '../../data';
import { hasDrug } from '../../domain';
import { useI18n } from '../../i18n';
import { DELIVERY_UI } from './deliveryStatus';
import { draftFromUi, usePrescriptionDelivery } from './useOpenVisit';

export function VisitRecordScreen() {
  const { t, text, fmt } = useI18n();
  const { ui, set, nav, goBack, root, toast } = useUi();
  const data = useClinicData();
  const dir = useDirectory();
  const repo = useRepository();
  const actor = useActor();
  const a = dir.appointment(ui.apptId) ?? data.appointments[0]!;
  // Editing a saved record: it may predate appointments in the system (seeded history).
  const editing = ui.editVisitId
    ? data.visitRecords.find((v) => v.id === ui.editVisitId)
    : undefined;
  const p = dir.patient(editing?.patientId ?? a.patientId);
  const d = dir.doctor(editing?.doctorId ?? a.doctorId);
  const history = usePatientHistory(p.id).filter((h) => h.record.id !== editing?.id);
  const { message } = usePrescriptionDelivery(a.id);
  const delivery = message ? DELIVERY_UI[message.status] : undefined;
  const rxCount = draftFromUi(ui).items.filter(hasDrug).length;
  const alerts = text(p.allergiesAndAlerts);

  const saveDraft = async () => {
    await repo.saveVisitDraft(actor, a.id, draftFromUi(ui));
    toast(t('toastDraft'));
  };
  const saveEdit = async () => {
    if (!editing) return;
    await repo.editVisitRecord(actor, editing.id, draftFromUi(ui).fields);
    set({ editVisitId: null, complaint: '', diagnosis: '', treatment: '' });
    goBack();
    toast(t('toastSaved'));
  };
  const complete = async () => {
    await repo.completeVisit(actor, a.id, draftFromUi(ui));
    root('patient', {
      patId: a.patientId,
      complaint: '',
      diagnosis: '',
      treatment: '',
      rxRows: [],
    });
    toast(t('toastVisitSaved'));
  };

  return (
    <div className="scr">
      <div className="row sb">
        <button className="btn sm" onClick={goBack}>
          <Icon name="back" small />
          {t('back')}
        </button>
        <button className="btn sm hide-d" onClick={() => set({ histOpen: !ui.histOpen })}>
          {t('history')}
        </button>
      </div>
      <div className="split">
        <div className="card col">
          <div>
            <h1>{editing ? t('editVisitRecord') : t('visitRecord')}</h1>
            <p className="sub">
              {editing
                ? `${text(p.name)} · ${text(d.name)} · ${fmt.date(editing.date)}`
                : `${text(p.name)} · ${text(d.name)} · ${a.time ?? t('walkinTag')}`}
            </p>
          </div>
          <label className="lbl">
            {t('complaint')}
            <textarea
              className="inp"
              value={ui.complaint}
              onChange={(e) => set({ complaint: e.target.value })}
            />
          </label>
          <label className="lbl">
            {t('diagnosis')}
            <textarea
              className="inp"
              value={ui.diagnosis}
              onChange={(e) => set({ diagnosis: e.target.value })}
            />
          </label>
          <label className="lbl">
            {t('treatment')}
            <textarea
              className="inp"
              value={ui.treatment}
              onChange={(e) => set({ treatment: e.target.value })}
            />
          </label>
          {editing ? (
            <div className="row">
              <button className="btn p lg" onClick={saveEdit}>
                {t('saveChanges')}
              </button>
            </div>
          ) : (
            <>
              <div className="row sb">
                <button className="btn lg" onClick={() => nav('rx')}>
                  <Icon name="rx" />
                  {rxCount ? t('prescriptionCount', { n: rxCount }) : t('addPrescription')}
                </button>
                <span className={delivery?.cls ?? ''}>{delivery ? t(delivery.label) : ''}</span>
              </div>
              <div className="row">
                <button className="btn lg" onClick={saveDraft}>
                  {t('saveDraft')}
                </button>
                <button className="btn p lg" onClick={complete}>
                  {t('saveComplete')}
                </button>
              </div>
            </>
          )}
        </div>
        <div className={ui.histOpen ? 'hp open' : 'hp'}>
          <div className="card col">
            <h2>{t('history')}</h2>
            {alerts && (
              <Alert>
                <b>{t('alerts')}</b>
                <br />
                {alerts}
              </Alert>
            )}
            <VisitHistoryItems entries={history} />
            {history.length === 0 && <p className="sub">{t('noHistory')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
