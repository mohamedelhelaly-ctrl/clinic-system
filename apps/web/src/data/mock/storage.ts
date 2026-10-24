import type { ClinicSnapshot } from '../snapshot';

export interface StoredState {
  version: number;
  counter: number;
  snapshot: ClinicSnapshot;
}

/** Bump when the seed or the snapshot shape changes so old browser data is discarded. */
export const STORAGE_VERSION = 1;

export interface SnapshotStorage {
  load(): StoredState | null;
  save(state: StoredState): void;
  clear(): void;
}

export function localStorageSnapshotStorage(key: string): SnapshotStorage {
  return {
    load() {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredState;
        return parsed.version === STORAGE_VERSION ? parsed : null;
      } catch {
        return null;
      }
    },
    save(state) {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // Storage can be unavailable (private mode); the demo keeps working in memory.
      }
    },
    clear() {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}

export function memorySnapshotStorage(): SnapshotStorage {
  let stored: StoredState | null = null;
  return {
    load: () => stored,
    save: (state) => {
      stored = state;
    },
    clear: () => {
      stored = null;
    },
  };
}
