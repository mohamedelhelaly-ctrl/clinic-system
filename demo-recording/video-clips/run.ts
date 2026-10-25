/*
 * Records the promo clips. Usage (from the repo root):
 *
 *   npm run clips                      all clips, twice from reset, compared
 *   npm run clips -- S03a-register     one clip (prerequisite snapshots rebuilt as needed)
 *   npm run clips -- --runs 1          all clips once
 *
 * See README.md in this folder.
 */
import type { Browser, BrowserContextOptions, Page } from '@playwright/test';
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { Clip, ClipContext, Role } from './clips.ts';
import { CLIPS } from './clips.ts';
import { assertPlays, encode, FrameCapture, frameAt, probe } from './lib/capture.ts';
import type { ProbeResult } from './lib/capture.ts';
import { assertClean, assertFonts, assertLayout } from './lib/checks.ts';
import { Human } from './lib/human.ts';
import { writeContactSheets } from './lib/sheets.ts';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT = path.join(ROOT, 'video', 'clips');
const SNAPSHOTS = path.join(OUT, '.snapshots');
const RAW = path.join(OUT, 'raw');
const OVERLAY = path.join(import.meta.dirname, 'lib', 'overlay.js');
const PORT = 5184;
const ORIGIN = `http://localhost:${PORT}`;
const START_HOLD_MS = 600;
const END_HOLD_MS = 1000;
const DURATION_TOLERANCE = 1.5;
const STABILITY_TOLERANCE = 0.5;

interface Device {
  context: BrowserContextOptions;
  output: { width: number; height: number };
}

const COMMON: BrowserContextOptions = {
  deviceScaleFactor: 2,
  locale: 'en-US',
  timezoneId: 'Africa/Cairo',
  colorScheme: 'light',
};
const DEVICES: Record<Clip['device'], Device> = {
  desktop: {
    context: { ...COMMON, viewport: { width: 1440, height: 810 } },
    output: { width: 2560, height: 1440 },
  },
  phone: {
    context: { ...COMMON, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    output: { width: 780, height: 1688 },
  },
};

export interface ClipResult {
  id: string;
  run: number;
  passed: boolean;
  error?: string;
  duration?: number;
  captureFps?: number;
  capturedFrames?: number;
  probe?: ProbeResult;
}

// ---- dev server ------------------------------------------------------------------

async function reachable(): Promise<boolean> {
  try {
    return (await fetch(ORIGIN)).ok;
  } catch {
    return false;
  }
}

async function ensureServer(): Promise<ChildProcess | null> {
  if (await reachable()) return null;
  const server = spawn(
    'npm',
    ['run', 'dev', '-w', 'apps/web', '--', '--port', String(PORT), '--strictPort'],
    {
      cwd: ROOT,
      stdio: 'ignore',
    },
  );
  for (let i = 0; i < 120; i++) {
    if (await reachable()) return server;
    await new Promise((r) => setTimeout(r, 500));
  }
  server.kill();
  throw new Error(`dev server did not start on ${ORIGIN}`);
}

// ---- contexts and snapshots ---------------------------------------------------------

const snapshotPath = (name: string) => path.join(SNAPSHOTS, `${name}.json`);
const failedSnapshots = new Map<string, string>();

/** Day-month or month-day: Chrome lays out date inputs in the OS's order, whatever the locale. */
let dateOrder: 'dmy' | 'mdy' = 'dmy';
async function detectDateOrder(browser: Browser) {
  const page = await browser.newPage({ locale: 'en-US' });
  await page.setContent('<input type="date">');
  await page.locator('input').click({ position: { x: 8, y: 8 } });
  await page.keyboard.type('14031992');
  const value = await page.locator('input').inputValue();
  await page.close();
  if (value === '1992-03-14') dateOrder = 'dmy';
  else if (value === '1992-12-03' || value === '') dateOrder = 'mdy';
  console.log(
    `Date inputs use ${dateOrder === 'dmy' ? 'day/month/year' : 'month/day/year'} on this machine.`,
  );
}
const dateKeys = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return dateOrder === 'dmy' ? `${d}${m}${y}` : `${m}${d}${y}`;
};

async function newContext(browser: Browser, clip: Clip, state: string | null) {
  const context = await browser.newContext({
    ...DEVICES[clip.device].context,
    ...(state ? { storageState: state } : {}),
  });
  await context.addInitScript({ path: OVERLAY });
  // The app has no favicon; answer the browser's request so it is not a console error.
  await context.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
  return context;
}

