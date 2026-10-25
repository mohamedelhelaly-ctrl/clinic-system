import type { AuthService } from '../auth';
import type { AppointmentId, Clock, Language, PatientReply } from '../domain';
import type { ClinicRepository } from '../data';
import {
  localStorageSnapshotStorage,
  MockClinicRepository,
  MockPrescriptionRenderer,
  MockWhatsAppProvider,
} from '../data/mock';
import { DemoAuthService } from './demoAuth';
import { DemoClock } from './demoClock';
import { parseDemoParams, stripResetParam } from './params';
import { installRecordingHooks } from './recordingHooks';
import { createSeed } from './seed';

export interface DemoEnvironment {
  repository: ClinicRepository;
  auth: AuthService;
  clock: Clock;
  initialLanguage: Language | null;
  demo: {
    auth: DemoAuthService;
    clock: DemoClock;
    /** Recording mode (`?clean=1`): demo controls hidden, `window.__demo` installed. */
    clean: boolean;
    reset(): void;
    /** Moves the demo clock, then lets the simulated scheduler catch up. */
    advance(move: (clock: DemoClock) => void): Promise<void>;
    /** Simulates the patient's WhatsApp quick reply to the reminder. */
    reply(appointmentId: AppointmentId, reply: PatientReply): Promise<void>;
  };
}

/**
 * Wires the demo: mock repository on seeded data, movable demo clock, role
 * sign-in and URL parameters. Production replaces this one function.
 */
export function createDemoEnvironment(search = window.location.search): DemoEnvironment {
  const params = parseDemoParams(search);
  const storage = localStorageSnapshotStorage('clinic-demo:data');
  if (params.reset) {
    storage.clear();
    DemoClock.clearStored();
  }
  const clock = new DemoClock();
  const repository = new MockClinicRepository({
    seed: createSeed,
    clock,
    storage,
    whatsapp: new MockWhatsAppProvider(),
    renderer: new MockPrescriptionRenderer(),
  });
  const auth = new DemoAuthService(params.role);
  stripResetParam();
  void repository.demo.runScheduledJobs();
  const demo: DemoEnvironment['demo'] = {
    auth,
    clock,
    clean: params.clean,
    reset: () => {
      clock.reset();
      repository.reset();
    },
    advance: async (move) => {
      move(clock);
      await repository.demo.runScheduledJobs();
    },
    reply: (appointmentId, reply) => repository.demo.simulatePatientReply(appointmentId, reply),
  };
  if (params.clean) installRecordingHooks({ repository, ...demo });
  return { repository, auth, clock, initialLanguage: params.lang, demo };
}
