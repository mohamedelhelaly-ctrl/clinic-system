import type { DeliveryStatus } from '../../domain';
import type { MessageKey } from '../../i18n';

export const DELIVERY_UI: Partial<Record<DeliveryStatus, { label: MessageKey; cls: string }>> = {
  sent: { label: 'dSent', cls: 'badge b-sched' },
  delivered: { label: 'dDelivered', cls: 'badge b-conf' },
  failed: { label: 'dFailed', cls: 'badge b-canc' },
};
