import type {
  Appointment,
  AppointmentStatus,
  AuditLog,
  CallLog,
  Doctor,
  DoctorSchedule,
  LocalizedText,
  MessageLog,
  Patient,
  PaymentStatus,
  PrescriptionItem,
} from '../domain';
import type { ClinicSnapshot } from '../data';
import { DEMO_TODAY } from './fixedClock';

/*
 * Demo seed data. Every name, phone number and medical detail is fictional.
 * Phone numbers use the 010 prefix; amounts are in EGP. "Today" is the fixed
 * demo date (Saturday 24 October 2026).
 */

const CLINIC = 'clinic-nile';
const TODAY = DEMO_TODAY;
const TOMORROW = '2026-10-25';
const YESTERDAY = '2026-10-23';

const t = (value: string, ar: string): LocalizedText => ({ value, ar });

const doctors: Doctor[] = [
  {
    id: 'd1',
    clinicId: CLINIC,
    userId: 'u-karim',
    name: t('Dr. Karim Abdelrahman', 'د. كريم عبد الرحمن'),
    specialty: t('Internal Medicine', 'الباطنة'),
    fee: 400,
    slotMinutes: 30,
  },
  {
    id: 'd2',
    clinicId: CLINIC,
    userId: 'u-salma',
    name: t('Dr. Salma El-Sayed', 'د. سلمى السيد'),
    specialty: t('Dermatology', 'الجلدية'),
    fee: 450,
    slotMinutes: 30,
  },
  {
    id: 'd3',
    clinicId: CLINIC,
    userId: 'u-hany',
    name: t('Dr. Hany Fouad', 'د. هاني فؤاد'),
    specialty: t('Pediatrics', 'الأطفال'),
    fee: 350,
    slotMinutes: 30,
  },
];

/** Saturday to Thursday; Friday off. */
const WORK_WEEK = [6, 0, 1, 2, 3, 4];

const schedules: DoctorSchedule[] = [
  { clinicId: CLINIC, doctorId: 'd1', weekdays: WORK_WEEK, firstSlot: '09:00', lastSlot: '14:30' },
  { clinicId: CLINIC, doctorId: 'd2', weekdays: WORK_WEEK, firstSlot: '10:00', lastSlot: '14:30' },
  { clinicId: CLINIC, doctorId: 'd3', weekdays: WORK_WEEK, firstSlot: '09:00', lastSlot: '13:30' },
];

const patient = (
  id: string,
  name: LocalizedText,
  phone: string,
  dateOfBirth: string,
  gender: 'F' | 'M',
  address: LocalizedText,
  alerts: LocalizedText = { value: '' },
): Patient => ({
  id,
  clinicId: CLINIC,
  name,
  phone,
  dateOfBirth,
  gender,
  address,
  allergiesAndAlerts: alerts,
  archived: false,
});

const patients: Patient[] = [
  // Mother and child sharing one phone number.
  patient(
    'p1',
    t('Mona Hassan', 'منى حسن'),
    '01012345678',
    '1986-03-12',
    'F',
    t('Nasr City, Cairo', 'مدينة نصر، القاهرة'),
  ),
  patient(
    'p2',
    t('Omar Ibrahim', 'عمر إبراهيم'),
    '01012345678',
    '2019-06-21',
    'M',
    t('Nasr City, Cairo', 'مدينة نصر، القاهرة'),
    t('Allergic to aspirin', 'حساسية من الأسبرين'),
  ),
  // Several past visits and a penicillin allergy.
  patient(
    'p3',
    t('Ahmed Samir', 'أحمد سمير'),
    '01023456789',
    '1971-11-02',
    'M',
    t('Heliopolis, Cairo', 'مصر الجديدة، القاهرة'),
    t('Penicillin allergy (urticaria, 2026)', 'حساسية من البنسلين (شرى، 2026)'),
  ),
  // Has a package: 8,000 EGP for 10 visits, 7 left.
  patient(
    'p4',
    t('Nourhan Adel', 'نورهان عادل'),
    '01034567890',
    '1995-08-30',
    'F',
    t('Maadi, Cairo', 'المعادي، القاهرة'),
  ),
  patient(
    'p5',
    t('Hossam Tarek', 'حسام طارق'),
    '01055667788',
    '1980-01-17',
    'M',
    t('Shubra, Cairo', 'شبرا، القاهرة'),
  ),
  patient(
    'p6',
    t('Farida Mostafa', 'فريدة مصطفى'),
    '01098765432',
    '1999-05-09',
    'F',
    t('Zamalek, Cairo', 'الزمالك، القاهرة'),
  ),
  patient(
    'p7',
    t('Mahmoud Gaber', 'محمود جابر'),
    '01077889900',
    '1964-09-25',
    'M',
    t('Dokki, Giza', 'الدقي، الجيزة'),
  ),
  patient(
    'p8',
    t('Salma Khaled', 'سلمى خالد'),
    '01011223344',
    '1991-12-04',
    'F',
    t('6th of October City', 'مدينة 6 أكتوبر'),
  ),
  patient(
    'p9',
    t('Karim Nabil', 'كريم نبيل'),
    '01066554433',
    '1988-04-14',
    'M',
    t('New Cairo', 'القاهرة الجديدة'),
  ),
  patient(
    'p10',
    t('Yara Waleed', 'يارا وليد'),
    '01044332211',
    '2021-02-08',
    'F',
    t('Giza', 'الجيزة'),
  ),
];

