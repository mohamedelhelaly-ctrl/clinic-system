import type { ReactNode } from 'react';
import { createContext, useContext, useSyncExternalStore } from 'react';
import type { Role } from '../domain';
import type { ClinicRepository } from './repository';
import type { ClinicSnapshot } from './snapshot';

const RepositoryContext = createContext<ClinicRepository | null>(null);
const ViewerContext = createContext<Role | null>(null);

/**
 * `viewer` is the signed-in role; data is scoped to what that role may see.
 * Signed out, the least-privileged view is used.
 */
export function ClinicDataProvider({
  repository,
  viewer,
  children,
}: {
  repository: ClinicRepository;
  viewer: Role | null;
  children: ReactNode;
}) {
  return (
    <RepositoryContext.Provider value={repository}>
      <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>
    </RepositoryContext.Provider>
  );
}

export function useRepository(): ClinicRepository {
  const repository = useContext(RepositoryContext);
  if (!repository) throw new Error('useRepository must be used inside <ClinicDataProvider>');
  return repository;
}

/** Live snapshot of the clinic's data; re-renders on every change. */
export function useClinicData(): ClinicSnapshot {
  const repository = useRepository();
  const viewer = useContext(ViewerContext) ?? 'receptionist';
  return useSyncExternalStore(repository.subscribe, () => repository.getSnapshotFor(viewer));
}
