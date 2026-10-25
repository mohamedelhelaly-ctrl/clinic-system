import type { Locator, Page } from '@playwright/test';

/**
 * Human pacing from the brief, fixed (not random) so two runs produce the same
 * durations: the cursor glides 300–500 ms, 400–700 ms pauses around each click,
 * 40–60 ms per typed character.
 */
export const PACE = {
  glideMs: 380,
  beforeClickMs: 400,
  afterClickMs: 450,
  charDelayMs: 45,
  scrollMs: 900,
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export interface ClickOptions {
  /** Where to press inside the element; date inputs need the left edge, not the picker icon. */
  at?: 'center' | 'left';
}

/**
 * Drives the page like a person: glides a visible cursor (desktop) or taps
 * (phone), pauses around clicks, types at reading speed and scrolls smoothly.
 * In `fast` mode (setup and dry runs, never recorded) every pause is skipped.
 */
export class Human {
  readonly page: Page;
  readonly phone: boolean;
  readonly fast: boolean;
  private x = 720;
  private y = 430;

  constructor(page: Page, phone: boolean, fast: boolean) {
    this.page = page;
    this.phone = phone;
    this.fast = fast;
  }

  sleep(ms: number): Promise<void> {
    return this.fast ? Promise.resolve() : this.page.waitForTimeout(ms);
  }

  hold(ms: number): Promise<void> {
    return this.sleep(ms);
  }

  /** Puts the cursor somewhere before recording starts (no glide). */
  async place(x: number, y: number): Promise<void> {
    this.x = x;
    this.y = y;
    if (!this.phone) await this.page.mouse.move(x, y);
  }

  async glideTo(x: number, y: number, ms = PACE.glideMs): Promise<void> {
    if (this.phone) return;
    if (this.fast) {
      await this.page.mouse.move(x, y);
    } else {
      const steps = Math.max(10, Math.round(ms / 20));
      const [x0, y0] = [this.x, this.y];
      for (let i = 1; i <= steps; i++) {
        const k = easeInOut(i / steps);
        await this.page.mouse.move(x0 + (x - x0) * k, y0 + (y - y0) * k);
        await this.page.waitForTimeout(ms / steps);
      }
    }
    this.x = x;
    this.y = y;
  }

  /** Scrolls smoothly so the element sits comfortably in view. */
  async reveal(target: Locator): Promise<void> {
    await target.waitFor({ state: 'visible' });
    const box = await target.boundingBox();
    const vh = this.page.viewportSize()!.height;
    if (!box) return;
    // Desktop has a sticky header (~74 px); phone a bottom tab bar (~70 px).
    const top = this.phone ? 16 : 90;
    const bottom = vh - (this.phone ? 150 : 40);
    if (box.y >= top && box.y + box.height <= bottom) return;
    const delta = box.y - Math.max(top, (vh - box.height) * 0.4);
    await this.scrollBy(delta);
  }

  async scrollBy(dy: number, ms = PACE.scrollMs): Promise<void> {
    const start = await this.page.evaluate(() => window.scrollY);
    if (this.fast) {
      await this.page.evaluate((y) => window.scrollTo(0, y), start + dy);
      return;
    }
    const steps = Math.max(12, Math.round(ms / 20));
    for (let i = 1; i <= steps; i++) {
      const y = start + dy * easeInOut(i / steps);
      await this.page.evaluate((v) => window.scrollTo(0, v), y);
      await this.page.waitForTimeout(ms / steps);
    }
  }

  private async point(target: Locator, at: ClickOptions['at'] = 'center') {
    const box = (await target.boundingBox())!;
    const x = at === 'left' ? box.x + Math.min(36, box.width / 4) : box.x + box.width / 2;
    return { x, y: box.y + box.height / 2 };
  }

  async click(target: Locator, options: ClickOptions = {}): Promise<void> {
    await this.reveal(target);
    if (this.phone) {
      await this.sleep(PACE.beforeClickMs);
      await target.tap();
      await this.sleep(PACE.afterClickMs);
      return;
    }
    const { x, y } = await this.point(target, options.at);
    await this.glideTo(x, y);
    await this.sleep(PACE.beforeClickMs);
    await this.page.mouse.down();
    await this.sleep(70);
    await this.page.mouse.up();
    await this.sleep(PACE.afterClickMs);
  }

  /** Moves the cursor onto something to draw the eye, without clicking. */
  async pointAt(target: Locator): Promise<void> {
    await this.reveal(target);
    const { x, y } = await this.point(target);
    await this.glideTo(x, y);
  }

  async type(target: Locator, text: string, options: ClickOptions = {}): Promise<void> {
    await this.click(target, options);
    await target.pressSequentially(text, { delay: this.fast ? 0 : PACE.charDelayMs });
    await this.sleep(150);
  }

  /** Replaces a prefilled value: select all, then type. */
  async retype(target: Locator, text: string): Promise<void> {
    await this.click(target);
    await target.press('ControlOrMeta+a');
    await target.pressSequentially(text, { delay: this.fast ? 0 : PACE.charDelayMs });
    await this.sleep(150);
  }

  /** Native <select>: show the click, then choose without opening the OS popup. */
  async choose(target: Locator, value: string): Promise<void> {
    await this.reveal(target);
    if (!this.phone) {
      const { x, y } = await this.point(target);
      await this.glideTo(x, y);
      await this.sleep(PACE.beforeClickMs);
      await this.page.evaluate(([px, py]) => window.__clipRipple?.(px!, py!), [x, y]);
    } else {
      await this.sleep(PACE.beforeClickMs);
    }
    await target.selectOption(value);
    await this.sleep(PACE.afterClickMs);
  }

  async press(key: string): Promise<void> {
    await this.page.keyboard.press(key);
    await this.sleep(120);
  }
}

declare global {
  interface Window {
    __clipRipple?: (x: number, y: number) => void;
  }
}
