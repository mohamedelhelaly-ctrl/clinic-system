/** Stroke icon paths (24×24), unchanged from the prototype. */
export const ICONS = {
  cross: 'M9 4h6v5h5v6h-5v5H9v-5H4V9h5z',
  plus: 'M12 5v14M5 12h14',
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  card: 'M3 6h18v12H3zM3 10h18M7 15h3',
  users:
    'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7M21 19v-1a4 4 0 00-3-3.9M16 3.1a3.5 3.5 0 010 6.8',
  gear: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4',
  clip: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12h6M9 16h6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  back: 'M19 12H5M12 5l-7 7 7 7',
  alert: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 118 0v3',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6L6 18',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  walk: 'M13 4a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM9 21l2-6-2-2 1-5 3 3 3 1M13 13l2 3v5',
  out: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',
  rx: 'M7 4h6a4 4 0 010 8H7zM7 4v16M11 12l7 8M18 12l-7 8',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4',
  wa: 'M4 20l1.3-4A8 8 0 114 20zM9 9c0 3 3 6 6 6l1.5-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z',
  bell: 'M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 21h4',
  reset: 'M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0011.9 2.5M18.5 9A7 7 0 006.6 6.5',
} as const;

export type IconName = keyof typeof ICONS;
