import { useClock } from '../../app/ClockProvider';
import { useActor } from '../../app/hooks';
import { useUi } from '../../app/uiState';
import { useClinicData, useRepository } from '../../data';
import type { PaymentMethod } from '../../domain';
import { PAYMENT_METHODS } from '../../domain';
import type { MessageKey } from '../../i18n';
import { useI18n } from '../../i18n';

export const METHOD_LABEL: Record<PaymentMethod, MessageKey> = {
  cash: 'mCash',
  card: 'mCard',
  transfer: 'mTransfer',
};

/** Shared state for recording a single-visit payment (payments screen and payment sheet). */
export function usePaymentForm() {
  const { t } = useI18n();
  const { ui, set, toast } = useUi();
  const data = useClinicData();
  const repo = useRepository();
  const actor = useActor();
  const today = useClock().today();

  const unpaid = data.appointments.filter(
    (a) =>
      a.date === today &&
      a.paymentStatus === 'unpaid' &&
      a.status !== 'cancelled' &&
      a.status !== 'no_show',
  );
  const selectedId = unpaid.some((a) => a.id === ui.payApptId)
    ? ui.payApptId
    : (unpaid[0]?.id ?? '');
  const amountValid = parseInt(ui.payAmt, 10) > 0;

  const methods = PAYMENT_METHODS.map((m) => ({
    key: m,
    label: t(METHOD_LABEL[m]),
    cls: ui.payMethod === m ? 'chip on' : 'chip',
    pick: () => set({ payMethod: m }),
  }));

  const save = async (appointmentId: string) => {
    const amount = parseInt(ui.payAmt, 10) || 0;
    if (!appointmentId || !amount) return;
    await repo.recordPayment(actor, appointmentId, { amount, method: ui.payMethod });
    set({ sheet: '' });
    toast(t('toastPayment'));
  };

  return { unpaid, selectedId, amountValid, methods, save };
}
