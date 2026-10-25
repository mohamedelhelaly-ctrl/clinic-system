import type { App } from './helpers';
import { expect, test } from './helpers';

/*
 * L1 and L2 on every screen: each screen is opened in English, checked for
 * layout, then switched to Arabic in place and checked for mirroring,
 * untranslated interface text and clipping.
 */

/** Minimum size of a tap target on phones (Apple HIG / WCAG 2.5.5). Fixed before measuring. */
const TAP_MIN = 44;
const TEXT_MIN = 12;

type Screen = { name: string; go: (app: App) => Promise<void> };

const SCREENS: Screen[] = [
  { name: 'home', go: async (app) => app.goTo('Today') },
  {
    name: 'appointment',
    go: async (app) => {
      await app.goTo('Today');
      await app.openRow('Hossam Tarek');
    },
  },
  {
    name: 'booking-patient',
    go: async (app) => {
      await app.goTo('Today');
      await app.newAppointment();
      await app.button('Register new patient').click();
    },
  },
  {
    name: 'booking-time',
    go: async (app) => {
      await app.goTo('Today');
      await app.newAppointment();
      await app.page.locator('button.doc', { hasText: 'Mona Hassan' }).click();
      await app.pickDoctor('Dr. Karim Adel');
    },
  },
  {
    name: 'booking-details',
    go: async (app) => {
      await app.goTo('Today');
      await app.newAppointment();
      await app.page.locator('button.doc', { hasText: 'Mona Hassan' }).click();
      await app.pickDoctor('Dr. Karim Adel');
      await app.pickSlot('Sun 25 Oct', '11:00');
    },
  },
  { name: 'calendar-day', go: async (app) => app.goTo('Calendar') },
  {
    name: 'calendar-week',
    go: async (app) => {
      await app.goTo('Calendar');
      await app.page.locator('.chip', { hasText: 'Week' }).click();
    },
  },
  { name: 'call-list', go: async (app) => app.goTo('Call list') },
  { name: 'payments', go: async (app) => app.goTo('Payments') },
  {
    name: 'packages',
    go: async (app) => {
      await app.goTo('Payments');
      await app.page.locator('.chip', { hasText: 'Packages' }).click();
    },
  },
  { name: 'patients', go: async (app) => app.goTo('Patients') },
  {
    name: 'patient-file',
    go: async (app) => {
      await app.goTo('Patients');
      await app.page.locator('button.doc', { hasText: 'Sherif Mansour' }).click();
    },
  },
  ...(['Doctors', 'Clinic profile', 'Reminders', 'Users'] as const).map((tab) => ({
    name: `settings-${tab.toLowerCase().replace(' ', '-')}`,
    go: async (app: App) => {
      await app.goTo('Settings');
      await app.page.locator('.tabs .chip', { hasText: tab }).click();
    },
  })),
  { name: 'audit-log', go: async (app) => app.goTo('Audit log') },
  {
    name: 'visit-record',
    go: async (app) => {
      await app.goTo('Today');
      await app.openRow('Karim Nabil');
      const start = app.page.locator('.btn.p', { hasText: 'Start consultation' });
      if (await start.count()) await start.click();
      await app.button('Open visit record').click();
    },
  },
  {
    name: 'prescription',
    go: async (app) => {
      await app.goTo('Today');
      await app.openRow('Karim Nabil');
      const start = app.page.locator('.btn.p', { hasText: 'Start consultation' });
      if (await start.count()) await start.click();
      await app.button('Open visit record').click();
      await app.button(/Add prescription|Prescription \(/).click();
      if (!(await app.page.locator('.rxr').count())) {
        await app.button('Add medication').click();
        await app.page.locator('.rxr input').first().fill('Paracetamol');
        await app.button('Finalize and send via WhatsApp').click();
      }
    },
  },
];

/** Layout problems on the current page, measured in the browser. */
async function layoutProblems(app: App) {
  return app.page.evaluate(
    ({ isPhone, TAP_MIN, TEXT_MIN }) => {
      const out: string[] = [];
      const W = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > W)
        out.push(`page scrolls horizontally (${document.documentElement.scrollWidth}px > ${W}px)`);
      const label = (el: Element) =>
        `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(el.textContent ?? '').trim().slice(0, 30)}"`;
      const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
      };
      const inScroller = (el: Element) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const o = getComputedStyle(p).overflowX;
          if (o === 'auto' || o === 'scroll') return true;
        }
        return false;
      };
      for (const el of document.querySelectorAll('.app *')) {
        if (!visible(el) || el.closest('svg')) continue;
        const r = el.getBoundingClientRect();
        if ((r.right > W + 1 || r.left < -1) && !inScroller(el))
          out.push(`outside viewport: ${label(el)}`);
        const s = getComputedStyle(el);
        const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());
        if (ownText && parseFloat(s.fontSize) < TEXT_MIN)
          out.push(`text ${s.fontSize}: ${label(el)}`);
        if (
          ownText &&
          (s.overflowX === 'hidden' || s.overflowX === 'clip' || s.textOverflow === 'ellipsis') &&
          el.scrollWidth > el.clientWidth + 1
        ) {
          out.push(`clipped text: ${label(el)}`);
        }
      }
      if (isPhone) {
        for (const el of document.querySelectorAll(
          '.app button, .app a, .app input, .app select, .app textarea',
        )) {
          if (!visible(el)) continue;
          const r = el.getBoundingClientRect();
          if (r.height < TAP_MIN - 0.5)
            out.push(`tap target ${Math.round(r.height)}px tall: ${label(el)}`);
        }
      }
      return out;
    },
    { isPhone: app.isPhone, TAP_MIN, TEXT_MIN },
  );
}

