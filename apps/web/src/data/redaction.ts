import type { Role } from '../domain';
import { canSeeClinicalContent, withoutClinicalContent } from '../domain';
import type { ClinicSnapshot } from './snapshot';

/**
 * What a role may receive. Roles without clinical access get visit records
 * without complaint, diagnosis and treatment, no revision history and
 * prescriptions without their medications (spec §2). The API must apply the
 * same rule; this is the demo's equivalent.
 */
export function snapshotForRole(snapshot: ClinicSnapshot, role: Role): ClinicSnapshot {
  if (canSeeClinicalContent(role)) return snapshot;
  return {
    ...snapshot,
    visitRecords: snapshot.visitRecords.map(withoutClinicalContent),
    visitRecordRevisions: [],
    prescriptions: snapshot.prescriptions.map((p) => ({ ...p, items: [] })),
  };
}