interface SeedAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  reason: LocalizedText;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  /** Patient replies to the 24h WhatsApp reminder. */
  replies?: ('confirm' | 'cancel')[];
}

const seedAppointments: SeedAppointment[] = [
  {
    id: 'a1',
    patientId: 'p3',
    doctorId: 'd1',
    date: TODAY,
    time: '09:00',
    reason: t('Hypertension follow-up', 'متابعة ضغط الدم'),
    status: 'completed',
    paymentStatus: 'paid',
    replies: ['confirm'],
  },
  {
    id: 'a2',
    patientId: 'p2',
    doctorId: 'd3',
    date: TODAY,
    time: '09:30',
    reason: t('Fever and cough', 'حرارة وكحة'),
    status: 'in_consultation',
    paymentStatus: 'paid',
    replies: ['confirm'],
  },
  {
    id: 'a3',
    patientId: 'p4',
    doctorId: 'd2',
    date: TODAY,
    time: '10:00',
    reason: t('Acne follow-up', 'متابعة حب الشباب'),
    status: 'confirmed',
    paymentStatus: 'package',
  },
  {
    id: 'a4',
    patientId: 'p5',
    doctorId: 'd1',
    date: TODAY,
    time: '10:30',
    reason: t('Chest tightness check', 'كشف ضيق في الصدر'),
    status: 'arrived',
    paymentStatus: 'unpaid',
    replies: ['confirm'],
  },
  {
    id: 'a5',
    patientId: 'p6',
    doctorId: 'd2',
    date: TODAY,
    time: '11:00',
    reason: t('Skin rash', 'طفح جلدي'),
    status: 'confirmed',
    paymentStatus: 'unpaid',
    replies: ['confirm'],
  },
  {
    id: 'a6',
    patientId: 'p7',
    doctorId: 'd1',
    date: TODAY,
    time: '11:30',
    reason: t('Diabetes review', 'مراجعة السكر'),
    status: 'needs_call',
    paymentStatus: 'unpaid',
  },
  {
    id: 'a7',
    patientId: 'p1',
    doctorId: 'd1',
    date: TODAY,
    time: '12:00',
    reason: t('Recurrent headaches', 'صداع متكرر'),
    status: 'scheduled',
    paymentStatus: 'unpaid',
  },
  {
    id: 'a8',
    patientId: 'p8',
    doctorId: 'd2',
    date: TODAY,
    time: '08:30',
    reason: t('Hair loss consultation', 'استشارة تساقط الشعر'),
    status: 'no_show',
    paymentStatus: 'unpaid',
  },
  {
    id: 'a9',
    patientId: 'p10',
    doctorId: 'd3',
    date: TODAY,
    time: '12:30',
    reason: t('Vaccination', 'تطعيم'),
    status: 'cancelled',
    paymentStatus: 'unpaid',
    replies: ['confirm', 'cancel'],
  },
  {
    id: 'a10',
    patientId: 'p9',
    doctorId: 'd1',
    date: TODAY,
    time: '10:00',
    reason: t('Lower back pain', 'ألم أسفل الظهر'),
    status: 'arrived',
    paymentStatus: 'paid',
  },
  {
    id: 'a11',
    patientId: 'p8',
    doctorId: 'd2',
    date: TOMORROW,
    time: '09:00',
    reason: t('Hair loss follow-up', 'متابعة تساقط الشعر'),
    status: 'needs_call',
    paymentStatus: 'unpaid',
  },
  {
    id: 'a12',
    patientId: 'p6',
    doctorId: 'd2',
    date: TOMORROW,
    time: '10:30',
    reason: t('Skin check', 'فحص جلدي'),
    status: 'scheduled',
    paymentStatus: 'unpaid',
  },
];

