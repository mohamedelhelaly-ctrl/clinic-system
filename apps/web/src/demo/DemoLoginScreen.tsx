import { useState } from 'react';
import { Icon } from '../components';
import { useClinicData } from '../data';
import type { Role } from '../domain';
import { useI18n } from '../i18n';
import { DemoFooter } from './DemoFooter';
import { useDemo } from './DemoProvider';
import { ROLE_OPTIONS } from './DemoRoleSwitcher';

/**
 * Stand-in login: prefilled fictional credentials and a role picker.
 * Production replaces this with real sign-in.
 */
export function DemoLoginScreen({ onSignedIn }: { onSignedIn(role: Role): void }) {
  const { t, text, toggleLang } = useI18n();
  const data = useClinicData();
  const demo = useDemo();
  const [role, setRole] = useState<Role>(demo.auth.lastRole());

  return (
    <div className="login" style={{ width: '100%' }}>
      <div
        className="card"
        style={{
          width: 'min(420px,100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          padding: 28,
        }}
      >
        <div className="row sb">
          <div className="brand" style={{ padding: 0 }}>
            <span className="logo">
              <Icon name="cross" />
            </span>
            {text(data.clinic.name)}
          </div>
          <button className="btn sm lang" onClick={toggleLang} aria-label={t('language')}>
            {t('langBtn')}
          </button>
        </div>
        <div>
          <h1>{t('welcome')}</h1>
          <p className="sub">{t('loginSub')}</p>
        </div>
        <label className="lbl">
          {t('email')}
          <input className="inp" type="email" defaultValue="nour@nilecare.example" />
        </label>
        <label className="lbl">
          {t('password')}
          <input className="inp" type="password" defaultValue="demo-demo" />
        </label>
        <label className="lbl">
          {t('demoRole')}
          <select className="inp" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLE_OPTIONS.map((o) => (
              <option key={o.role} value={o.role}>
                {t(o.label)}
              </option>
            ))}
          </select>
        </label>
        <button className="btn p lg full" onClick={() => onSignedIn(role)}>
          {t('signIn')}
        </button>
      </div>
      <DemoFooter fixed />
    </div>
  );
}
