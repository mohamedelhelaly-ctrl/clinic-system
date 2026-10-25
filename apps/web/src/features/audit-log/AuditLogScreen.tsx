import { useActorLabel, useDirectory } from '../../app/hooks';
import { useClinicData } from '../../data';
import type { AuditLog, LocalizedText, PackageAdjustment } from '../../domain';
import type { MessageKey } from '../../i18n';
import { useI18n } from '../../i18n';

const ADJUSTMENT_LABEL: Record<PackageAdjustment, MessageKey> = {
  add_visit: 'adjAdd',
  remove_visit: 'adjRemove',
  extend_expiry: 'adjExtend',
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
      else if (k === 'adjustment') {
        const label = ADJUSTMENT_LABEL[v as PackageAdjustment];
        params[k] = label ? t(label) : String(v);
      } else params[k] = String(v);
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
              alignItems: 'baseline',
            }}
          >
            <span className="sub" style={{ flex: '0 0 132px', fontVariantNumeric: 'tabular-nums' }}>
              {entry.at.replace('T', ' ')}
            </span>
            <span style={{ flex: 1 }}>{describe(entry)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
