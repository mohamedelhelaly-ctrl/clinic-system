import { useClock } from '../../app/ClockProvider';
import { useActor } from '../../app/hooks';
import { useUi } from '../../app/uiState';
import { useClinicData, useRepository } from '../../data';
import { addDays } from '../../domain';
import { useI18n } from '../../i18n';

export function BlockDaySheet() {
  const { t, text } = useI18n();
  const { ui, set, toast } = useUi();
  const data = useClinicData();
  const repo = useRepository();
  const actor = useActor();
  const today = useClock().today();
  const save = async () => {
    await repo.blockDoctorDay(actor, ui.blkDoc, addDays(today, Number(ui.blkDay)), ui.blkNote);
    set({ sheet: '', blkNote: '' });
    toast(t('toastBlocked'));
  };
  return (
    <>
      <label className="lbl">
        {t('doctor')}
        <select className="inp" value={ui.blkDoc} onChange={(e) => set({ blkDoc: e.target.value })}>
          {data.doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {text(d.name)}
            </option>
          ))}
        </select>
      </label>
      <label className="lbl">
        {t('date')}
        <select
          className="inp"
          value={ui.blkDay}
          onChange={(e) => set({ blkDay: e.target.value as '1' | '2' })}
        >
          <option value="1">{t('tomorrow')}</option>
          <option value="2">{t('dayAfter')}</option>
        </select>
      </label>
      <label className="lbl">
        {t('noteLbl')}
        <input
          className="inp"
          placeholder={t('blockPh')}
          value={ui.blkNote}
          onChange={(e) => set({ blkNote: e.target.value })}
        />
      </label>
      <button className="btn p lg full" onClick={save}>
        {t('save')}
      </button>
    </>
  );
}
