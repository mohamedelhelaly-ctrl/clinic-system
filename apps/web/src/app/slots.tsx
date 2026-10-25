import type { ComponentType, ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { AppointmentId } from '../domain';

/**
 * Optional extra panels the composition root can plug into screens. The demo
 * uses them for its simulation controls; production passes none, so nothing
 * renders.
 */
export interface AppSlots {
  /** Rendered in the side column of the appointment screen. */
  appointment?: ComponentType<{ appointmentId: AppointmentId }>;
}

const SlotsContext = createContext<AppSlots>({});

export function AppSlotsProvider({ slots, children }: { slots: AppSlots; children: ReactNode }) {
  return <SlotsContext.Provider value={slots}>{children}</SlotsContext.Provider>;
}

export function useAppSlots(): AppSlots {
  return useContext(SlotsContext);
}
