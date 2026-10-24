import { useActorLabel, useDirectory } from '../../app/hooks';
import { useClinicData } from '../../data';
import type { AuditLog, LocalizedText, PackageAdjustment } from '../../domain';
import type { MessageKey } from '../../i18n';
import { useI18n } from '../../i18n';

/** The prototype shows the short adjustment code in the log text. */
const ADJUSTMENT_CODE: Record<PackageAdjustment, string> = {
  add_visit: 'add',
  remove_visit: 'remove',
  extend_expiry: 'extend',
};

export function AuditLogScreen() {
  const { t, text, fmt } = useI18n();
  const data = useClinicData();
  const dir = useDirectory();
  const actorLabel = useActorLabel();

  const describe = (entry: AuditLog) => {
    const params: Record<string, string> = { actor: actorLabel(entry.userId, entry.role) };
    for (const [k, v] of Object.entries(entry.params)) {
      if (typeof v === 'object') params[k] = text(v as LocalizedText);
      else if (k === 'price') params[k] = fmt.money(Number(v));
      else if (k === 'date') params[k] = fmt.date(String(v));
      else if (k === 'adjustment') params[k] = ADJUSTMENT_CODE[v as PackageAdjustment] ?? String(v);
      else params[k] = String(v);
    }
    const gender = entry.role === 'admin' ? 'M' : dir.user(entry.userId)?.gender;
    return t(`audit.${entry.action}` as MessageKey, params, { gender });
  };

  return (
    <div className="scr">
      <h1>{t('audit')}</h1>
      <div className="card" style={{ padding: '8px 16px' }}>
        {data.auditLog.map((entry) => (
          <div
            className="row"
            key={entry.id}
            style={{
              padding: '12px 0',
              borderBottom: '1px solid var(--ln)',
              flexWrap: 'nowrap',
              alignItems: 'flex-start',
            }}
          >
            <span className="sub" style={{ minWidth: 96 }}>
              {entry.at.replace('T', ' ')}
            </span>
            <span style={{ flex: 1 }}>{describe(entry)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