/** Interface text that is still in English while the UI is Arabic. */
async function untranslated(app: App) {
  return app.page.evaluate(() => {
    const chrome =
      'h1, h2, .btn, .chip, .nav, .tb, .th span, .lbl, .mini, .badge, option, .demo-foot span, .toast';
    const allowed = [/\bEnglish\b/g, /\S+@\S+/g, /\S+\.pdf\b/g, /\bx{2,}\b/g];
    const out = new Set<string>();
    for (const el of document.querySelectorAll(chrome)) {
      if (!(el as HTMLElement).offsetParent && el.tagName !== 'OPTION') continue;
      // Only the element's own interface text, not nested record data.
      let text = [...el.childNodes]
        .filter(
          (n) =>
            n.nodeType === 3 || (n as Element).tagName === 'SPAN' || (n as Element).tagName === 'B',
        )
        .map((n) => n.textContent)
        .join(' ');
      for (const a of allowed) text = text.replace(a, '');
      if (/[A-Za-z]{2,}/.test(text)) out.add(text.trim().slice(0, 60));
    }
    return [...out];
  });
}

/** RTL mirroring of navigation, tables, forms, calendar and directional icons. */
async function mirroringProblems(app: App, screen: string) {
  return app.page.evaluate(
    ({ isPhone, screen }) => {
      const out: string[] = [];
      const rect = (sel: string) => document.querySelector(sel)?.getBoundingClientRect();
      if (document.querySelector('.app')?.getAttribute('dir') !== 'rtl')
        out.push('app is not dir=rtl');
      if (document.documentElement.lang !== 'ar') out.push('html lang is not ar');
      if (isPhone) {
        const tabs = [...document.querySelectorAll('.tabbar .tb')].map(
          (t) => t.getBoundingClientRect().x,
        );
        if (!(tabs[0]! > tabs.at(-1)!)) out.push('tab bar not mirrored');
      } else {
        const side = rect('.side');
        if (!side || side.left < window.innerWidth / 2) out.push('sidebar not on the right');
        const th = [...document.querySelectorAll('.th span')].map(
          (s) => s.getBoundingClientRect().x,
        );
        if (th.length && !(th[0]! > th.at(-1)!)) out.push('table header not mirrored');
      }
      const h = rect('.cal .h');
      const c = rect('.cal .c');
      if (h && c && !(h.x > c.x)) out.push('calendar time column not on the right');
      for (const lbl of document.querySelectorAll('.lbl')) {
        if (getComputedStyle(lbl).direction !== 'rtl') out.push('form label not rtl');
      }
      // Directional icons (Back, Sign out) must point the other way in RTL.
      for (const btn of document.querySelectorAll('.btn')) {
        const d = btn.querySelector('svg path')?.getAttribute('d') ?? '';
        const directional = d.startsWith('M19 12H5') || d.startsWith('M10 4H5v16h5');
        if (!directional || !(btn as HTMLElement).offsetParent) continue;
        const t = getComputedStyle(btn.querySelector('svg')!).transform;
        if (t === 'none' || !t.startsWith('matrix(-1'))
          out.push(`icon not mirrored: "${btn.textContent!.trim()}" on ${screen}`);
      }
      return out;
    },
    { isPhone: app.isPhone, screen },
  );
}

for (const screen of SCREENS) {
  test(`L1+L2 ${screen.name}: layout at this size, then Arabic RTL`, async ({ app }) => {
    const { page } = app;
    await app.open('admin');
    await screen.go(app);
    await page.waitForTimeout(150);

    // L2 — English at this viewport.
    await expect(page.locator(app.isPhone ? '.tabbar' : '.side')).toBeVisible();
    await expect(page.locator(app.isPhone ? '.side' : '.tabbar')).toBeHidden();
    expect.soft(await layoutProblems(app), 'L2 English layout').toEqual([]);

    // L1 — the one language button switches everything to Arabic, right to left.
    await expect(page.locator('.toast')).toHaveCount(0, { timeout: 4000 });
    await page.locator('header .btn.lang').click();
    await page.waitForTimeout(150);
    expect.soft(await mirroringProblems(app, screen.name), 'L1 mirroring').toEqual([]);
    expect.soft(await untranslated(app), 'L1 untranslated interface text').toEqual([]);
    expect.soft(await layoutProblems(app), 'L1/L2 Arabic layout').toEqual([]);
  });
}
