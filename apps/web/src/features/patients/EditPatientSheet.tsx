import { useActor } from '../../app/hooks';
import { useUi } from '../../app/uiState';
import { useRepository } from '../../data';
import { useI18n } from '../../i18n';

export function EditPatientSheet() {
  const { t } = useI18n();
  const { ui, set, toast } = useUi();
  const repo = useRepository();
  const actor = useActor();
  const save = async () => {
    if (!ui.patId) return;
    await repo.updatePatient(actor, ui.patId, {
      phone: ui.edPhone,
      address: ui.edAddr,
      allergiesAndAlerts: ui.edAlerts,
    });
    set({ sheet: '' });
    toast(t('toastSaved'));
  };
  return (
    <>
      <label className="lbl">
        {t('phone')}
        <input
          className="inp"
          value={ui.edPhone}
          onChange={(e) => set({ edPhone: e.target.value })}
        />
      </label>
      <label className="lbl">
        {t('address')}
        <input
          className="inp"
          value={ui.edAddr}
          onChange={(e) => set({ edAddr: e.target.value })}
        />
      </label>
      <label className="lbl">
        {t('alerts')}
        <input
          className="inp"
          value={ui.edAlerts}
          onChange={(e) => set({ edAlerts: e.target.value })}
        />
      </label>
      <button className="btn p lg full" onClick={save}>
        {t('save')}
      </button>
    </>
  );
}
