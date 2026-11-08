// Single source of truth for the promo's timing, clips and Arabic copy.
// `node build.mjs` turns this into index.html, compositions/*.html and ../STORYBOARD.md.
//
// Times are seconds. `in` is the offset into the sped-up clip in assets/clips/
// (see speedup.py); `dur` is how long the part is on screen. Each part (and each
// scene) is held XFADE seconds longer so the next one can fade in over it.
// Zoom: focus point as a fraction of the clip frame, `at` is seconds into the
// part, `scale` the punch-in, `release` (optional) when it eases back out.
// `rate` slows a part down (data-playback-rate; 0.5 = half speed, consuming dur × rate of the clip).
// `join: true` continues the previous part's footage with a hard cut instead of a cross-fade.
// `holdFrom` (seconds into the part) holds the clip's last frame from there on (still in assets/stills/).

export const XFADE = 0.3;

export const CAPTIONS = {
  hook: "لسه بتدير عيادتك بالورق والواتساب؟",
  dashboard: "يوم عيادتك كله قدامك في شاشة واحدة",
  booking: "مريض جديد؟ تسجّله وتحجزله في أقل من دقيقة",
  dayBefore: "قبل الميعاد بيوم",
  reminder: "التذكير بيتبعت لوحده على واتساب، والمريض بيأكّد بضغطة",
  noReply: "ولو ما ردّش؟",
  callList: "كلّمه من قايمة المكالمات وأكّد الميعاد بضغطة",
  cancelFlash: "لو لغى على واتساب، الميعاد بيتفضّى لوحده",
  visitDay: "يوم الكشف",
  payment: ["الدفع قبل ما المريض يدخل للدكتور", "كشف واحد أو باقة، والسيستم بيحسبلك الزيارات"],
  doctor: "الدكتور شايف يومه، والمريض وحساسيته قدامه على طول",
  visitText: "اكتب الشكوى والتشخيص والعلاج في 3 خانات بس",
  prescription: "والروشتة بتوصل للمريض على واتساب لوحدها",
  privacy: "الملاحظات الطبية بتظهر للدكتور بس",
  returnVisit: "لو المريض زار العيادة تاني",
  history: "كل زيارة بتتسجل، والتاريخ المرضي جاهز قبل ما المريض يدخل",
  devices: "بيشتغل على الكمبيوتر والموبايل",
  arabic: "وبضغطة واحدة يبقى كله بالعربي",
  tagline: "نظام بسيط لإدارة العيادات",
  demo: "بندوّر على عيادات تجرّب معانا",
  contactLead: "مهتم؟ كلّمنا على واتساب:",
  contactNumber: "01094176420",
};

export const LABELS = { booking: "الحجز", doctor: "الدكتور" };

// Text inside the messaging-app graphics.
export const CHAT = {
  clinicName: "عيادة نايل كير", // the app's own Arabic clinic name (seen in S10c)
  bookRequest: "السلام عليكم، عايز أحجز كشف بكرة",
  reminder: "تذكير: عندك ميعاد بكرة الساعة 11:00 مع د. كريم عادل",
  confirm: "تأكيد",
  cancel: "إلغاء",
  prescriptionFile: "روشتة - أحمد سمير",
};

