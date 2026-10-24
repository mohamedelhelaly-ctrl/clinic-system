import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { Clock } from '../domain';

const ClockContext = createContext<Clock | null>(null);

export function ClockProvider({ clock, children }: { clock: Clock; children: ReactNode }) {
  return <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>;
}

export function useClock(): Clock {
  const clock = useContext(ClockContext);
  if (!clock) throw new Error('useClock must be used inside <ClockProvider>');
  return clock;
}