const at = (date: string, time: string) => `${date}T${time}`;
const dayBefore = (date: string) => (date === TODAY ? YESTERDAY : TODAY);

const appointments: Appointment[] = seedAppointments.map((a) => ({
  id: a.id,
  clinicId: CLINIC,
  patientId: a.patientId,
  doctorId: a.doctorId,
  date: a.date,
  time: a.time,
  durationMinutes: 30,
  reason: a.reason,
  source: 'phone',
  status: a.status,
  paymentStatus: a.paymentStatus,
  bookedAt: '2026-10-19T12:00',
  arrivedAt: ['arrived', 'in_consultation', 'completed'].includes(a.status)
    ? at(a.date, a.time)
    : null,
  consultationStartedAt: ['in_consultation', 'completed'].includes(a.status)
    ? at(a.date, a.time)
    : null,
  completedAt: a.status === 'completed' ? at(a.date, '09:25') : null,
  cancellation: a.status === 'cancelled' ? { source: 'patient_whatsapp', reason: '' } : null,
  rescheduledFromId: null,
}));

/** The 24-hour reminder for every seeded appointment, with the patient's replies. */
const reminderMessages: MessageLog[] = seedAppointments.map((a, i) => {
  const sendAt = at(dayBefore(a.date), a.time);
  const sent = sendAt <= at(TODAY, '10:15');
  return {
    id: `m${i + 1}`,
    clinicId: CLINIC,
    type: 'reminder',
    channel: 'whatsapp',
    appointmentId: a.id,
    prescriptionId: null,
    status: sent ? 'delivered' : 'queued',
    providerMessageId: sent ? `wamid.seed.${i + 1}` : null,
    scheduledFor: sendAt,
    sentAt: sent ? sendAt : null,
    deliveredAt: sent ? sendAt : null,
    replies: (a.replies ?? []).map((reply, j) => ({
      reply,
      at: at(dayBefore(a.date), `1${8 + j}:00`),
    })),
  };
});

const prescriptionMessage: MessageLog = {
  id: 'm-rx1',
  clinicId: CLINIC,
  type: 'prescription',
  channel: 'whatsapp',
  appointmentId: 'a1',
  prescriptionId: 'rx1',
  status: 'delivered',
  providerMessageId: 'wamid.seed.rx1',
  scheduledFor: null,
  sentAt: at(TODAY, '09:24'),
  deliveredAt: at(TODAY, '09:24'),
  replies: [],
};

const calls: CallLog[] = [
  {
    id: 'c1',
    clinicId: CLINIC,
    appointmentId: 'a3',
    outcome: 'confirmed',
    loggedBy: 'u-nour',
    loggedAt: at(TODAY, '09:05'),
  },
  {
    id: 'c2',
    clinicId: CLINIC,
    appointmentId: 'a10',
    outcome: 'confirmed',
    loggedBy: 'u-nour',
    loggedAt: at(TODAY, '09:10'),
  },
  {
    id: 'c3',
    clinicId: CLINIC,
    appointmentId: 'a6',
    outcome: 'no_answer',
    loggedBy: 'u-nour',
    loggedAt: at(TODAY, '09:40'),
  },
];

interface SeedVisit {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  appointmentId?: string;
  complaint: string;
  diagnosis: string;
  treatment: string;
  items: PrescriptionItem[];
}

const rx = (
  drug: string,
  dose: string,
  frequency: string,
  duration: string,
  instructions = '',
): PrescriptionItem => ({
  drug,
  dose,
  frequency,
  duration,
  instructions,
});