export const SCENES = [
  { id: "hook", n: 1, kind: "hook", dur: 3.0 },
  {
    id: "dashboard", n: 2, kind: "app",
    parts: [{ kind: "clip", clip: "S02-dashboard", in: 0.0, dur: 4.0 }],
    captions: [{ text: CAPTIONS.dashboard, from: 0, to: 0 }],
  },
  {
    id: "booking", n: 3, kind: "app", label: LABELS.booking,
    parts: [
      { kind: "chat", chat: "book", dur: 2.2, noLabel: true },
      { kind: "clip", clip: "S03a-register", in: 1.3, dur: 5.0,
        zoom: { x: 0.3, y: 0.79, scale: 1.3, at: 2.8, release: 4.2 } },
      { kind: "clip", clip: "S03b-book", in: 1.6, dur: 5.1 }, // runs into the roster result (from ~4.35 s)
      { kind: "clip", clip: "S03c-roster-scheduled", in: 0.0, dur: 2.7 }, // roster result ≈ 3.4 s in total
    ],
    captions: [{ text: CAPTIONS.booking, from: 1, to: 3 }],
  },
  {
    id: "reminder", n: 4, kind: "app",
    parts: [
      { kind: "title", text: CAPTIONS.dayBefore, dur: 2.3, sfx: true }, // fully visible 2 s after the 0.3 s fade-in
      { kind: "chat", chat: "remind", dur: 3.6 },
      { kind: "clip", clip: "S04-reminder-confirmed", in: 1.9, dur: 5.45, holdFrom: 4.0 }, // Confirmed roster from ~3.05 s, fully visible ≥ 2 s
    ],
    captions: [{ text: CAPTIONS.reminder, from: 1, to: 2 }],
  },
  {
    id: "noreply", n: 5, kind: "app",
    parts: [
      { kind: "title", text: CAPTIONS.noReply, dur: 2.3, sfx: true },
      { kind: "clip", clip: "S05a-needs-call", in: 0.9, dur: 2.6 },
      { kind: "clip", clip: "S05b-call-list", in: 1.0, dur: 2.7 },
      // Same footage continuing at half speed so the flash line can be read.
      { kind: "clip", clip: "S05b-call-list", in: 3.7, dur: 4.1, rate: 0.5, join: true },
    ],
    captions: [
      { text: CAPTIONS.callList, from: 1, to: 2 },
      { text: CAPTIONS.cancelFlash, from: 3, to: 3, style: "flash" },
    ],
  },
  {
    id: "visitday", n: 6, kind: "app",
    parts: [
      { kind: "title", text: CAPTIONS.visitDay, dur: 2.3, sfx: true },
      { kind: "clip", clip: "S06a-arrival-gate", in: 1.6, dur: 4.0,
        zoom: { x: 0.31, y: 0.86, scale: 1.3, at: 1.8 } },
      { kind: "clip", clip: "S06b-payment", in: 1.4, dur: 5.6, holdFrom: 4.5 }, // Paid from ~3.6 s, held ≥ 2 s
      { kind: "clip", clip: "S06c-packages", in: 1.3, dur: 2.4 },
    ],
    captions: [{ text: CAPTIONS.payment, from: 1, to: 3 }],
  },
  {
    id: "doctor", n: 7, kind: "app", label: LABELS.doctor,
    parts: [
      { kind: "clip", clip: "S07a-doctor-dashboard", in: 0.0, dur: 2.4 },
      { kind: "clip", clip: "S07b-calendar-appointment", in: 1.5, dur: 4.2,
        zoom: { x: 0.43, y: 0.59, scale: 1.3, at: 2.7 } },
    ],
    captions: [{ text: CAPTIONS.doctor, from: 0, to: 1 }],
  },
  {
    id: "consult", n: 8, kind: "app", label: LABELS.doctor,
    parts: [
      { kind: "clip", clip: "S08a-visit-text", in: 2.0, dur: 4.7 },
      { kind: "clip", clip: "S08b-prescription", in: 2.5, dur: 3.0 },
      { kind: "clip", clip: "S08c-prescription-sent", in: 0.9, dur: 3.0 },
      { kind: "chat", chat: "rx", dur: 2.2, noLabel: true },
      { kind: "clip", clip: "S08d-complete", in: 0.6, dur: 2.0 },
    ],
    captions: [
      { text: CAPTIONS.visitText, from: 0, to: 0 },
      { text: CAPTIONS.prescription, from: 1, to: 3 },
    ],
  },
  {
    id: "history", n: 9, kind: "app", label: LABELS.doctor,
    parts: [
      { kind: "clip", clip: "S09a-history-saved", in: 0.0, dur: 2.0 },
      { kind: "clip", clip: "S06d-lock-receptionist", in: 2.3, dur: 3.9, rate: 0.5, holdFrom: 3.25, noLabel: true },
      { kind: "title", text: CAPTIONS.returnVisit, dur: 2.8, sfx: true }, // fully visible 2.5 s
      { kind: "clip", clip: "S09b-return-history", in: 1.4, dur: 5.3, holdFrom: 4.5,
        zoom: { x: 0.8, y: 0.62, scale: 1.25, at: 0.6 } },
    ],
    captions: [
      { text: CAPTIONS.privacy, from: 1, to: 1, style: "small" },
      { text: CAPTIONS.history, from: 3, to: 3 },
    ],
  },
  {
    id: "devices", n: 10, kind: "devices", dur: 5.2,
    still: "assets/stills/S10c-start.png",
    phone: [
      { clip: "S10a-phone-roster", in: 0.0, dur: 2.2 },
      { clip: "S10b-phone-booking", in: 2.0, dur: 3.0 },
    ],
    captions: [{ text: CAPTIONS.devices, from: 0, to: 0 }],
  },
  {
    id: "arabic", n: 11, kind: "arabic", dur: 4.0,
    desktop: { clip: "S10c-arabic-switch", in: 2.1 },
    phone: { clip: "S10d-arabic-phone", in: 0.0, start: 0.3 },
    captions: [{ text: CAPTIONS.arabic, from: 0, to: 0 }],
  },
  { id: "end", n: 12, kind: "end", dur: 7.2 }, // number fully visible ~6.1 s
];

// Music and sound (Brag's bundled audio, copied into assets/audio/).
export const AUDIO = {
  music: {
    file: "assets/audio/music.m4a",
    source: "happy-beats-business-moves-vol-12-by-ende-dot-app.mp3",
    credit: "Music: Sascha Ende, ende.app (CC BY 4.0)",
    volume: 1, // the file itself is pre-normalised; see build.mjs
    fadeIn: 1.2,
    fadeOut: 3.0,
  },
  titleSfx: ["assets/audio/sfx-soft-1.ogg", "assets/audio/sfx-soft-2.ogg"],
  titleSfxDur: [0.19, 0.15],
  sfxVolume: 0.55,
};
