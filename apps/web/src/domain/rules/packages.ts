import type { Package, PackageAdjustment } from '../billing';
import type { IsoDate, PatientId } from '../common';
import { addMonths } from './dates';

export function remainingVisits(pkg: Pick<Package, 'totalVisits' | 'visitsUsed'>): number {
  return pkg.totalVisits - pkg.visitsUsed;
}

export function isPackageActive(pkg: Package, today: IsoDate): boolean {
  return remainingVisits(pkg) > 0 && (!pkg.expiryDate || pkg.expiryDate >= today);
}

export function findActivePackage(
  packages: readonly Package[],
  patientId: PatientId,
  today: IsoDate,
): Package | undefined {
  return packages.find((k) => k.patientId === patientId && isPackageActive(k, today));
}

/** The package shown on the patient file: the one with the most visits left. */
export function primaryPackage(
  packages: readonly Package[],
  patientId: PatientId,
): Package | undefined {
  return packages
    .filter((k) => k.patientId === patientId)
    .sort((a, b) => remainingVisits(b) - remainingVisits(a))[0];
}

export function percentRemaining(pkg: Package): number {
  return Math.round((remainingVisits(pkg) / pkg.totalVisits) * 100);
}

/** Manual adjustment (spec PY-8). Visits can never drop below those already used. */
export function adjustPackage(
  pkg: Package,
  adjustment: PackageAdjustment,
  today: IsoDate,
): Package {
  switch (adjustment) {
    case 'add_visit':
      return { ...pkg, totalVisits: pkg.totalVisits + 1 };
    case 'remove_visit':
      return { ...pkg, totalVisits: Math.max(pkg.visitsUsed, pkg.totalVisits - 1) };
    case 'extend_expiry':
      return { ...pkg, expiryDate: addMonths(pkg.expiryDate ?? today, 1) };
  }
}

export function consumeVisit(pkg: Package): Package {
  return { ...pkg, visitsUsed: pkg.visitsUsed + 1 };
}
