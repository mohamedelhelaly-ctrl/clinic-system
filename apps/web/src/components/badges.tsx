import type { AppointmentStatus, PaymentStatus } from '../domain';
import type { MessageKey } from '../i18n';
import { useI18n } from '../i18n';
import type { ConfirmationChannel } from '../domain';
import { Icon } from './Icon';

export const APPOINTMENT_STATUS_UI: Record<AppointmentStatus, { label: MessageKey; cls: string }> =
  {
    scheduled: { label: 'sSched', cls: 'b-sched' },
    confirmed: { label: 'sConf', cls: 'b-conf' },
    needs_call: { label: 'sNeeds', cls: 'b-call' },
    arrived: { label: 'sArr', cls: 'b-arr' },
    in_consultation: { label: 'sCons', cls: 'b-cons' },
    completed: { label: 'sDone', cls: 'b-done' },
    cancelled: { label: 'sCanc', cls: 'b-canc' },
    no_show: { label: 'sNosh', cls: 'b-nosh' },
  };

export const PAYMENT_STATUS_UI: Record<PaymentStatus, { label: MessageKey; cls: string }> = {
  unpaid: { label: 'pUnp', cls: 'p-unp' },
  paid: { label: 'pPaid', cls: 'p-paid' },
  package: { label: 'pPkg', cls: 'p-pkg' },
};

export const statusClass = (s: AppointmentStatus) => `badge ${APPOINTMENT_STATUS_UI[s].cls}`;
export const paymentClass = (p: PaymentStatus) => `badge ${PAYMENT_STATUS_UI[p].cls}`;

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { t } = useI18n();
  return (
    <span className={statusClass(status)}>
      <span>{t(APPOINTMENT_STATUS_UI[status].label)}</span>
    </span>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const { t } = useI18n();
  return (
    <span className={paymentClass(status)}>
      <span>{t(PAYMENT_STATUS_UI[status].label)}</span>
    </span>
  );
}

/** WhatsApp or phone glyph showing how the patient confirmed. */
export function ConfirmationIcon({ channel }: { channel: ConfirmationChannel | null }) {
  const { t } = useI18n();
  if (!channel) return null;
  return channel === 'whatsapp' ? (
    <Icon name="wa" small label={t('viaWa')} />
  ) : (
    <Icon name="phone" small label={t('viaPhone')} />
  );
}

/** Appointment status, confirmation channel and payment status, as on the roster. */
export function StatusBadges({
  status,
  paymentStatus,
  channel,
}: {
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  channel: ConfirmationChannel | null;
}) {
  return (
    <>
      <StatusBadge status={status} />
      <ConfirmationIcon channel={channel} />
      <PaymentBadge status={paymentStatus} />
    </>
  );
}
