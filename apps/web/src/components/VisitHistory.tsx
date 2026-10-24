import type { DoctorId, VisitRecord } from '../domain';
import { useI18n } from '../i18n';

export interface HistoryEntry {
  record: VisitRecord;
  doctorName: string;
}

/** Past visits with the three clinical fields, newest first. Doctors and admins only. */
export function VisitHistoryItems({ entries }: { entries: HistoryEntry[] }) {
  const { t, fmt } = useI18n();
  return (
    <>
      {entries.map(({ record, doctorName }) => (
        <div className="tli" key={record.id}>
          <div className="row sb">
            <b>
              <span>{fmt.date(record.date)}</span>
            </b>
            <span className="sub">
              <span>{doctorName}</span>
            </span>
          </div>
          <div className="blk">
            <b>{t('complaint')}</b>
            {record.complaint}
          </div>
          <div className="blk">
            <b>{t('diagnosis')}</b>
            {record.diagnosis}
          </div>
          <div className="blk">
            <b>{t('treatment')}</b>
            {record.treatment}
          </div>
        </div>
      ))}
    </>
  );
}

export type DoctorNameLookup = (id: DoctorId) => string;
