import { useRequiredSession } from '../auth';
import type { Role } from '../domain';
import type { MessageKey } from '../i18n';
import { useI18n } from '../i18n';

export const ROLE_OPTIONS: { role: Role; label: MessageKey }[] = [
  { role: 'receptionist', label: 'rRec' },
  { role: 'doctor', label: 'rDoc' },
  { role: 'admin', label: 'rAdm' },
];

/** Header control to switch the demo between receptionist, doctor and admin. */
export function DemoRoleSwitcher({ onChange }: { onChange(role: Role): void }) {
  const { t } = useI18n();
  const session = useRequiredSession();
  return (
    <label className="demo">
      {t('demoRole')}
      <select
        value={session.role}
        onChange={(e) => onChange(e.target.value as Role)}
        aria-label={t('demoRole')}
      >
        {ROLE_OPTIONS.map((o) => (
          <option key={o.role} value={o.role}>
            {t(o.label)}
          </option>
        ))}
      </select>
    </label>
  );
}