function clipContext(
  page: Page,
  clip: Clip,
  fast: boolean,
  resetPending: { value: boolean },
): ClipContext {
  const phone = clip.device === 'phone';
  return {
    page,
    phone,
    human: new Human(page, phone, fast),
    quick: new Human(page, phone, true),
    dateKeys,
    async open(role: Role = clip.actor, lang = clip.lang) {
      const reset = resetPending.value ? '&reset=1' : '';
      resetPending.value = false;
      await page.goto(`${ORIGIN}/?role=${role}&lang=${lang}&clean=1${reset}`);
      await page.locator('.app .main').waitFor();
      await page.evaluate(() => document.fonts.ready);
    },
    async demo(fn, ...args) {
      return page.evaluate(
        async ([name, rest]) => {
          const hooks = (window as unknown as { __demo?: unknown }).__demo as Record<
            string,
            (...a: unknown[]) => unknown
          >;
          if (!hooks) throw new Error('window.__demo missing (clean mode off?)');
          return hooks[name as string]!(...(rest as unknown[]));
        },
        [fn, args] as const,
      ) as never;
    },
  };
}

/** Path of the snapshot `name`, building it (unrecorded) from its producer clip if missing. */
async function ensureSnapshot(browser: Browser, name: string): Promise<string | null> {
  if (name === 'reset') return null;
  const file = snapshotPath(name);
  if (fs.existsSync(file)) return file;
  if (failedSnapshots.has(name))
    throw new Error(`snapshot ${name} unavailable: ${failedSnapshots.get(name)}`);
  const producer = CLIPS.find((c) => c.produces === name);
  if (!producer) throw new Error(`no clip produces snapshot ${name}`);
  console.log(`  · building snapshot ${name} (dry run of ${producer.id})`);
  const r = await runClip(browser, producer, { run: 0, dry: true });
  if (!fs.existsSync(file)) {
    failedSnapshots.set(name, r.error ?? 'not produced');
    throw new Error(`snapshot ${name} unavailable: ${r.error ?? 'not produced'}`);
  }
  return file;
}

// ---- one clip ------------------------------------------------------------------------

async function runClip(
  browser: Browser,
  clip: Clip,
  opts: { run: number; dry: boolean },
): Promise<ClipResult> {
  const result: ClipResult = { id: clip.id, run: opts.run, passed: false };
  const contexts: { close(): Promise<void> }[] = [];
  let stopCapture: (() => Promise<unknown>) | null = null;
  try {
    let state = await ensureSnapshot(browser, clip.needs);
    const resetPending = { value: clip.needs === 'reset' };

    // Setup runs in its own unrecorded context and is saved as a snapshot.
    if (clip.setup) {
      const context = await newContext(browser, clip, state);
      contexts.push(context);
      const page = await context.newPage();
      await clip.setup(clipContext(page, clip, true, resetPending));
      state = snapshotPath(`${clip.id}~setup`);
      fs.mkdirSync(SNAPSHOTS, { recursive: true });
      await context.storageState({ path: state });
      await context.close();
    }

    const context = await newContext(browser, clip, state);
    contexts.push(context);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
    const c = clipContext(page, clip, opts.dry, resetPending);

    await c.open();
    await clip.prepare?.(c);
    await page.waitForTimeout(opts.dry ? 0 : 400);

    if (opts.dry) {
      await clip.act(c);
      await clip.verify(c);
    } else {
      await assertFonts(page);
      await assertClean(page);
      await assertLayout(page);
      const vp = page.viewportSize()!;
      await c.human.place(vp.width * 0.62, vp.height * 0.55);

      const capture = new FrameCapture(page, path.join(RAW, clip.id));
      stopCapture = () => capture.stop().catch(() => undefined);
      await capture.start();
      const started = performance.now();
      await page.waitForTimeout(START_HOLD_MS);
      await clip.act(c);
      await clip.verify(c);
      const elapsed = performance.now() - started;
      // Hold at least 1 s at the end; longer when the action finished early, to meet the target.
      await page.waitForTimeout(Math.max(END_HOLD_MS, clip.target * 1000 - elapsed - 80));
      stopCapture = null;
      await capture.stop();

      await assertClean(page);
      await assertLayout(page);
      if (errors.length) throw new Error(errors.join(' | '));

      const mp4 = path.join(OUT, `${clip.id}.mp4`);
      encode(capture.frames, capture.duration, mp4, DEVICES[clip.device].output);
      assertPlays(mp4);
      const info = probe(mp4);
      result.probe = info;
      result.duration = Number(info.duration.toFixed(2));
      result.captureFps = Number(capture.captureFps.toFixed(1));
      result.capturedFrames = capture.frames.length;
      frameAt(mp4, -0.1, path.join(OUT, 'posters', `${clip.id}.png`));

      const { width, height } = DEVICES[clip.device].output;
      const problems: string[] = [];
      if (info.bytes === 0) problems.push('empty file');
      if (info.width !== width || info.height !== height)
        problems.push(`size ${info.width}x${info.height}`);
      if (Math.abs(info.fps - 30) > 0.01) problems.push(`fps ${info.fps}`);
      if (info.codec !== 'h264' || info.pixFmt !== 'yuv420p')
        problems.push(`${info.codec}/${info.pixFmt}`);
      if (Math.abs(info.duration - clip.target) > DURATION_TOLERANCE) {
        problems.push(`duration ${info.duration.toFixed(2)} s vs target ${clip.target} s`);
      }
      if (problems.length) throw new Error(problems.join('; '));
    }

    await clip.post?.(c);
    if (clip.produces) {
      fs.mkdirSync(SNAPSHOTS, { recursive: true });
      await context.storageState({ path: snapshotPath(clip.produces) });
    }
    result.passed = true;
  } catch (e) {
    result.error = (e as Error).message.split('\n')[0];
    await stopCapture?.();
  } finally {
    for (const ctx of contexts) await ctx.close().catch(() => undefined);
  }
  return result;
}

