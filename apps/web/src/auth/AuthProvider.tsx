import type { ReactNode } from 'react';
import { createContext, useContext, useSyncExternalStore } from 'react';
import type { AuthService, Session } from './session';

const AuthContext = createContext<AuthService | null>(null);

export function AuthProvider({ auth, children }: { auth: AuthService; children: ReactNode }) {
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthService {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>');
  return auth;
}

export function useSession(): Session | null {
  const auth = useAuth();
  return useSyncExternalStore(auth.subscribe, auth.getSession);
}

/** The session of a signed-in screen; throws if rendered while signed out. */
export function useRequiredSession(): Session {
  const session = useSession();
  if (!session) throw new Error('No active session');
  return session;
}