const seedVisits: SeedVisit[] = [
  {
    id: 'v1',
    patientId: 'p3',
    doctorId: 'd1',
    date: TODAY,
    appointmentId: 'a1',
    complaint: 'Follow-up for hypertension; occasional morning headaches.',
    diagnosis: 'Essential hypertension, partially controlled.',
    treatment: 'Increase amlodipine to 10 mg; low-salt diet; recheck in 4 weeks.',
    items: [rx('Amlodipine', '10 mg', 'Once daily', '30 days', 'Take in the morning')],
  },
  {
    id: 'v2',
    patientId: 'p3',
    doctorId: 'd1',
    date: '2026-09-26',
    complaint: 'Sore throat and fever for 3 days.',
    diagnosis: 'Acute tonsillitis.',
    treatment: 'Azithromycin 500 mg for 3 days (penicillin allergy noted); fluids and rest.',
    items: [rx('Azithromycin', '500 mg', 'Once daily', '3 days')],
  },
  {
    id: 'v3',
    patientId: 'p3',
    doctorId: 'd1',
    date: '2026-08-14',
    complaint: 'Routine BP check, fatigue.',
    diagnosis: 'Stage 1 hypertension.',
    treatment: 'Start amlodipine 5 mg; keep a home BP log.',
    items: [rx('Amlodipine', '5 mg', 'Once daily', '30 days')],
  },
  {
    id: 'v4',
    patientId: 'p3',
    doctorId: 'd1',
    date: '2026-06-02',
    complaint: 'Itchy rash after an antibiotic course.',
    diagnosis: 'Drug allergy to penicillin (urticaria).',
    treatment: 'Antihistamine for 5 days; allergy recorded on the patient file.',
    items: [],
  },
  {
    id: 'v5',
    patientId: 'p4',
    doctorId: 'd2',
    date: '2026-10-03',
    complaint: 'Persistent acne on cheeks and jawline.',
    diagnosis: 'Moderate acne vulgaris.',
    treatment: 'Topical retinoid at night, gentle cleanser, sunscreen.',
    items: [],
  },
  {
    id: 'v6',
    patientId: 'p2',
    doctorId: 'd3',
    date: '2026-09-15',
    complaint: 'Runny nose and mild cough.',
    diagnosis: 'Viral upper respiratory infection.',
    treatment: 'Saline drops, fluids, review if fever persists.',
    items: [],
  },
];

const auditLog: AuditLog[] = [
  {
    id: 'l4',
    clinicId: CLINIC,
    userId: 'u-karim',
    role: 'doctor',
    entity: 'visit_record',
    entityId: 'v3',
    action: 'visit_record.edited',
    params: { patient: t('Ahmed Samir', 'أحمد سمير'), date: '2026-08-14' },
    before: null,
    after: null,
    at: at(TODAY, '09:48'),
  },
  {
    id: 'l3',
    clinicId: CLINIC,
    userId: 'u-nour',
    role: 'receptionist',
    entity: 'patient',
    entityId: 'p1',
    action: 'patient.phone_edited',
    params: { patient: t('Mona Hassan', 'منى حسن') },
    before: null,
    after: null,
    at: at(TODAY, '09:12'),
  },
  {
    id: 'l2',
    clinicId: CLINIC,
    userId: 'u-karim',
    role: 'admin',
    entity: 'appointment',
    entityId: 'a0',
    action: 'payment.gate_overridden',
    params: {
      patient: t('Ahmed Samir', 'أحمد سمير'),
      reason: t('insurance letter pending', 'خطاب التأمين قيد الإنهاء'),
    },
    before: null,
    after: null,
    at: at(YESTERDAY, '17:30'),
  },
  {
    id: 'l1',
    clinicId: CLINIC,
    userId: 'u-nour',
    role: 'receptionist',
    entity: 'package',
    entityId: 'k1',
    action: 'package.created',
    params: { patient: t('Nourhan Adel', 'نورهان عادل'), price: 8000, visits: 10 },
    before: null,
    after: null,
    at: at(YESTERDAY, '16:05'),
  },
];

