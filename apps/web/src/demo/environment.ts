import type { AuthService } from '../auth';
import type { Clock, Language } from '../domain';
import type { ClinicRepository } from '../data';
import {
  localStorageSnapshotStorage,
  MockClinicRepository,
  MockPrescriptionRenderer,
  MockWhatsAppProvider,
} from '../data/mock';
import { DemoAuthService } from './demoAuth';
import { fixedClock } from './fixedClock';
import { parseDemoParams, stripResetParam } from './params';
import { createSeed } from './seed';

export interface DemoEnvironment {
  repository: ClinicRepository;
  auth: AuthService;
  clock: Clock;
  initialLanguage: Language | null;
  demo: {
    auth: DemoAuthService;
    reset(): void;
  };
}

/**
 * Wires the demo: mock repository on seeded data, fixed clock, role sign-in
 * and URL parameters. Production replaces this one function.
 */
export function createDemoEnvironment(search = window.location.search): DemoEnvironment {
  const params = parseDemoParams(search);
  const storage = localStorageSnapshotStorage('clinic-demo:data');
  if (params.reset) storage.clear();
  const repository = new MockClinicRepository({
    seed: createSeed,
    clock: fixedClock,
    storage,
    whatsapp: new MockWhatsAppProvider(),
    renderer: new MockPrescriptionRenderer(),
  });
  const auth = new DemoAuthService(params.role);
  stripResetParam();
  return {
    repository,
    auth,
    clock: fixedClock,
    initialLanguage: params.lang,
    demo: {
      auth,
      reset: () => repository.reset(),
    },
  };
}
