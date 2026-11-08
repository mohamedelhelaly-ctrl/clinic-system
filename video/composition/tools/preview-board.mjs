// Writes the preview board: one still per scene (caption in place), stills of the title cards,
// chat graphics and short lines, and a labelled overview sheet, into ../preview-board/.
// Usage: node tools/preview-board.mjs   (after node build.mjs)
// HF overrides the HyperFrames command (default: the pinned npx version).
import { execSync } from "node:child_process";
import { readFileSync, mkdirSync, rmSync, copyFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, tmpdir } from "node:os";
import { createRequire } from "node:module";
import { SCENES, AUDIO } from "../scenes.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "../preview-board");
const HF = process.env.HF || "npx --yes hyperframes@0.8.198";
const data = JSON.parse(readFileSync(join(ROOT, "preview-times.json"), "utf8"));
const shots = [
  ...data.scenes.map((s) => ({ ...s, kind: "scene" })),
  ...data.extras.map((s) => ({ ...s, kind: "detail" })),
].sort((a, b) => a.t - b.t);

const tmp = join(tmpdir(), `pulse-board-${process.pid}`);
rmSync(tmp, { recursive: true, force: true });
const env = { ...process.env };
delete env.GEMINI_API_KEY; // never send frames to a vision API
execSync(`${HF} snapshot --at ${shots.map((s) => s.t).join(",")} --no-end -o "${tmp}"`, { cwd: ROOT, stdio: "ignore", env });
const frames = readdirSync(tmp).filter((f) => /^frame-\d+-at-.*\.png$/.test(f));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const sceneName = Object.fromEntries(SCENES.map((s) => [s.n, s.id]));
const capAt = (t) => data.captions.find((c) => t >= c.start && t <= c.end);
const items = shots.map((s, i) => {
  const src = frames.find((f) => f.endsWith(`-at-${s.t}s.png`)) || frames[i];
  const name = `${String(s.scene).padStart(2, "0")}${s.kind === "scene" ? "" : "x"}-${s.id}.png`;
  copyFileSync(join(tmp, src), join(OUT, name));
  const c = capAt(s.t);
  return { ...s, file: name, caption: c ? (Array.isArray(c.text) ? c.text.join(" / ") : c.text) : "" };
});
rmSync(tmp, { recursive: true, force: true });

// Overview sheet rendered in Chrome so the labels are real text.
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
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
const cols = 4;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Cairo;src:url("file://${ROOT}/fonts/Cairo-VariableFont.ttf")}
@font-face{font-family:Figtree;src:url("file://${ROOT}/fonts/Figtree-VariableFont.ttf")}
body{margin:0;padding:40px;background:#f7fbfb;font-family:Figtree,Cairo,sans-serif;color:#102322;width:${cols * 480 + (cols - 1) * 24}px}
h1{margin:0 0 6px;font-size:34px;color:#094e4d}.sub{margin:0 0 28px;font-size:18px;color:#3b5352}
.grid{display:grid;grid-template-columns:repeat(${cols},480px);gap:24px}
.cell{background:#fff;border:1px solid rgba(14,124,123,.18);border-radius:14px;overflow:hidden}
.cell img{display:block;width:480px;height:270px}
.meta{padding:10px 14px 12px;font-size:15px;line-height:1.35}
.meta b{color:#0e7c7b}.cap{direction:rtl;font-family:Cairo;font-size:17px;margin-top:4px}
.detail{opacity:.92}</style></head><body>
<h1>Pulse promo: preview board</h1>
<p class="sub">${data.total.toFixed(1)} s · 1920x1080 · 30 fps · ${items.filter((x) => x.kind === "scene").length} scenes · Music: ${esc(AUDIO.music.source)} — ${esc(AUDIO.music.credit)}</p>
<div class="grid">${items
  .map(
    (x) => `<div class="cell ${x.kind}"><img src="file://${OUT}/${x.file}"><div class="meta"><b>${x.kind === "scene" ? `Scene ${x.scene}` : `Scene ${x.scene} detail`}</b> · ${esc(x.id)} · ${fmt(x.t)}${x.caption ? `<div class="cap">${esc(x.caption)}</div>` : ""}</div></div>`,
  )
  .join("")}</div></body></html>`;
const htmlPath = join(OUT, ".overview.html");
writeFileSync(htmlPath, html);
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--allow-file-access-from-files"],
});
const page = await browser.newPage();
await page.setViewport({ width: cols * 480 + (cols - 1) * 24 + 80, height: 800, deviceScaleFactor: 1 });
await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(OUT, "00-overview.png"), fullPage: true });
await browser.close();
rmSync(htmlPath);
console.log(`Wrote ${items.length} stills and 00-overview.png to ${OUT}`);
