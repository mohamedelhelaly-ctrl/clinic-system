import type { DoctorId, Role, UserId } from '../domain';

export interface Session {
  userId: UserId;
  role: Role;
  /** The doctor record of the signed-in user when acting as a doctor or admin-doctor. */
  doctorId: DoctorId | null;
}

/**
 * Authentication seam. The demo signs in by role without a password
 * (`src/demo/demoAuth.ts`); production plugs in real sign-in and session expiry.
 */
export interface AuthService {
  getSession(): Session | null;
  subscribe(listener: () => void): () => void;
  signOut(): void;
}
