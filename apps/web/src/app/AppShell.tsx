import type { ReactNode } from 'react';
import { useAuth, useRequiredSession } from '../auth';
import { Icon } from '../components';
import { useClinicData } from '../data';
import { can } from '../domain';
import { AppointmentScreen } from '../features/appointment/AppointmentScreen';
import { AuditLogScreen } from '../features/audit-log/AuditLogScreen';
import { BookingScreen } from '../features/booking/BookingScreen';
import { useStartBooking } from '../features/booking/useStartBooking';
import { CalendarScreen } from '../features/calendar/CalendarScreen';
import { CallListScreen } from '../features/call-list/CallListScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { PatientFileScreen } from '../features/patients/PatientFileScreen';
import { PatientsScreen } from '../features/patients/PatientsScreen';
import { PaymentsScreen } from '../features/payments/PaymentsScreen';
import { PrescriptionScreen } from '../features/prescription/PrescriptionScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { VisitRecordScreen } from '../features/visit-record/VisitRecordScreen';
import { useI18n } from '../i18n';
import { useClock } from './ClockProvider';
import type { NavKey } from './navigation';
import { FAB_SCREENS, NAV_ITEMS, navigationFor, SECTION_OF } from './navigation';
import { SheetHost } from './SheetHost';
import type { ScreenName, UiState } from './uiState';
import { useUi } from './uiState';

const SCREENS: Record<ScreenName, () => ReactNode> = {
  home: HomeScreen,
  appt: AppointmentScreen,
  book: BookingScreen,
  patients: PatientsScreen,
  patient: PatientFileScreen,
  visit: VisitRecordScreen,
  rx: PrescriptionScreen,
  cal: CalendarScreen,
  calls: CallListScreen,
  pay: PaymentsScreen,
  settings: SettingsScreen,
  audit: AuditLogScreen,
};

interface AppShellProps {
  /** Demo-only header controls (role switcher); absent in production. */
  headerExtras?: ReactNode;
  /** Demo-only footer (Demo badge, reset). */
  footer?: ReactNode;
}

export function AppShell({ headerExtras, footer }: AppShellProps) {
  const { t, text, toggleLang } = useI18n();
  const { ui, set, root } = useUi();
  const auth = useAuth();
  const session = useRequiredSession();
  const data = useClinicData();
  const today = useClock().today();
  const startBooking = useStartBooking();
  const { sidebar, tabs, more } = navigationFor(session.role);
  const section = SECTION_OF[ui.screen];

  const goTo = (key: NavKey) => () => {
    const extra: Partial<UiState> = {};
    if (key === 'pay') {
      const first = data.appointments.find(
        (a) =>
          a.date === today &&
          a.paymentStatus === 'unpaid' &&
          a.status !== 'cancelled' &&
          a.status !== 'no_show',
      );
      const fee = first ? data.doctors.find((d) => d.id === first.doctorId)?.fee : undefined;
      extra.payAmt = fee ? String(fee) : '';
      extra.payApptId = first?.id ?? '';
    }
    if (key === 'patients') extra.q = '';
    root(key, extra);
  };
  const navButton = (key: NavKey, cls: string) => (
    <button key={key} className={section === key ? `${cls} on` : cls} onClick={goTo(key)}>
      <Icon name={NAV_ITEMS[key].icon} />
      {t(NAV_ITEMS[key].label)}
    </button>
  );
  const signOut = () => {
    root('home');
    auth.signOut();
  };

  const Screen = SCREENS[ui.screen];
  const brandIcon = (
    <span className="logo">
      <Icon name="cross" />
    </span>
  );

  return (
    <>
      <aside className="side">
        <div className="brand">
          {brandIcon}
          {text(data.clinic.name)}
        </div>
        {sidebar.map((k) => navButton(k, 'nav'))}
      </aside>
      <div className="main">
        <header className="top">
          <div className="brand hide-d" style={{ padding: 0, fontSize: 16 }}>
            <span className="logo" style={{ width: 30, height: 30 }}>
              <Icon name="cross" small />
            </span>
          </div>
          <div className="sp" />
          {headerExtras}
          <button className="btn sm lang" onClick={toggleLang} aria-label={t('language')}>
            {t('langBtn')}
          </button>
          <button className="btn sm hide-m" onClick={signOut}>
            <Icon name="out" small />
            {t('signOut')}
          </button>
        </header>
        <main className="content">
          <Screen />
          {footer}
        </main>
      </div>
      <nav className="tabbar" aria-label={t('mainNav')}>
        {tabs.map((k) => navButton(k, 'tb'))}
        <button className="tb" onClick={() => set({ sheet: 'more' })}>
          <Icon name="more" />
          {t('more')}
        </button>
      </nav>
      {can(session.role, 'appointment.quickCreate') && FAB_SCREENS.includes(ui.screen) && (
        <button className="btn p lg fab" onClick={() => startBooking()}>
          <Icon name="plus" />
          {t('newAppt')}
        </button>
      )}
      <SheetHost
        moreContent={
          <>
            {more.map((k) => navButton(k, 'nav'))}
            <button className="nav" onClick={signOut}>
              <Icon name="out" />
              {t('signOut')}
            </button>
          </>
        }
      />
      {ui.toast && (
        <div className="toast" role="status">
          {ui.toast}
        </div>
      )}
    </>
  );
}
