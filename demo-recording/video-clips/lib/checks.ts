import type { Locator, Page } from '@playwright/test';

/** A failed check fails the clip. */
export class ClipCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClipCheckError';
  }
}

const fail = (message: string): never => {
  throw new ClipCheckError(message);
};

/** Polls until `predicate` holds or the timeout passes. */
async function until(predicate: () => Promise<boolean>, timeout: number): Promise<boolean> {
  const end = Date.now() + timeout;
  for (;;) {
    if (await predicate().catch(() => false)) return true;
    if (Date.now() > end) return false;
    await new Promise((r) => setTimeout(r, 100));
  }
}

export async function expectVisible(target: Locator, what: string, timeout = 6000): Promise<void> {
  if (!(await until(() => target.first().isVisible(), timeout))) fail(`not visible: ${what}`);
}

export async function expectHidden(target: Locator, what: string, timeout = 6000): Promise<void> {
  if (
    !(await until(
      async () => (await target.count()) === 0 || !(await target.first().isVisible()),
      timeout,
    ))
  )
    fail(`still visible: ${what}`);
}

export async function expectText(
  target: Locator,
  expected: string | RegExp,
  what: string,
  timeout = 6000,
): Promise<void> {
  let last = '';
  const ok = await until(async () => {
    last = (await target.first().innerText()).trim();
    return typeof expected === 'string' ? last.includes(expected) : expected.test(last);
  }, timeout);
  if (!ok) fail(`${what}: expected ${String(expected)}, got "${last.slice(0, 120)}"`);
}

/** Exact list of badge texts, e.g. ['Scheduled', 'Unpaid']. */
export async function expectBadges(row: Locator, badges: string[], what: string): Promise<void> {
  let last: string[] = [];
  const ok = await until(async () => {
    last = (await row.first().locator('.badge').allInnerTexts()).map((s) => s.trim());
    return JSON.stringify(last) === JSON.stringify(badges);
  }, 6000);
  if (!ok)
    fail(`${what}: expected badges ${badges.join(' + ')}, got ${last.join(' + ') || 'none'}`);
}

/** Recording mode must hide every demo control (the small Demo badge may stay). */
export async function assertClean(page: Page): Promise<void> {
  const controls = await page.evaluate(() => {
    const selectors = {
      'demo footer controls': '[data-testid="demo-clock-controls"], [data-testid="demo-reset"]',
      'role switcher': 'header label.demo',
      'Demo: simulate card': '[data-testid="demo-appointment-panel"]',
    };
    return Object.entries(selectors)
      .filter(([, s]) =>
        [...document.querySelectorAll(s)].some((el) => (el as HTMLElement).offsetParent),
      )
      .map(([name]) => name);
  });
  if (controls.length) fail(`demo controls visible in clean mode: ${controls.join(', ')}`);
}

/** No horizontal scroll and no clipped text (same rules as the e2e layout checks). */
export async function assertLayout(page: Page): Promise<void> {
  const problems = await page.evaluate(() => {
    const out: string[] = [];
    const W = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > W)
      out.push(`horizontal scroll (${document.documentElement.scrollWidth}px > ${W}px)`);
    for (const el of document.querySelectorAll('.app *')) {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || s.visibility === 'hidden' || el.closest('svg')) continue;
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());
      if (
        ownText &&
        (s.overflowX === 'hidden' || s.overflowX === 'clip' || s.textOverflow === 'ellipsis') &&
        el.scrollWidth > el.clientWidth + 1
      ) {
        out.push(`clipped text: "${(el.textContent ?? '').trim().slice(0, 40)}"`);
      }
    }
    return out;
  });
  if (problems.length) fail(problems.join('; '));
}

/** Figtree and Noto Sans Arabic must both be loaded (not a fallback). */
export async function assertFonts(page: Page): Promise<void> {
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    const figtree = await document.fonts.load('600 16px Figtree', 'Nile Care Clinic');
    const arabic = await document.fonts.load('600 16px "Noto Sans Arabic"', 'عيادة نايل كير');
    await document.fonts.ready;
    return {
      figtree: figtree.length > 0 && document.fonts.check('600 16px Figtree', 'Nile Care Clinic'),
      arabic:
        arabic.length > 0 && document.fonts.check('600 16px "Noto Sans Arabic"', 'عيادة نايل كير'),
    };
  });
  if (!fonts.figtree || !fonts.arabic) {
    fail(
      `fonts not loaded: ${!fonts.figtree ? 'Figtree ' : ''}${!fonts.arabic ? 'Noto Sans Arabic' : ''}`,
    );
  }
}
