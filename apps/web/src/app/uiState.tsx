import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { AppointmentId, AppointmentStatus, PackageId, PatientId } from '../domain';

/*
 * View state only: which screen is open, form inputs, filters, open sheets.
 * Clinic data never lives here; it comes from the repository.
 */

export type ScreenName =
  | 'home'
  | 'appt'
  | 'book'
  | 'patients'
  | 'patient'
  | 'visit'
  | 'rx'
  | 'cal'
  | 'calls'
  | 'pay'
  | 'settings'
  | 'audit';

export type SheetName =
  | ''
  | 'pay'
  | 'cancel'
  | 'override'
  | 'resched'
  | 'slots'
  | 'pkg'
  | 'adj'
  | 'more'
  | 'block'
  | 'editpt';

export interface BookingState {
  step: 0 | 1 | 2 | 3;
  patientId: PatientId | null;
  doctorId: string | null;
  /** Days from today. */
  day: number;
  slot: string | null;
  registering: boolean;
  walkIn: boolean;
}

export interface RxRow {
  drug: string;
  dose: string;
  freq: string;
  dur: string;
  note: string;
}

export interface UiState {
  screen: ScreenName;
  apptId: AppointmentId | null;
  patId: PatientId | null;
  sheet: SheetName;
  toast: string;
  // home filters
  fDoc: string;
  fSt: 'all' | AppointmentStatus;
  attn: boolean;
  // search and booking
  q: string;
  bk: BookingState;
  reason: string;
  rgName: string;
  rgPhone: string;
  rgDob: string;
  rgGender: 'F' | 'M';
  rgAddr: string;
  rgAlerts: string;
  // payments
  payAmt: string;
  payMethod: 'cash' | 'card' | 'transfer';
  payApptId: string;
  ptab: 'rec' | 'pkg';
  pkgPatient: PatientId;
  pkgPrice: string;
  pkgVisits: string;
  pkgExpiry: string;
  pkgNotes: string;
  adjPkg: PackageId;
  adjType: 'add' | 'remove' | 'extend';
  adjReason: string;
  // appointment sheets
  canReason: string;
  ovReason: string;
  // visit record and prescription
  complaint: string;
  diagnosis: string;
  treatment: string;
  rxRows: RxRow[];
  histOpen: boolean;
  // patient file
  edPhone: string;
  edAddr: string;
  edAlerts: string;
  edOpen: Record<string, boolean>;
  // calendar
  cdoc: string;
  cview: 'day' | 'week';
  cday: number;
  // settings
  stab: 'docs' | 'clinic' | 'rem' | 'users';
  blkDoc: string;
  blkDay: '1' | '2';
  blkNote: string;
}

export const initialUiState: UiState = {
  screen: 'home',
  apptId: null,
  patId: null,
  sheet: '',
  toast: '',
  fDoc: 'all',
  fSt: 'all',
  attn: false,
  q: '',
  bk: {
    step: 0,
    patientId: null,
    doctorId: null,
    day: 0,
    slot: null,
    registering: false,
    walkIn: false,
  },
  reason: '',
  rgName: '',
  rgPhone: '',
  rgDob: '',
  rgGender: 'F',
  rgAddr: '',
  rgAlerts: '',
  payAmt: '',
  payMethod: 'cash',
  payApptId: 'a4',
  ptab: 'rec',
  pkgPatient: 'p1',
  pkgPrice: '8000',
  pkgVisits: '10',
  pkgExpiry: '',
  pkgNotes: '',
  adjPkg: 'k1',
  adjType: 'add',
  adjReason: '',
  canReason: '',
  ovReason: '',
  complaint: '',
  diagnosis: '',
  treatment: '',
  rxRows: [],
  histOpen: false,
  edPhone: '',
  edAddr: '',
  edAlerts: '',
  edOpen: {},
  cdoc: 'd1',
  cview: 'day',
  cday: 0,
  stab: 'docs',
  blkDoc: 'd1',
  blkDay: '1',
  blkNote: '',
};

type Patch = Partial<UiState> | ((s: UiState) => Partial<UiState>);

interface UiContextValue {
  ui: UiState;
  set(patch: Patch): void;
  nav(screen: ScreenName, patch?: Partial<UiState>): void;
  goBack(): void;
  root(screen: ScreenName, patch?: Partial<UiState>): void;
  toast(message: string): void;
}

const UiContext = createContext<UiContextValue | null>(null);

const TOAST_MS = 2600;

export function UiProvider({
  initial,
  children,
}: {
  initial?: Partial<UiState>;
  children: ReactNode;
}) {
  const [ui, setUi] = useState<UiState>(() => ({ ...initialUiState, ...initial }));
  const stack = useRef<Pick<UiState, 'screen' | 'apptId' | 'patId'>[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const uiRef = useRef(ui);
  uiRef.current = ui;

  const set = useCallback((patch: Patch) => {
    setUi((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  }, []);

  const value = useMemo<UiContextValue>(
    () => ({
      ui,
      set,
      nav(screen, patch) {
        const s = uiRef.current;
        stack.current.push({ screen: s.screen, apptId: s.apptId, patId: s.patId });
        set({ screen, sheet: '', ...patch });
      },
      goBack() {
        const prev = stack.current.pop();
        set(prev ? { ...prev, sheet: '' } : { screen: 'home', sheet: '' });
      },
      root(screen, patch) {
        stack.current = [];
        set({ screen, sheet: '', ...patch });
      },
      toast(message) {
        set({ toast: message });
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => set({ toast: '' }), TOAST_MS);
      },
    }),
    [ui, set],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>');
  return ctx;
}

/** Input binding helper: `{...bind('q')}` gives value + onChange for a string field. */
export function useBind() {
  const { ui, set } = useUi();
  return <K extends keyof UiState>(key: K) => ({
    value: ui[key] as unknown as string,
    onChange: (e: { target: { value: string } }) =>
      set({ [key]: e.target.value } as unknown as Partial<UiState>),
  });
}
