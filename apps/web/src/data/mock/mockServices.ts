import type { IsoDateTime, Patient, Prescription } from '../../domain';
import { addHours } from '../../domain';
import type {
  PrescriptionRenderer,
  ProviderDeliveryStatus,
  ReminderScheduler,
  WhatsAppProvider,
} from '../services';

/** How long the fake provider takes to report a message as delivered. */
export const MOCK_DELIVERY_DELAY_MS = 1400;

/** Accepts every message and reports it delivered after a short delay. */
export class MockWhatsAppProvider implements WhatsAppProvider {
  private listeners = new Set<(id: string, status: ProviderDeliveryStatus) => void>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private counter = 0;

  async send(
    message: Parameters<WhatsAppProvider['send']>[0],
  ): Promise<{ providerMessageId: string }> {
    void message;
    const providerMessageId = `wamid.mock.${++this.counter}`;
    this.scheduleDelivery(providerMessageId);
    return { providerMessageId };
  }

  onStatus(listener: (id: string, status: ProviderDeliveryStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  scheduleDelivery(providerMessageId: string): void {
    this.cancel(providerMessageId);
    this.timers.set(
      providerMessageId,
      setTimeout(() => {
        this.timers.delete(providerMessageId);
        this.emit(providerMessageId, 'delivered');
      }, MOCK_DELIVERY_DELAY_MS),
    );
  }

  /** Demo control: the next receipt for this message is a failure. */
  fail(providerMessageId: string): void {
    this.cancel(providerMessageId);
    this.emit(providerMessageId, 'failed');
  }

  private cancel(providerMessageId: string): void {
    const timer = this.timers.get(providerMessageId);
    if (timer) clearTimeout(timer);
    this.timers.delete(providerMessageId);
  }

  private emit(id: string, status: ProviderDeliveryStatus): void {
    this.listeners.forEach((l) => l(id, status));
  }
}

/** Pretends to render a PDF; returns the file name a real renderer would store. */
export class MockPrescriptionRenderer implements PrescriptionRenderer {
  async render(_prescription: Prescription, patient: Patient): Promise<{ url: string }> {
    return { url: `Prescription_${patient.name.value.replace(/\s/g, '_')}.pdf` };
  }
}

export class LeadTimeReminderScheduler implements ReminderScheduler {
  constructor(private readonly leadHours: () => number) {}

  dueAt(appointmentStart: IsoDateTime): IsoDateTime {
    return addHours(appointmentStart, -this.leadHours());
  }
}