export function createSeed(): ClinicSnapshot {
  return structuredClone({
    clinic: {
      id: CLINIC,
      name: t('Nile Care Clinic', 'عيادة نايل كير'),
      address: t(
        '12 Mostafa El-Nahas St., Nasr City, Cairo',
        '12 شارع مصطفى النحاس، مدينة نصر، القاهرة',
      ),
      phone: '02 2xxx xxxx',
      logoUrl: null,
      settings: {
        reminderLeadHours: 24,
        callListCutoffHours: 3,
        secondReminderEnabled: false,
        defaultLanguage: 'en',
      },
    },
    users: [
      {
        id: 'u-nour',
        clinicId: CLINIC,
        name: t('Nour Ashraf', 'نور أشرف'),
        shortName: t('Nour', 'نور'),
        email: 'nour@nilecare.example',
        roles: ['receptionist'],
        gender: 'F',
        active: true,
      },
      {
        id: 'u-mariam',
        clinicId: CLINIC,
        name: t('Mariam Fathy', 'مريم فتحي'),
        shortName: t('Mariam', 'مريم'),
        email: 'mariam@nilecare.example',
        roles: ['receptionist'],
        gender: 'F',
        active: true,
      },
      {
        id: 'u-karim',
        clinicId: CLINIC,
        name: t('Dr. Karim Abdelrahman', 'د. كريم عبد الرحمن'),
        shortName: t('Dr. Karim', 'د. كريم'),
        email: 'karim@nilecare.example',
        roles: ['admin', 'doctor'],
        gender: 'M',
        active: true,
      },
      {
        id: 'u-salma',
        clinicId: CLINIC,
        name: t('Dr. Salma El-Sayed', 'د. سلمى السيد'),
        shortName: t('Dr. Salma', 'د. سلمى'),
        email: 'salma@nilecare.example',
        roles: ['doctor'],
        gender: 'F',
        active: true,
      },
      {
        id: 'u-hany',
        clinicId: CLINIC,
        name: t('Dr. Hany Fouad', 'د. هاني فؤاد'),
        shortName: t('Dr. Hany', 'د. هاني'),
        email: 'hany@nilecare.example',
        roles: ['doctor'],
        gender: 'M',
        active: true,
      },
    ],
    doctors,
    schedules,
    scheduleExceptions: [
      {
        id: 'b1',
        clinicId: CLINIC,
        doctorId: 'd3',
        date: '2026-10-26',
        from: null,
        to: null,
        reason: t('Conference leave', 'إجازة مؤتمر'),
      },
    ],
    patients,
    appointments,
    appointmentEvents: [],
    visitRecords: seedVisits.map((v) => ({
      id: v.id,
      clinicId: CLINIC,
      appointmentId: v.appointmentId ?? null,
      patientId: v.patientId,
      doctorId: v.doctorId,
      date: v.date,
      complaint: v.complaint,
      diagnosis: v.diagnosis,
      treatment: v.treatment,
      finalizedAt: `${v.date}T12:00`,
    })),
    visitRecordRevisions: [
      {
        clinicId: CLINIC,
        visitRecordId: 'v2',
        editedBy: 'u-karim',
        editedAt: '2026-09-27T11:20',
        complaint: 'Sore throat and fever.',
        diagnosis: 'Acute tonsillitis.',
        treatment: 'Fluids and rest.',
      },
    ],
    prescriptions: seedVisits
      .filter((v) => v.items.length > 0)
      .map((v) => ({
        id: `rx${v.id.slice(1)}`,
        clinicId: CLINIC,
        visitRecordId: v.id,
        items: v.items,
        pdfUrl: `Prescription_${patients.find((p) => p.id === v.patientId)!.name.value.replace(/\s/g, '_')}.pdf`,
        finalizedAt: `${v.date}T12:00`,
      })),
    payments: [
      {
        id: 'y1',
        clinicId: CLINIC,
        appointmentId: 'a1',
        packageId: null,
        patientId: 'p3',
        amount: 400,
        method: 'cash',
        recordedBy: 'u-nour',
        recordedAt: at(TODAY, '08:55'),
        voided: false,
      },
      {
        id: 'y2',
        clinicId: CLINIC,
        appointmentId: 'a2',
        packageId: null,
        patientId: 'p2',
        amount: 350,
        method: 'card',
        recordedBy: 'u-nour',
        recordedAt: at(TODAY, '09:25'),
        voided: false,
      },
      {
        id: 'y3',
        clinicId: CLINIC,
        appointmentId: 'a10',
        packageId: null,
        patientId: 'p9',
        amount: 400,
        method: 'transfer',
        recordedBy: 'u-nour',
        recordedAt: at(TODAY, '09:55'),
        voided: false,
      },
      {
        id: 'y0',
        clinicId: CLINIC,
        appointmentId: null,
        packageId: 'k1',
        patientId: 'p4',
        amount: 8000,
        method: 'cash',
        recordedBy: 'u-nour',
        recordedAt: at(YESTERDAY, '16:05'),
        voided: false,
      },
    ],
    packages: [
      {
        id: 'k1',
        clinicId: CLINIC,
        patientId: 'p4',
        totalPrice: 8000,
        totalVisits: 10,
        visitsUsed: 3,
        expiryDate: '2027-03-31',
        notes: '',
      },
    ],
    packageUsages: [],
    messages: [...reminderMessages, prescriptionMessage],
    calls,
    auditLog,
  } satisfies ClinicSnapshot);
}
