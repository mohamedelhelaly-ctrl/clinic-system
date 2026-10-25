import type { Browser } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Clip } from '../clips.ts';
import { probe } from './capture.ts';

const POINTS = [0, 0.25, 0.5, 0.75, 1];

/** Five frames of a clip as data URIs, `height` px tall. */
function thumbnails(mp4: string, height: number): string[] {
  const { duration } = probe(mp4);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sheet-'));
  return POINTS.map((p, i) => {
    const out = path.join(tmp, `${i}.jpg`);
    // The very last frame is read from the end; the rest by timestamp.
    const seek = p === 1 ? ['-sseof', '-0.1'] : ['-ss', (duration * p).toFixed(3)];
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-v',
        'error',
        ...seek,
        '-i',
        mp4,
        '-frames:v',
        '1',
        '-vf',
        `scale=-2:${height}:flags=lanczos`,
        '-q:v',
        '3',
        '-update',
        '1',
        out,
      ],
      { stdio: 'pipe' },
    );
    return `data:image/jpeg;base64,${fs.readFileSync(out).toString('base64')}`;
  });
}

const STYLE = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #10201f; color: #e8f1f0; font: 15px/1.35 -apple-system, "Segoe UI", sans-serif; }
  .sheet { padding: 18px 20px; display: inline-block; }
  .head { display: flex; gap: 14px; align-items: baseline; margin-bottom: 10px; }
  .head b { font-size: 18px; }
  .head span { color: #9fb8b6; }
  .frames { display: flex; gap: 10px; }
  figure { margin: 0; }
  img { display: block; border-radius: 6px; border: 1px solid #2c4644; }
  figcaption { color: #9fb8b6; font-size: 13px; margin-top: 4px; text-align: center; }
  .row { margin-bottom: 18px; }
`;

function block(clip: Clip, images: string[], duration: number) {
  return `<div class="row"><div class="head"><b>${clip.id}</b><span>${clip.scene} · ${clip.actor} · ${clip.device} · ${duration.toFixed(1)} s (target ${clip.target} s)</span></div>
  <div class="frames">${images
    .map(
      (src, i) =>
        `<figure><img src="${src}"><figcaption>${POINTS[i]! * 100}%</figcaption></figure>`,
    )
    .join('')}</div></div>`;
}

/** video/clips/contact-sheets/<id>.png for every clip, plus all-clips.png. */
export async function writeContactSheets(
  browser: Browser,
  out: string,
  clips: Clip[],
): Promise<void> {
  const dir = path.join(out, 'contact-sheets');
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { width: 800, height: 600 },
  });
  const rows: string[] = [];
  for (const clip of clips) {
    const mp4 = path.join(out, `${clip.id}.mp4`);
    const { duration } = probe(mp4);
    const phone = clip.device === 'phone';
    await page.setContent(
      `<style>${STYLE}</style><div class="sheet">${block(clip, thumbnails(mp4, phone ? 560 : 300), duration)}</div>`,
    );
    await page.locator('.sheet').screenshot({ path: path.join(dir, `${clip.id}.png`) });
    rows.push(block(clip, thumbnails(mp4, phone ? 300 : 160), duration));
  }
  await page.setContent(`<style>${STYLE}</style><div class="sheet">${rows.join('')}</div>`);
  await page.locator('.sheet').screenshot({ path: path.join(dir, 'all-clips.png') });
  await page.close();
}