// ---- main ------------------------------------------------------------------------------

function parseArgs(argv: string[]) {
  const ids: string[] = [];
  let runs: number | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--runs') runs = Number(argv[++i]);
    else ids.push(argv[i]!);
  }
  const unknown = ids.filter((id) => !CLIPS.some((c) => c.id === id));
  if (unknown.length) throw new Error(`unknown clip id(s): ${unknown.join(', ')}`);
  return { ids, runs: runs ?? (ids.length ? 1 : 2) };
}

function writeManifest(results: ClipResult[]) {
  const latest = new Map(results.map((r) => [r.id, r]));
  const manifest = {
    generated: new Date().toISOString(),
    capture:
      'Screenshot-based at deviceScaleFactor 2 (Chrome screencast is limited to CSS-pixel size), assembled by ffmpeg to constant 30 fps.',
    clips: CLIPS.filter((c) => latest.has(c.id)).map((c) => {
      const r = latest.get(c.id)!;
      const runs = results.filter((x) => x.id === c.id);
      return {
        id: c.id,
        scene: c.scene,
        description: c.description,
        actor: c.actor,
        timeline: c.timeline,
        viewport: DEVICES[c.device].context.viewport,
        deviceScaleFactor: 2,
        language: c.lang,
        targetDuration: c.target,
        briefTargetDuration: c.briefTarget ?? c.target,
        duration: r.duration ?? null,
        resolution: r.probe ? `${r.probe.width}x${r.probe.height}` : null,
        fps: r.probe?.fps ?? null,
        captureFps: r.captureFps ?? null,
        file: `video/clips/${c.id}.mp4`,
        poster: `video/clips/posters/${c.id}.png`,
        snapshotNeeded: c.needs,
        snapshotProduced: c.produces ?? null,
        setupOffCamera: !!c.setup,
        optional: !!c.optional,
        passed: runs.every((x) => x.passed),
        runs: runs.map((x) => ({
          run: x.run,
          passed: x.passed,
          duration: x.duration ?? null,
          error: x.error ?? null,
        })),
        notes: c.notes ?? '',
      };
    }),
  };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

async function main() {
  const { ids, runs } = parseArgs(process.argv.slice(2));
  const selected = ids.length ? CLIPS.filter((c) => ids.includes(c.id)) : CLIPS;
  fs.mkdirSync(OUT, { recursive: true });
  const server = await ensureServer();
  const browser = await chromium.launch({ channel: 'chrome' });
  await detectDateOrder(browser);
  const results: ClipResult[] = [];
  try {
    for (let run = 1; run <= runs; run++) {
      // Every full run starts from reset: no snapshot carries over.
      if (!ids.length) fs.rmSync(SNAPSHOTS, { recursive: true, force: true });
      failedSnapshots.clear();
      console.log(`Run ${run}/${runs}`);
      for (const clip of selected) {
        const r = await runClip(browser, clip, { run, dry: false });
        results.push(r);
        console.log(
          `  ${r.passed ? '✓' : '✗'} ${clip.id.padEnd(28)} ${r.duration?.toFixed(2) ?? '  -  '} s (target ${clip.target}) ` +
            `${r.captureFps ? `${r.captureFps} fps captured` : ''}${r.error ? `  ${r.error}` : ''}`,
        );
      }
    }
    // Stability: the same clip must give the same duration and end state on every run.
    if (runs > 1) {
      for (const clip of selected) {
        const rs = results.filter((r) => r.id === clip.id);
        const ds = rs.map((r) => r.duration).filter((d): d is number => d !== undefined);
        const spread = ds.length ? Math.max(...ds) - Math.min(...ds) : 0;
        if (spread > STABILITY_TOLERANCE || rs.some((r) => !r.passed)) {
          for (const r of rs) {
            if (r.passed) {
              r.passed = false;
              r.error = `unstable across runs (durations ${ds.join(', ')})`;
            }
          }
        }
      }
    }
    writeManifest(results);
    await writeContactSheets(
      browser,
      OUT,
      CLIPS.filter((c) => fs.existsSync(path.join(OUT, `${c.id}.mp4`))),
    );
  } finally {
    await browser.close();
    server?.kill();
  }
  const last = selected.map((c) => results.filter((r) => r.id === c.id).at(-1)!);
  const failed = selected.filter((c) => results.some((r) => r.id === c.id && !r.passed));
  console.log(
    `\n${last.length - failed.length}/${last.length} clips passed${failed.length ? `; failed: ${failed.map((c) => c.id).join(', ')}` : ''}`,
  );
  process.exitCode = failed.length ? 1 : 0;
}

await main();
