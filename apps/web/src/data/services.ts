import type { IsoDateTime, Patient, Prescription } from '../domain';

/**
 * Seams for the side effects that run on the server in production. The mock
 * repository calls these directly; the real backend will own them.
 */

export type ProviderDeliveryStatus = 'sent' | 'delivered' | 'failed';

/** WhatsApp Business provider (spec §8 Integrations). */
export interface WhatsAppProvider {
  /** Sends a pre-approved template message; resolves once the provider accepts it. */
  send(message: {
    to: string;
    template: 'appointment_reminder' | 'prescription';
    params: Record<string, string>;
    attachmentUrl?: string;
  }): Promise<{ providerMessageId: string }>;
  /** Delivery receipts (sent → delivered / failed) arrive asynchronously. */
  onStatus(
    listener: (providerMessageId: string, status: ProviderDeliveryStatus) => void,
  ): () => void;
}

/** Generates the prescription PDF (spec RX-2). */
export interface PrescriptionRenderer {
  render(prescription: Prescription, patient: Patient): Promise<{ url: string }>;
}

/** Queues the 24-hour reminder for an appointment (spec RC-1). */
export interface ReminderScheduler {
  dueAt(appointmentStart: IsoDateTime): IsoDateTime;
}
