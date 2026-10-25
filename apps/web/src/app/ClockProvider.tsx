import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import type { Clock } from '../domain';

const ClockContext = createContext<Clock | null>(null);

const never = () => () => undefined;

/** Re-renders the app when a movable clock (the demo clock) changes time. */
export function ClockProvider({ clock, children }: { clock: Clock; children: ReactNode }) {
  const now = useSyncExternalStore(clock.subscribe ?? never, () => clock.now());
  const value = useMemo<Clock>(
    () => ({ today: () => clock.today(), time: () => clock.time(), now: () => clock.now() }),
    // `now` is a dependency so consumers get a new value whenever time moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clock, now],
  );
  return <ClockContext.Provider value={value}>{children}</ClockContext.Provider>;
}

export function useClock(): Clock {
  const clock = useContext(ClockContext);
  if (!clock) throw new Error('useClock must be used inside <ClockProvider>');
  return clock;
}
