import type { AppointmentId, ClinicScoped, IsoDateTime, PrescriptionId, UserId } from './common';

export type MessageType = 'reminder' | 'prescription';
export type MessageChannel = 'whatsapp';
export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed';
export type PatientReply = 'confirm' | 'cancel';

/** Every outbound WhatsApp message and the patient's quick replies (spec RC-7). */
export interface MessageLog extends ClinicScoped {
  id: string;
  type: MessageType;
  channel: MessageChannel;
  appointmentId: AppointmentId | null;
  prescriptionId: PrescriptionId | null;
  status: DeliveryStatus;
  /** Id returned by the WhatsApp provider, used to match delivery receipts. */
  providerMessageId: string | null;
  /** When the scheduler should send it (reminders). */
  scheduledFor: IsoDateTime | null;
  sentAt: IsoDateTime | null;
  deliveredAt: IsoDateTime | null;
  replies: { reply: PatientReply; at: IsoDateTime }[];
}

export type CallOutcome = 'confirmed' | 'cancelled' | 'no_answer';

/** A confirmation call (or a manual confirmation) logged by the receptionist (spec RC-5). */
export interface CallLog extends ClinicScoped {
  id: string;
  appointmentId: AppointmentId;
  outcome: CallOutcome;
  loggedBy: UserId;
  loggedAt: IsoDateTime;
}
