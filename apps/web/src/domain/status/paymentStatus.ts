export const PAYMENT_STATUSES = ['unpaid', 'paid', 'package'] as const;

/** `package` = "Covered by package". */
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** The consultation may start only once payment is settled (spec PY-1). */
export function isPaymentSettled(status: PaymentStatus): boolean {
  return status !== 'unpaid';
}
