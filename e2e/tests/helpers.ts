import type { Locator, Page } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import path from 'node:path';

export type Role = 'receptionist' | 'doctor' | 'admin';

/** "Sat 24 Oct", as the app formats a day label in English. */
export function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export class App {
  constructor(
    readonly page: Page,
    readonly isPhone: boolean,
    readonly viewport: string,
  ) {}

  async open(
    role: Role,
    { lang = 'en', reset = true }: { lang?: 'en' | 'ar'; reset?: boolean } = {},
  ) {
    await this.page.goto(`/?role=${role}&lang=${lang}${reset ? '&reset=1' : ''}`);
    await this.page.locator('.app .main').waitFor();
  }

  /** Current demo clock, `YYYY-MM-DDTHH:mm`. */
  async now(): Promise<string> {
    return this.page.evaluate(
      () => window.localStorage.getItem('clinic-demo:clock') ?? '2026-10-24T10:15',
    );
  }
  async today(): Promise<string> {
    return (await this.now()).slice(0, 10);
  }

  /** Sidebar on desktop; tab bar or "More" on phone. */
  async goTo(label: string) {
    const p = this.page;
    if (!this.isPhone) return p.locator('.side .nav', { hasText: label }).click();
    const tab = p.locator('.tabbar .tb', { hasText: label });
    if (await tab.count()) return tab.click();
    await p.locator('.tabbar .tb', { hasText: 'More' }).click();
    await p.locator('.sheet .nav', { hasText: label }).click();
  }

  /** Every navigation destination the signed-in role has. */
  async navLabels(): Promise<string[]> {
    const p = this.page;
    if (!this.isPhone) return (await p.locator('.side .nav').allInnerTexts()).map((s) => s.trim());
    const tabs = (await p.locator('.tabbar .tb').allInnerTexts()).map((s) => s.trim());
    await p.locator('.tabbar .tb', { hasText: 'More' }).click();
    const more = (await p.locator('.sheet .nav').allInnerTexts()).map((s) => s.trim());
    await p.locator('.sheet [aria-label=Close]').click();
    return [...tabs.filter((t) => t !== 'More'), ...more.filter((t) => t !== 'Sign out')];
  }

  async newAppointment() {
    if (this.isPhone && (await this.page.locator('.fab').count())) {
      return this.page.locator('.fab').click();
    }
    await this.page.locator('.btn.p.lg.hide-m', { hasText: 'New appointment' }).click();
  }

  row(name: string): Locator {
    return this.page.locator('button.tr', { hasText: name });
  }
  async openRow(name: string) {
    await this.row(name).first().click();
    await expect(this.page.locator('h1', { hasText: name })).toBeVisible();
  }
  async rosterDay(label: string) {
    await this.page.locator('.card .tabs .chip', { hasText: label }).click();
  }

  button(text: string | RegExp): Locator {
    return this.page.locator('.btn', { hasText: text }).first();
  }

  async switchRole(role: Role) {
    await this.page.locator('header label.demo select').selectOption(role);
  }

  // ---- booking --------------------------------------------------------------

  async pickDoctor(name: string) {
    await this.page.locator('button.doc', { hasText: name }).click();
  }
  /** Picks a day chip and a slot; phone uses the bottom-sheet picker. */
  async pickSlot(day: string, time: string) {
    const p = this.page;
    if (this.isPhone) {
      await p.locator('.hide-d .btn.lg.full').click();
      await p.locator('.sheet .tabs .chip', { hasText: day }).click();
      await p.locator('.sheet .slot', { hasText: time }).click();
    } else {
      await p.locator('.card .tabs .chip', { hasText: day }).click();
      await p.locator('.slots .slot', { hasText: time }).click();
    }
  }
  async slot(day: string, time: string): Promise<Locator> {
    const p = this.page;
    if (this.isPhone) {
      await p.locator('.hide-d .btn.lg.full').click();
      await p.locator('.sheet .tabs .chip', { hasText: day }).click();
      return p.locator('.sheet .slot', { hasText: time });
    }
    await p.locator('.card .tabs .chip', { hasText: day }).click();
    return p.locator('.slots .slot', { hasText: time });
  }
  /** Picks the first free slot on `day`; returns its time. */
  async pickFirstFreeSlot(day: string): Promise<string> {
    const p = this.page;
    const scope = this.isPhone ? p.locator('.sheet') : p.locator('.card');
    if (this.isPhone) await p.locator('.hide-d .btn.lg.full').click();
    await scope.locator('.tabs .chip', { hasText: day }).click();
    const slot = scope
      .locator(this.isPhone ? '.slot:not([disabled])' : '.slots .slot:not([disabled])')
      .first();
    const time = (await slot.innerText()).trim();
    await slot.click();
    return time;
  }
  async saveAppointment(reason?: string) {
    if (reason) await this.page.getByPlaceholder('e.g. Follow-up, new complaint').fill(reason);
    await this.button('Save appointment').click();
    await expect(this.page.locator('.toast')).toHaveText('Appointment booked');
  }

  /** Registers a patient from booking step 1. */
  async registerPatient(p: {
    name: string;
    phone: string;
    dob?: string;
    gender?: 'F' | 'M';
    address?: string;
    alerts?: string;
  }) {
    const page = this.page;
    await page.locator('input[type=search]').fill(p.name);
    await this.button('Register new patient').click();
    const form = page.locator('.card', {
      has: page.locator('h2', { hasText: 'Register new patient' }),
    });
    await form.getByLabel('Full name').fill(p.name);
    await form.locator('input[inputmode=tel]').fill(p.phone);
    if (p.dob) await form.locator('input[type=date]').fill(p.dob);
    if (p.gender) await form.locator('select').selectOption(p.gender);
    if (p.address)
      await form.locator('label', { hasText: 'Address' }).locator('input').fill(p.address);
    if (p.alerts)
      await form
        .locator('label', { hasText: 'Allergies & alerts' })
        .locator('input')
        .fill(p.alerts);
    return form;
  }

  // ---- demo controls ---------------------------------------------------------

  panel(): Locator {
    return this.page.getByTestId('demo-appointment-panel');
  }
  async demoClick(testId: string) {
    const before = await this.now();
    await this.page.getByTestId(testId).click();
    // Clock jumps move time forward; wait for the store to reflect it.
    if (
      testId.startsWith('demo-jump') ||
      testId.startsWith('demo-plus') ||
      testId === 'demo-no-reply'
    ) {
      await expect.poll(() => this.now()).not.toBe(before);
    }
  }

  // ---- payment ----------------------------------------------------------------

  async recordPayment(amount: string, method: 'Cash' | 'Card' | 'Transfer') {
    const p = this.page;
    await p.locator('.card .btn.p', { hasText: 'Record payment' }).click();
    const sheet = p.locator('.sheet');
    await sheet.locator('input[inputmode=numeric]').fill(amount);
    await sheet.locator('.chip', { hasText: method }).click();
    await sheet.locator('.btn.p.lg.full').click();
    await expect(p.locator('.toast')).toHaveText('Payment recorded');
  }

  // ---- layout checks -------------------------------------------------------------

  async expectNoHorizontalScroll() {
    const overflow = await this.page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
  }

  /** Saves a review screenshot under docs/audit-screenshots/<viewport>/. */
  async shot(name: string) {
    await this.page.waitForTimeout(200);
    await this.page.screenshot({
      path: path.join(
        __dirname,
        '..',
        '..',
        'docs',
        'audit-screenshots',
        this.viewport,
        `${name}.png`,
      ),
      fullPage: true,
    });
  }
}

export const test = base.extend<{ app: App }>({
  app: async ({ page, context }, use, testInfo) => {
    // Web fonts cannot be fetched from this sandbox; block them so pages render
    // with the system fallback immediately and consistently.
    await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const name = testInfo.project.name;
    await use(new App(page, name === 'phone', name));
    expect(errors, 'uncaught page errors').toEqual([]);
  },
});

export { expect };
