import { useClock } from '../../app/ClockProvider';
import { useUi } from '../../app/uiState';
import { initial } from '../../components';
import { ageOn } from '../../domain';
import { useI18n } from '../../i18n';
import { usePatientSearch } from './usePatientSearch';

export function PatientsScreen() {
  const { t, text } = useI18n();
  const { ui, set, nav } = useUi();
  const today = useClock().today();
  const results = usePatientSearch();

  return (
    <div className="scr">
      <h1>{t('patients')}</h1>
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
          <button className="doc" key={p.id} onClick={() => nav('patient', { patId: p.id })}>
            <span className="av">{initial(text(p.name))}</span>
            <span>
              <b>{text(p.name)}</b>
              <br />
              <span className="sub">
                {p.phone} · {p.dateOfBirth ? t('ageYears', { n: ageOn(p.dateOfBirth, today) }) : ''}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
