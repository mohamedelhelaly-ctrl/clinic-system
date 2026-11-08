// Vertical preview board: for every scene, three stills at 1080x1920 (first frame, key moment, last frame),
// an overview sheet and a caption table, into ../preview-board-vertical/.
// Usage: node tools/preview-board.mjs   (after node build-vertical.mjs). HF overrides the HyperFrames command.
import { execSync } from "node:child_process";
import { readFileSync, mkdirSync, rmSync, copyFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, tmpdir } from "node:os";
import { createRequire } from "node:module";
import { AUDIO } from "../scenes-vertical.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "../preview-board-vertical");
const HF = process.env.HF || "npx --yes hyperframes@0.8.198";
const data = JSON.parse(readFileSync(join(ROOT, "preview-times.json"), "utf8"));
const CAM = JSON.parse(readFileSync(join(ROOT, "camera.json"), "utf8"));
const shots = data.scenes.flatMap((s) => ["first", "key", "last"].map((k) => ({ scene: s.scene, id: s.id, kind: k, t: s[k] })));

const tmp = join(tmpdir(), `pulse-vboard-${process.pid}`);
rmSync(tmp, { recursive: true, force: true });
const env = { ...process.env };
delete env.GEMINI_API_KEY; // never send frames to a vision API
const times = [...new Set(shots.map((s) => s.t))];
execSync(`${HF} snapshot --at ${times.join(",")} --no-end -o "${tmp}"`, { cwd: ROOT, stdio: "ignore", env });
const frames = readdirSync(tmp).filter((f) => /^frame-\d+-at-.*\.png$/.test(f));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const s of shots) {
  const src = frames.find((f) => f.endsWith(`-at-${s.t}s.png`));
  if (!src) throw new Error(`no snapshot for ${s.t}`);
  s.file = `${String(s.scene).padStart(2, "0")}-${s.id}-${["first", "key", "last"].indexOf(s.kind) + 1}-${s.kind}.png`;
  copyFileSync(join(tmp, src), join(OUT, s.file));
}
rmSync(tmp, { recursive: true, force: true });

const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
const capText = (t) => (Array.isArray(t) ? t.join(" / ") : t);
let md = `# Vertical preview board\n\n${data.total.toFixed(2)} s · 1080x1920 · 30 fps. Three stills per scene (first, key moment, last) in this folder; overview in 00-overview.png.\n\n## Caption on-screen durations\n\n| Scene | From | To | On screen | Text |\n|---|---|---|---|---|\n`;
for (const c of data.captions) md += `| ${c.scene} | ${fmt(c.start)} | ${fmt(c.end)} | ${(c.end - c.start).toFixed(2)} s | ${capText(c.text)} |\n`;
writeFileSync(join(OUT, "captions.md"), md);

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
const tw = 216, th = 384;
const scenes = data.scenes.map((s) => ({ ...s, shots: shots.filter((x) => x.scene === s.scene), caps: data.captions.filter((c) => c.scene === s.scene) }));
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Cairo;src:url("file://${ROOT}/fonts/Cairo-VariableFont.ttf")}
@font-face{font-family:Figtree;src:url("file://${ROOT}/fonts/Figtree-VariableFont.ttf")}
body{margin:0;padding:36px;background:#f7fbfb;font-family:Figtree,Cairo,sans-serif;color:#102322;width:${2 * (3 * tw + 2 * 8) + 40}px}
h1{margin:0 0 6px;font-size:32px;color:#094e4d}.sub{margin:0 0 24px;font-size:17px;color:#3b5352}
.grid{display:grid;grid-template-columns:repeat(2,${3 * tw + 16}px);gap:28px 40px}
.sc{background:#fff;border:1px solid rgba(14,124,123,.18);border-radius:14px;overflow:hidden}
.row{display:flex;gap:8px}.row figure{margin:0}.row img{display:block;width:${tw}px;height:${th}px}
.row figcaption{font-size:13px;color:#3b5352;padding:4px 6px}
.meta{padding:8px 12px 12px;font-size:15px;line-height:1.35}.meta b{color:#0e7c7b}
.cap{direction:rtl;font-family:Cairo;font-size:17px}
.key{font-size:13px;color:#3b5352}
</style></head><body>
<h1>Pulse promo, vertical: preview board</h1>
<p class="sub">${data.total.toFixed(2)} s · 1080x1920 · 30 fps · ${esc(AUDIO.music.credit)}</p>
<div class="grid">${scenes
  .map(
    (s) => `<div class="sc"><div class="row">${s.shots
      .map((x) => `<figure><img src="file://${OUT}/${x.file}"><figcaption>${x.kind} · ${fmt(x.t)}</figcaption></figure>`)
      .join("")}</div><div class="meta"><b>Scene ${s.scene}</b> · ${esc(s.id)}${s.caps
      .map((c) => `<div class="cap">${esc(capText(c.text))} <span class="key">(${(c.end - c.start).toFixed(2)} s)</span></div>`)
      .join("")}${Object.entries(CAM.parts)
      .filter(([k]) => k.startsWith(`${s.id}/`))
      .map(([, v]) => `<div class="key">${esc(v.clip)}: ${esc(v.key)}</div>`)
      .join("")}</div></div>`,
  )
  .join("")}</div></body></html>`;
const htmlPath = join(OUT, ".overview.html");
writeFileSync(htmlPath, html);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--allow-file-access-from-files"] });
const page = await browser.newPage();
await page.setViewport({ width: 2 * (3 * tw + 16) + 40 + 72, height: 800, deviceScaleFactor: 1 });
await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(OUT, "00-overview.png"), fullPage: true });
await browser.close();
rmSync(htmlPath);
console.log(`Wrote ${shots.length} stills, captions.md and 00-overview.png to ${OUT}`);
