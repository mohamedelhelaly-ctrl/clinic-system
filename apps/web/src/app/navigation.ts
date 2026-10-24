import type { IconName } from '../components';
import type { Permission, Role } from '../domain';
import { can } from '../domain';
import type { MessageKey } from '../i18n';
import type { ScreenName } from './uiState';

export type NavKey = 'home' | 'cal' | 'calls' | 'pay' | 'patients' | 'settings' | 'audit';

export const NAV_ITEMS: Record<
  NavKey,
  { icon: IconName; label: MessageKey; permission: Permission }
> = {
  home: { icon: 'home', label: 'today', permission: 'screen.home' },
  cal: { icon: 'cal', label: 'calendar', permission: 'screen.calendar' },
  calls: { icon: 'phone', label: 'callList', permission: 'screen.callList' },
  pay: { icon: 'card', label: 'payments', permission: 'screen.payments' },
  patients: { icon: 'users', label: 'patients', permission: 'screen.patients' },
  settings: { icon: 'gear', label: 'settings', permission: 'screen.settings' },
  audit: { icon: 'clip', label: 'audit', permission: 'screen.audit' },
};

/** Doctors see Patients before Payments; everyone else follows the front-desk order. */
const ORDER: Record<Role, NavKey[]> = {
  receptionist: ['home', 'cal', 'calls', 'pay', 'patients', 'settings', 'audit'],
  doctor: ['home', 'cal', 'patients', 'pay', 'calls', 'settings', 'audit'],
  admin: ['home', 'cal', 'calls', 'pay', 'patients', 'settings', 'audit'],
};

/** The four phone tab-bar slots; the rest go under "More". */
const PHONE_TABS: Record<Role, NavKey[]> = {
  receptionist: ['home', 'cal', 'calls', 'pay'],
  doctor: ['home', 'cal', 'patients', 'pay'],
  admin: ['home', 'cal', 'calls', 'pay'],
};

export function navigationFor(role: Role) {
  const allowed = ORDER[role].filter((k) => can(role, NAV_ITEMS[k].permission));
  const tabs = PHONE_TABS[role].filter((k) => allowed.includes(k));
  return { sidebar: allowed, tabs, more: allowed.filter((k) => !tabs.includes(k)) };
}

/** Which navigation item is highlighted for a screen. */
export const SECTION_OF: Record<ScreenName, NavKey> = {
  home: 'home',
  appt: 'home',
  book: 'home',
  visit: 'home',
  rx: 'home',
  cal: 'cal',
  calls: 'calls',
  pay: 'pay',
  patients: 'patients',
  patient: 'patients',
  settings: 'settings',
  audit: 'audit',
};

/** Screens that show the floating "New appointment" button on phones. */
export const FAB_SCREENS: ScreenName[] = ['home', 'cal', 'calls', 'pay', 'patients'];
