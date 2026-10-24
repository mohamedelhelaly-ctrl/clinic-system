import { useCallback } from 'react';
import type { Session } from '../auth';
import { AuthProvider, useSession } from '../auth';
import { ClinicDataProvider } from '../data';
import type { Role } from '../domain';
import { DemoFooter } from '../demo/DemoFooter';
import { DemoLoginScreen } from '../demo/DemoLoginScreen';
import { DemoProvider, useDemo } from '../demo/DemoProvider';
import { DemoRoleSwitcher } from '../demo/DemoRoleSwitcher';
import type { DemoEnvironment } from '../demo/environment';
import { I18nProvider, useI18n } from '../i18n';
import '../styles/app.css';
import { AppShell } from './AppShell';
import { ClockProvider } from './ClockProvider';
import type { UiState } from './uiState';
import { UiProvider, useUi } from './uiState';

/** View-state defaults that depend on who is signed in (doctors see their own day first). */
function sessionDefaults(session: Session | null): Partial<UiState> {
  if (session?.role === 'doctor' && session.doctorId) {
    return { fDoc: session.doctorId, cdoc: session.doctorId };
  }
  return { fDoc: 'all' };
}

function Root() {
  const { dir, t } = useI18n();
  const session = useSession();
  const demo = useDemo();
  const { root, toast } = useUi();

  const signIn = useCallback(
    (role: Role) => {
      demo.auth.signInAs(role);
      root('home', sessionDefaults(demo.auth.getSession()));
    },
    [demo, root],
  );

  return (
    <div className="app" dir={dir}>
      {session ? (
        <AppShell
          headerExtras={<DemoRoleSwitcher onChange={signIn} />}
          footer={
            <DemoFooter
              onReset={() => {
                root('home', sessionDefaults(session));
                toast(t('toastReset'));
              }}
            />
          }
        />
      ) : (
        <DemoLoginScreen onSignedIn={signIn} />
      )}
    </div>
  );
}

export function App({ env }: { env: DemoEnvironment }) {
  return (
    <ClockProvider clock={env.clock}>
      <ClinicDataProvider repository={env.repository}>
        <AuthProvider auth={env.auth}>
          <DemoProvider demo={env.demo}>
            <I18nProvider initialLanguage={env.initialLanguage}>
              <UiProvider initial={sessionDefaults(env.auth.getSession())}>
                <Root />
              </UiProvider>
            </I18nProvider>
          </DemoProvider>
        </AuthProvider>
      </ClinicDataProvider>
    </ClockProvider>
  );
}
