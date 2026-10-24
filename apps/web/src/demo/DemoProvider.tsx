import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { DemoEnvironment } from './environment';

const DemoContext = createContext<DemoEnvironment['demo'] | null>(null);

export function DemoProvider({
  demo,
  children,
}: {
  demo: DemoEnvironment['demo'];
  children: ReactNode;
}) {
  return <DemoContext.Provider value={demo}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoEnvironment['demo'] {
  const demo = useContext(DemoContext);
  if (!demo) throw new Error('useDemo must be used inside <DemoProvider>');
  return demo;
}
