import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/*
 * Screenshot-based capture. Chrome's screencast (and therefore Playwright's
 * video) delivers frames at CSS-pixel size (1440x810) regardless of
 * deviceScaleFactor, so it cannot give a sharp 2560x1440 file. Screenshots do
 * render at full device resolution (2880x1620 at DPR 2), at roughly 20 per
 * second. Each frame keeps its timestamp; ffmpeg turns the irregular stream
 * into constant 30 fps by holding each frame until the next one.
 */

export interface Frame {
  file: string;
  /** Seconds since capture start. */
  t: number;
}

export class FrameCapture {
  readonly page: Page;
  readonly dir: string;
  frames: Frame[] = [];
  duration = 0;
  private running = false;
  private loop: Promise<void> | null = null;
  private t0 = 0;

  constructor(page: Page, dir: string) {
    this.page = page;
    this.dir = dir;
  }

  async start(): Promise<void> {
    fs.rmSync(this.dir, { recursive: true, force: true });
    fs.mkdirSync(this.dir, { recursive: true });
    this.frames = [];
    this.running = true;
    this.t0 = performance.now();
    await this.grab();
    this.loop = this.run();
  }

  private async grab(): Promise<void> {
    const t = (performance.now() - this.t0) / 1000;
    const buffer = await this.page.screenshot({
      type: 'jpeg',
      quality: 95,
      scale: 'device',
      caret: 'initial',
      animations: 'allow',
    });
    const file = path.join(this.dir, `f${String(this.frames.length).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, buffer);
    this.frames.push({ file, t });
  }

  private failure: Error | null = null;

  private async run(): Promise<void> {
    while (this.running) {
      try {
        await this.grab();
      } catch (e) {
        // A clip that fails closes its page; only report errors while still recording.
        if (this.running) this.failure = e as Error;
        return;
      }
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.loop;
    this.duration = (performance.now() - this.t0) / 1000;
    if (this.failure) throw this.failure;
  }

  /** Distinct frames per second actually captured. */
  get captureFps(): number {
    return this.frames.length / this.duration;
  }
}

/** H.264 MP4, yuv420p, constant 30 fps, CRF 16, +faststart. */
export function encode(
  frames: Frame[],
  duration: number,
  out: string,
  size: { width: number; height: number },
): void {
  const dir = path.dirname(frames[0]!.file);
  const lines = ['ffconcat version 1.0'];
  frames.forEach((f, i) => {
    const end = frames[i + 1]?.t ?? duration;
    const start = i === 0 ? 0 : f.t;
    lines.push(
      `file '${path.basename(f.file)}'`,
      `duration ${Math.max(0.001, end - start).toFixed(4)}`,
    );
  });
  // The concat demuxer ignores the last entry's duration unless the file repeats.
  lines.push(`file '${path.basename(frames.at(-1)!.file)}'`);
  const list = path.join(dir, 'frames.ffconcat');
  fs.writeFileSync(list, lines.join('\n') + '\n');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-v',
      'error',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      list,
      '-vf',
      `fps=30,scale=${size.width}:${size.height}:flags=lanczos:in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p`,
      '-t',
      duration.toFixed(3),
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '16',
      '-pix_fmt',
      'yuv420p',
      '-r',
      '30',
      '-fps_mode',
      'cfr',
      '-colorspace',
      'bt709',
      '-color_primaries',
      'bt709',
      '-color_trc',
      'bt709',
      '-color_range',
      'tv',
      '-movflags',
      '+faststart',
      out,
    ],
    { stdio: 'pipe' },
  );
}

export interface ProbeResult {
  width: number;
  height: number;
  fps: number;
  duration: number;
  frames: number;
  codec: string;
  pixFmt: string;
  bytes: number;
}

export function probe(file: string): ProbeResult {
  const json = JSON.parse(
    execFileSync('ffprobe', [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-count_frames',
      '-show_entries',
      'stream=width,height,r_frame_rate,nb_read_frames,codec_name,pix_fmt:format=duration',
      '-of',
      'json',
      file,
    ]).toString(),
  );
  const s = json.streams[0];
  const [num, den] = String(s.r_frame_rate).split('/').map(Number);
  return {
    width: s.width,
    height: s.height,
    fps: num! / den!,
    duration: Number(json.format.duration),
    frames: Number(s.nb_read_frames),
    codec: s.codec_name,
    pixFmt: s.pix_fmt,
    bytes: fs.statSync(file).size,
  };
}

/** Decodes the whole file; throws if ffmpeg reports any error. */
export function assertPlays(file: string): void {
  const result = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'null', '-'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.toString().trim()) throw new Error(`decode errors in ${file}: ${result}`);
}

/** PNG of one frame at `seconds` (negative = from the end). */
export function frameAt(file: string, seconds: number, out: string): void {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const seek = seconds < 0 ? ['-sseof', String(seconds)] : ['-ss', seconds.toFixed(3)];
  execFileSync(
    'ffmpeg',
    ['-y', '-v', 'error', ...seek, '-i', file, '-update', '1', '-frames:v', '1', out],
    {
      stdio: 'pipe',
    },
  );
}
