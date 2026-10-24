import { useClock } from '../../app/ClockProvider';
import { useDirectory } from '../../app/hooks';
import { useUi } from '../../app/uiState';
import { useRequiredSession } from '../../auth';
import { Icon } from '../../components';
import { useClinicData } from '../../data';
import { can, percentRemaining, remainingVisits } from '../../domain';
import { useI18n } from '../../i18n';
import { METHOD_LABEL, usePaymentForm } from './usePayments';

export function PaymentsScreen() {
  const { t, text, fmt } = useI18n();
  const { ui, set } = useUi();
  const data = useClinicData();
  const dir = useDirectory();
  const session = useRequiredSession();
  const today = useClock().today();
  const form = usePaymentForm();
  const canEdit = can(session.role, 'payment.record');
  const chip = (on: boolean) => (on ? 'chip on' : 'chip');

  const todays = data.payments.filter((p) => p.recordedAt.slice(0, 10) === today && !p.voided);
  const sum = (filter: (p: (typeof todays)[number]) => boolean) =>
    todays.filter(filter).reduce((n, p) => n + p.amount, 0);
  const visits = data.appointments.filter(
    (a) => a.date === today && ['arrived', 'in_consultation', 'completed'].includes(a.status),
  ).length;
  const cash = [
    { v: fmt.money(sum(() => true)), l: t('totalCollected') },
    { v: fmt.money(sum((p) => p.method === 'cash')), l: t('mCash') },
    { v: fmt.money(sum((p) => p.method === 'card')), l: t('mCard') },
    { v: fmt.money(sum((p) => p.method === 'transfer')), l: t('mTransfer') },
    { v: String(visits), l: t('visitsStat') },
    { v: fmt.money(sum((p) => p.packageId !== null)), l: t('packageSales') },
  ];

  return (
    <div className="scr">
      <div className="row sb">
        <h1>{t('payments')}</h1>
        <div className="tabs">
          <button className={chip(ui.ptab === 'rec')} onClick={() => set({ ptab: 'rec' })}>
            {t('recordPayment')}
          </button>
          <button className={chip(ui.ptab === 'pkg')} onClick={() => set({ ptab: 'pkg' })}>
            {t('packages')}
          </button>
        </div>
      </div>
      <div className="card col">
        <h2>{t('cashSummary')}</h2>
        <div className="cards3">
          {cash.map((c) => (
            <div className="stat" key={c.l}>
              {/* The inner span picks up `.stat span`, matching the prototype as rendered. */}
              <b style={{ fontSize: 24 }}>
                <span>{c.v}</span>
              </b>
              <span>{c.l}</span>
            </div>
          ))}
        </div>
      </div>
      {ui.ptab === 'rec' && (
        <div className="split">
          {canEdit && (
            <div className="card col">
              <h2>{t('recordPayment')}</h2>
              <label className="lbl">
                {t('appointment')}
                <select
                  className="inp"
                  value={form.selectedId}
                  onChange={(e) => {
                    const a = dir.appointment(e.target.value);
                    set({
                      payApptId: e.target.value,
                      payAmt: a ? String(dir.doctor(a.doctorId).fee) : '',
                    });
                  }}
                >
                  {form.unpaid.map((a) => (
                    <option key={a.id} value={a.id}>
                      {`${a.time ?? t('walkinTag')} · ${text(dir.patient(a.patientId).name)}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lbl">
                {t('amount')}
                <input
                  className="inp"
                  inputMode="numeric"
                  value={ui.payAmt}
                  onChange={(e) => set({ payAmt: e.target.value })}
                />
              </label>
              <div className="lbl">
                {t('method')}
                <div className="tabs">
                  {form.methods.map((m) => (
                    <button key={m.key} className={m.cls} onClick={m.pick}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <button
                  className="btn p lg"
                  disabled={!form.amountValid || !form.selectedId}
                  onClick={() => form.save(form.selectedId)}
                >
                  {t('save')}
                </button>
              </div>
            </div>
          )}
          <div className="card col">
            <h2>{t('todayPayments')}</h2>
            {!canEdit && <p className="sub">{t('readOnly')}</p>}
            {todays.map((p) => (
              <div className="row sb" key={p.id}>
                <span>
                  {p.packageId
                    ? t('packageSale', { patient: text(dir.patient(p.patientId).name) })
                    : text(dir.patient(p.patientId).name)}
                  <br />
                  <span className="sub">{t(METHOD_LABEL[p.method])}</span>
                </span>
                <b>{fmt.money(p.amount)}</b>
              </div>
            ))}
          </div>
        </div>
      )}
      {ui.ptab === 'pkg' && (
        <div className="card col">
          <div className="row sb">
            <h2>{t('packages')}</h2>
            {canEdit && (
              <button className="btn p" onClick={() => set({ sheet: 'pkg', pkgPatient: 'p1' })}>
                <Icon name="plus" small />
                {t('newPackage')}
              </button>
            )}
          </div>
          <div
            className="alert"
            style={{ background: 'var(--acs)', borderColor: '#9FD3D1', color: 'var(--acd)' }}
          >
            <Icon name="check" />
            <div>{t('pkgRule')}</div>
          </div>
          {data.packages.map((k) => (
            <div className="tli" key={k.id}>
              <div className="row sb">
                <b>{text(dir.patient(k.patientId).name)}</b>
                <span className="sub">
                  {k.expiryDate ? t('expires', { date: fmt.date(k.expiryDate) }) : ''}
                </span>
              </div>
              <div>{`${fmt.money(k.totalPrice)} · ${t('pkgVisits', { n: k.totalVisits })}`}</div>
              <div className="prog">
                <i style={{ width: `${percentRemaining(k)}%` }} />
              </div>
              <div className="row sb">
                <span>{t('pkgLeft', { n: remainingVisits(k) })}</span>
                <span className="sub">{t('pkgUsed', { n: k.visitsUsed })}</span>
              </div>
              {canEdit && (
                <div>
                  <button
                    className="btn sm"
                    onClick={() =>
                      set({ adjPkg: k.id, sheet: 'adj', adjReason: '', adjType: 'add' })
                    }
                  >
                    {t('adjust')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
