import { useCallback } from 'react';
import type { RxRow, UiState } from '../../app/uiState';
import { useUi } from '../../app/uiState';
import type { VisitDraft } from '../../data';
import { useClinicData } from '../../data';
import type { AppointmentId, PrescriptionItem } from '../../domain';

export const toRxRow = (i: PrescriptionItem): RxRow => ({
  drug: i.drug,
  dose: i.dose,
  freq: i.frequency,
  dur: i.duration,
  note: i.instructions,
});

/** The visit record form as the repository expects it. */
export function draftFromUi(ui: UiState): VisitDraft {
  return {
    fields: { complaint: ui.complaint, diagnosis: ui.diagnosis, treatment: ui.treatment },
    items: ui.rxRows.map((r) => ({
      drug: r.drug,
      dose: r.dose,
      frequency: r.freq,
      duration: r.dur,
      instructions: r.note,
    })),
  };
}

/** Opens the visit record of an appointment, loading a saved draft if there is one. */
export function useOpenVisit() {
  const { nav } = useUi();
  const data = useClinicData();
  return useCallback(
    (appointmentId: AppointmentId) => {
      const draft = data.visitRecords.find(
        (v) => v.appointmentId === appointmentId && v.finalizedAt === null,
      );
      const items = draft
        ? (data.prescriptions.find((p) => p.visitRecordId === draft.id)?.items ?? [])
        : [];
      nav('visit', {
        apptId: appointmentId,
        complaint: draft?.complaint ?? '',
        diagnosis: draft?.diagnosis ?? '',
        treatment: draft?.treatment ?? '',
        rxRows: items.map(toRxRow),
        histOpen: false,
      });
    },
    [nav, data],
  );
}

/** The WhatsApp message of the prescription being drafted for this appointment, if sent. */
export function usePrescriptionDelivery(appointmentId: AppointmentId | null) {
  const data = useClinicData();
  const record = data.visitRecords.find(
    (v) => v.appointmentId === appointmentId && v.finalizedAt === null,
  );
  const prescription = record
    ? data.prescriptions.find((p) => p.visitRecordId === record.id)
    : undefined;
  const message = prescription
    ? data.messages.find((m) => m.type === 'prescription' && m.prescriptionId === prescription.id)
    : undefined;
  return { prescription, message };
}
