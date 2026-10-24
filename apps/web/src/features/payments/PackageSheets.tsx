import { useActor, useDirectory } from '../../app/hooks';
import { useUi } from '../../app/uiState';
import { useClinicData, useRepository } from '../../data';
import type { PackageAdjustment } from '../../domain';
import { remainingVisits } from '../../domain';
import { useI18n } from '../../i18n';

export function NewPackageSheet() {
  const { t, text } = useI18n();
  const { ui, set, toast } = useUi();
  const data = useClinicData();
  const repo = useRepository();
  const actor = useActor();
  const save = async () => {
    const totalPrice = parseInt(ui.pkgPrice, 10) || 0;
    const totalVisits = parseInt(ui.pkgVisits, 10) || 0;
    if (!totalPrice || !totalVisits) return;
    await repo.createPackage(actor, {
      patientId: ui.pkgPatient,
      totalPrice,
      totalVisits,
      expiryDate: ui.pkgExpiry || null,
      notes: ui.pkgNotes,
    });
    set({ sheet: '', pkgNotes: '', pkgExpiry: '' });
    toast(t('toastPackageCreated'));
  };
  return (
    <>
      <label className="lbl">
        {t('patient')}
        <select
          className="inp"
          value={ui.pkgPatient}
          onChange={(e) => set({ pkgPatient: e.target.value })}
        >
          {data.patients.map((p) => (
            <option key={p.id} value={p.id}>
              {text(p.name)}
            </option>
          ))}
        </select>
      </label>
      <div className="form">
        <label className="lbl">
          <span>{t('totalPrice')}</span> {t('egpParen')}
          <input
            className="inp"
            inputMode="numeric"
            value={ui.pkgPrice}
            onChange={(e) => set({ pkgPrice: e.target.value })}
          />
        </label>
        <label className="lbl">
          {t('numVisits')}
          <input
            className="inp"
            inputMode="numeric"
            value={ui.pkgVisits}
            onChange={(e) => set({ pkgVisits: e.target.value })}
          />
        </label>
        <label className="lbl">
          <span>{t('expiry')}</span> <small>{t('optional')}</small>
          <input
            className="inp"
            type="date"
            value={ui.pkgExpiry}
            onChange={(e) => set({ pkgExpiry: e.target.value })}
          />
        </label>
        <label className="lbl">
          <span>{t('notes')}</span> <small>{t('optional')}</small>
          <input
            className="inp"
            value={ui.pkgNotes}
            onChange={(e) => set({ pkgNotes: e.target.value })}
          />
        </label>
      </div>
      <p className="sub">{t('pkgRule')}</p>
      <button className="btn p lg full" onClick={save}>
        {t('save')}
      </button>
    </>
  );
}

const ADJUSTMENT: Record<'add' | 'remove' | 'extend', PackageAdjustment> = {
  add: 'add_visit',
  remove: 'remove_visit',
  extend: 'extend_expiry',
};

export function AdjustPackageSheet() {
  const { t, text, fmt } = useI18n();
  const { ui, set, toast } = useUi();
  const data = useClinicData();
  const dir = useDirectory();
  const repo = useRepository();
  const actor = useActor();
  const pkg = data.packages.find((k) => k.id === ui.adjPkg) ?? data.packages[0];
  const save = async () => {
    if (!pkg) return;
    await repo.adjustPackage(actor, pkg.id, ADJUSTMENT[ui.adjType], ui.adjReason);
    set({ sheet: '', adjReason: '' });
    toast(t('toastAdjusted'));
  };
  return (
    <>
      <p className="sub">
        {pkg
          ? `${text(dir.patient(pkg.patientId).name)} · ${fmt.money(pkg.totalPrice)} · ${t('pkgLeft', { n: remainingVisits(pkg) })}`
          : ''}
      </p>
      <label className="lbl">
        {t('adjustment')}
        <select
          className="inp"
          value={ui.adjType}
          onChange={(e) => set({ adjType: e.target.value as 'add' | 'remove' | 'extend' })}
        >
          <option value="add">{t('adjAdd')}</option>
          <option value="remove">{t('adjRemove')}</option>
          <option value="extend">{t('adjExtend')}</option>
        </select>
      </label>
      <label className="lbl">
        {t('reasonReq')}
        <input
          className="inp"
          value={ui.adjReason}
          onChange={(e) => set({ adjReason: e.target.value })}
        />
      </label>
      <button className="btn p lg full" disabled={ui.adjReason.trim() === ''} onClick={save}>
        {t('save')}
      </button>
    </>
  );
}
