import { useCallback } from 'react';
import { useUi } from '../../app/uiState';
import type { PatientId } from '../../domain';

/** Opens the booking flow, optionally for a known patient or as a walk-in. */
export function useStartBooking() {
  const { root } = useUi();
  return useCallback(
    (patientId?: PatientId | null, walkIn = false) =>
      root('book', {
        q: '',
        reason: '',
        bk: {
          step: patientId ? 1 : 0,
          patientId: patientId ?? null,
          doctorId: null,
          day: 0,
          slot: null,
          registering: false,
          walkIn,
        },
      }),
    [root],
  );
}
