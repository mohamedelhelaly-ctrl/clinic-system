// Authoring aid for camera.json: for each desktop clip part, extracts frames across the part's
// on-screen range and overlays a labelled grid in SOURCE pixels (2560x1440), 2x2 per image.
// Usage: node tools/grid-frames.mjs <outDir> [sceneId ...]
import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import { SCENES } from "../scenes-vertical.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2];
const only = process.argv.slice(3);
mkdirSync(out, { recursive: true });

function findPuppeteer() {
  if (process.env.PUPPETEER_CORE) return process.env.PUPPETEER_CORE;
  const npx = join(homedir(), ".npm/_npx");
  for (const d of existsSync(npx) ? readdirSync(npx) : []) {
    const p = join(npx, d, "node_modules/puppeteer-core");
    if (existsSync(join(p, "package.json")) && existsSync(join(npx, d, "node_modules/hyperframes"))) return p;
  }
  throw new Error("puppeteer-core not found; set PUPPETEER_CORE");
}
const puppeteer = createRequire(import.meta.url)(findPuppeteer());
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--allow-file-access-from-files"] });
const page = await browser.newPage();
await page.setViewport({ width: 2560, height: 1440 });

for (const s of SCENES) {
  if (only.length && !only.includes(s.id)) continue;
  (s.parts || []).forEach((p, i) => {
    if (p.kind !== "clip") return;
    p._name = `${s.id}-p${i}-${p.clip}`;
  });
  for (const [i, p] of (s.parts || []).entries()) {
    if (p.kind !== "clip") continue;
    const rate = p.rate || 1;
    const span = p.holdFrom != null ? p.holdFrom : p.dur;
    const times = [0, 0.33, 0.66, 1].map((f) => Math.round((f * span) * 100) / 100);
    const files = times.map((t, k) => {
      const media = Math.min(p.in + t * rate, p.in + span * rate - 0.05);
      const f = join(out, `${p._name}-${k}.png`);
      execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(media), "-i", join(ROOT, `assets/clips/${p.clip}.mp4`), "-frames:v", "1", "-vf", "scale=1280:720", f]);
      return { f, t, media };
    });
    const lines = [];
    for (let x = 0; x <= 2560; x += 200) lines.push(`<line x1="${x / 2}" y1="0" x2="${x / 2}" y2="720"/><text x="${x / 2 + 3}" y="14">${x}</text>`);
    for (let y = 0; y <= 1440; y += 200) lines.push(`<line x1="0" y1="${y / 2}" x2="1280" y2="${y / 2}"/><text x="3" y="${y / 2 - 3}">${y}</text>`);
    const grid = `<svg width="1280" height="720" style="position:absolute;left:0;top:0"><g stroke="rgba(255,0,80,.45)" stroke-width="1">${lines.join("")}</g><style>text{fill:#e0004f;font:bold 13px monospace;stroke:none}</style></svg>`;
    const html = `<html><body style="margin:0;background:#000;display:grid;grid-template-columns:1280px 1280px">${files
      .map((x) => `<div style="position:relative;width:1280px;height:720px"><img src="file://${x.f}" style="display:block">${grid}<div style="position:absolute;right:6px;bottom:6px;background:#000;color:#ff0;font:bold 22px monospace;padding:2px 6px">part t=${x.t}s  clip t=${x.media.toFixed(2)}s</div></div>`)
      .join("")}</body></html>`;
    const hp = join(out, `${p._name}.html`);
    writeFileSync(hp, html);
    await page.goto(`file://${hp}`, { waitUntil: "load" });
    await page.screenshot({ path: join(out, `${p._name}.png`), clip: { x: 0, y: 0, width: 2560, height: 1440 } });
    console.log(`${p._name}.png  (${p.dur}s on screen${rate !== 1 ? `, ×${rate}` : ""}${p.holdFrom != null ? `, hold from ${p.holdFrom}s` : ""})`);
  }
}
await browser.close();
