import { useClock } from '../../app/ClockProvider';
import { useActor, useDirectory } from '../../app/hooks';
import { useUi } from '../../app/uiState';
import { useClinicData, useRepository } from '../../data';
import { addDays } from '../../domain';
import { useI18n } from '../../i18n';
import { useSlotPicker } from '../booking/useSlots';
import { usePaymentForm } from '../payments/usePayments';

function useCurrentAppointment() {
  const { ui } = useUi();
  const data = useClinicData();
  const dir = useDirectory();
  return dir.appointment(ui.apptId) ?? data.appointments[0]!;
}

export function PaymentSheet() {
  const { t, text } = useI18n();
  const { ui, set } = useUi();
  const dir = useDirectory();
  const a = useCurrentAppointment();
  const form = usePaymentForm();
  return (
    <>
      <p className="sub">
        {`${text(dir.patient(a.patientId).name)} · ${a.time ?? t('walkinTag')} · ${text(dir.doctor(a.doctorId).name)}`}
      </p>
      <label className="lbl">
        <span>{t('amount')}</span> {t('egpParen')}
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
      <button
        className="btn p lg full"
        disabled={!form.amountValid}
        onClick={() => form.save(a.id)}
      >
        {t('save')}
      </button>
    </>
  );
}

export function CancelSheet() {
  const { t } = useI18n();
  const { ui, set, toast } = useUi();
  const repo = useRepository();
  const actor = useActor();
  const a = useCurrentAppointment();
  const confirm = async () => {
    await repo.changeAppointmentStatus(actor, a.id, 'cancelled', { cancelReason: ui.canReason });
    set({ sheet: '', canReason: '' });
    toast(t('toastCancelled'));
  };
  return (
    <>
      <p className="sub">{t('cancelNote')}</p>
      <label className="lbl">
        {t('reasonOpt')}
        <textarea
          className="inp"
          style={{ minHeight: 90 }}
          value={ui.canReason}
          onChange={(e) => set({ canReason: e.target.value })}
        />
      </label>
      <button className="btn d lg full" onClick={confirm}>
        {t('confirmCancel')}
      </button>
    </>
  );
}

export function OverrideSheet() {
  const { t } = useI18n();
  const { ui, set } = useUi();
  const repo = useRepository();
  const actor = useActor();
  const a = useCurrentAppointment();
  const confirm = async () => {
    await repo.changeAppointmentStatus(actor, a.id, 'in_consultation', {
      override: { reason: ui.ovReason },
    });
    set({ sheet: '', ovReason: '' });
  };
  return (
    <>
      <p className="sub">{t('overrideNote')}</p>
      <label className="lbl">
        {t('reasonReq')}
        <textarea
          className="inp"
          style={{ minHeight: 90 }}
          value={ui.ovReason}
          onChange={(e) => set({ ovReason: e.target.value })}
        />
      </label>
      <button className="btn p lg full" disabled={ui.ovReason.trim() === ''} onClick={confirm}>
        {t('override')}
      </button>
    </>
  );
}

export function RescheduleSheet() {
  const { t } = useI18n();
  const { ui, set, toast } = useUi();
  const repo = useRepository();
  const actor = useActor();
  const today = useClock().today();
  const a = useCurrentAppointment();
  const { days, slots } = useSlotPicker(a.doctorId);
  const confirm = async () => {
    if (!ui.bk.slot) return;
    const next = await repo.rescheduleAppointment(actor, a.id, {
      date: addDays(today, ui.bk.day),
      time: ui.bk.slot,
    });
    set({ sheet: '', canReason: '', apptId: next.id });
    toast(t('toastRescheduled'));
  };
  return (
    <>
      <p className="sub">{t('reschedNote')}</p>
      <div className="tabs">
        {days.map((d) => (
          <button key={d.label} className={d.cls} onClick={d.pick}>
            {d.label}
          </button>
        ))}
      </div>
      <div className="slots">
        {slots.map((s) => (
          <button
            key={s.time}
            className={s.cls}
            disabled={s.off}
            onClick={() => set((st) => ({ bk: { ...st.bk, slot: s.time } }))}
          >
            {s.time}
          </button>
        ))}
      </div>
      <label className="lbl">
        {t('reasonOpt')}
        <input
          className="inp"
          value={ui.canReason}
          onChange={(e) => set({ canReason: e.target.value })}
        />
      </label>
      <button className="btn p lg full" disabled={!ui.bk.slot} onClick={confirm}>
        {t('reschedule')}
      </button>
    </>
  );
}
