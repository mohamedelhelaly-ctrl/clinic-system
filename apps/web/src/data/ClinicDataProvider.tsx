import type { ReactNode } from 'react';
import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ClinicRepository } from './repository';
import type { ClinicSnapshot } from './snapshot';

const RepositoryContext = createContext<ClinicRepository | null>(null);

export function ClinicDataProvider({
  repository,
  children,
}: {
  repository: ClinicRepository;
  children: ReactNode;
}) {
  return <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>;
}

export function useRepository(): ClinicRepository {
  const repository = useContext(RepositoryContext);
  if (!repository) throw new Error('useRepository must be used inside <ClinicDataProvider>');
  return repository;
}

/** Live snapshot of the clinic's data; re-renders on every change. */
export function useClinicData(): ClinicSnapshot {
  const repository = useRepository();
  return useSyncExternalStore(repository.subscribe, repository.getSnapshot);
}
