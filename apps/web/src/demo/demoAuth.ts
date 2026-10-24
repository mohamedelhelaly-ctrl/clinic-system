import type { AuthService, Session } from '../auth';
import type { Role } from '../domain';

/** Fictional staff the demo signs in as, per role. */
const DEMO_USERS: Record<Role, Session> = {
  receptionist: { userId: 'u-nour', role: 'receptionist', doctorId: null },
  doctor: { userId: 'u-karim', role: 'doctor', doctorId: 'd1' },
  admin: { userId: 'u-karim', role: 'admin', doctorId: 'd1' },
};

const KEY = 'clinic-demo:session';

/** Password-free sign-in by role. Replaced by real authentication in production. */
export class DemoAuthService implements AuthService {
  private session: Session | null;
  private listeners = new Set<() => void>();

  constructor(initialRole: Role | null) {
    this.session = initialRole ? DEMO_USERS[initialRole] : this.load();
    this.save();
  }

  getSession = (): Session | null => this.session;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  signInAs(role: Role): void {
    this.set(DEMO_USERS[role]);
  }

  signOut(): void {
    this.set(null);
  }

  private set(session: Session | null): void {
    this.session = session;
    this.save();
    this.listeners.forEach((l) => l());
  }

  private load(): Session | null {
    try {
      const role = window.localStorage.getItem(KEY) as Role | null;
      return role && role in DEMO_USERS ? DEMO_USERS[role] : null;
    } catch {
      return null;
    }
  }

  private save(): void {
    try {
      if (this.session) window.localStorage.setItem(KEY, this.session.role);
      else window.localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }
}
