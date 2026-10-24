import type { Page, TestInfo } from '@playwright/test';
import { test as base } from '@playwright/test';
import path from 'node:path';

type Role = 'receptionist' | 'doctor' | 'admin';

export interface Director {
  page: Page;
  isPhone: boolean;
  /** Opens the app signed in as `role`, on fresh seed data. */
  open(role: Role, lang?: 'en' | 'ar'): Promise<void>;
  /** Holds the frame so the viewer can read it. */
  beat(ms?: number): Promise<void>;
  tap(selector: string, text?: string): Promise<void>;
  /** Types visibly, a character at a time. */
  type(selector: string, text: string): Promise<void>;
  /** Sidebar on desktop, tab bar or "More" on phone. */
  goTo(label: string): Promise<void>;
  newAppointment(): Promise<void>;
  /** Moves the pointer to the element and scrolls it into view without clicking. */
  show(selector: string, text?: string): Promise<void>;
}

/** `director` fixture: paced actions plus a readable video file name per take. */
export const test = base.extend<{ director: Director }>({
  director: async ({ page }, use, testInfo) => {
    const isPhone = testInfo.project.name === 'phone';
    const locate = (selector: string, text?: string) =>
      (text ? page.locator(selector, { hasText: text }) : page.locator(selector)).first();
    const director: Director = {
      page,
      isPhone,
      async open(role, lang = 'en') {
        await page.goto(`/?role=${role}&lang=${lang}&reset=1`);
        await page.locator('.app .main').waitFor();
        await page.evaluate(() => document.fonts.ready);
        await director.beat(1200);
      },
      beat: (ms = 900) => page.waitForTimeout(ms),
      async tap(selector, text) {
        const el = locate(selector, text);
        await el.scrollIntoViewIfNeeded();
        await el.hover().catch(() => undefined);
        await page.waitForTimeout(250);
        await el.click();
        await page.waitForTimeout(500);
      },
      async type(selector, text) {
        const el = locate(selector);
        await el.scrollIntoViewIfNeeded();
        await el.click();
        await el.pressSequentially(text, { delay: 45 });
        await page.waitForTimeout(300);
      },
      async goTo(label) {
        if (!isPhone) return director.tap('.side .nav', label);
        const tab = page.locator('.tabbar .tb', { hasText: label });
        if (await tab.count()) return director.tap('.tabbar .tb', label);
        await director.tap('.tabbar .tb', 'More');
        await director.tap('.sheet .nav', label);
      },
      newAppointment: () => (isPhone ? director.tap('.fab') : director.tap('.btn.p.lg.hide-m')),
      async show(selector, text) {
        const el = locate(selector, text);
        await el.scrollIntoViewIfNeeded();
        await el.hover().catch(() => undefined);
        await page.waitForTimeout(900);
      },
    };
    await use(director);
    await saveVideo(page, testInfo);
  },
});

async function saveVideo(page: Page, testInfo: TestInfo) {
  const video = page.video();
  if (!video) return;
  await page.close();
  const name = testInfo.title
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const actor = path.basename(testInfo.file, '.spec.ts');
  await video.saveAs(
    path.join(
      testInfo.config.rootDir,
      '..',
      'output',
      'videos',
      testInfo.project.name,
      `${actor}--${name}.webm`,
    ),
  );
}

export { expect } from '@playwright/test';
