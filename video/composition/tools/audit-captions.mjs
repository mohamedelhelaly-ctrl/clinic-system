// Measures every caption at 1920x1080 with the composition's own CSS and bundled fonts:
//   - the pill lies inside the 5% safe area (96 px left/right, 54 px top/bottom)
//   - the text lies inside its pill (no overflow, no clipping)
//   - at most two lines
//   - text/background contrast of at least 4.5:1
// Usage: node tools/audit-captions.mjs   (after node build.mjs)
// Needs puppeteer-core (found in the hyperframes npx cache, or set PUPPETEER_CORE) and Chrome (CHROME_PATH).
import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(ROOT, "preview-times.json"), "utf8"));
const css = readFileSync(join(ROOT, "brand.css"), "utf8") + readFileSync(join(ROOT, "styles.css"), "utf8");

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
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const page = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:var(--bg)}
.frame{position:absolute;inset:0;display:none}.frame.on{display:block}</style></head><body>
${data.captions
  .map((c, i) => {
    const inner = Array.isArray(c.text) ? c.text.map((l) => `<span class="line">${esc(l)}</span>`).join("") : esc(c.text);
    return `<div class="frame" id="f${i}"><div class="cap"><div class="pill ${c.style || ""}" id="p${i}">${inner}</div></div></div>`;
  })
  .join("\n")}</body></html>`;

const server = createServer((req, res) => {
  if (req.url === "/" || req.url === "/audit.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(page);
  }
  const f = join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(ROOT) || !existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": { ".ttf": "font/ttf", ".css": "text/css" }[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const tab = await browser.newPage();
await tab.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await tab.goto(url, { waitUntil: "networkidle0" });
const results = await tab.evaluate(async (n) => {
  await Promise.all([document.fonts.load('700 42px "Cairo"', "بيبي"), document.fonts.load('700 42px "Figtree"', "Pulse 0123")]);
  await document.fonts.ready;
  const fontsOk = ["Cairo", "Figtree"].every((fam) => [...document.fonts].some((f) => f.family.replace(/"/g, "") === fam && f.status === "loaded"));
  const lum = (rgb) => {
    const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const out = [];
  for (let i = 0; i < n; i++) {
    document.querySelectorAll(".frame").forEach((f) => f.classList.remove("on"));
    document.getElementById(`f${i}`).classList.add("on");
    const pill = document.getElementById(`p${i}`);
    const cs = getComputedStyle(pill);
    const pr = pill.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(pill);
    // Line boxes of the text itself (not the block boxes of the line spans).
    const walker = document.createTreeWalker(pill, NodeFilter.SHOW_TEXT);
    const rects = [];
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const rr = document.createRange();
      rr.selectNodeContents(t);
      rects.push(...[...rr.getClientRects()].filter((r) => r.width > 0));
    }
    const lineH = parseFloat(cs.lineHeight);
    const tops = [];
    for (const r of rects.sort((a, b) => a.top - b.top)) if (!tops.some((t) => Math.abs(t - r.top) < lineH / 2)) tops.push(r.top);
    const tb = range.getBoundingClientRect();
    const inner = {
      left: pr.left + parseFloat(cs.paddingLeft) - 1,
      right: pr.right - parseFloat(cs.paddingRight) + 1,
      top: pr.top + parseFloat(cs.borderTopWidth) - 1,
      bottom: pr.bottom - parseFloat(cs.borderBottomWidth) + 1,
    };
    const l1 = lum(cs.color), l2 = lum(cs.backgroundColor);
    out.push({
      i,
      pill: { left: Math.round(pr.left), top: Math.round(pr.top), right: Math.round(pr.right), bottom: Math.round(pr.bottom) },
      text: { left: Math.round(tb.left), top: Math.round(tb.top), right: Math.round(tb.right), bottom: Math.round(tb.bottom) },
      lines: tops.length,
      inSafe: pr.left >= 96 && pr.right <= 1824 && pr.top >= 54 && pr.bottom <= 1026,
      textInPill: tb.left >= inner.left && tb.right <= inner.right && tb.top >= inner.top && tb.bottom <= inner.bottom && pill.scrollWidth <= pill.clientWidth + 1,
      contrast: Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100,
      direction: cs.direction,
      font: cs.fontFamily,
    });
  }
  return { fontsOk, out };
}, data.captions.length);
await browser.close();
server.close();

let fail = 0;
console.log(`fonts loaded (Cairo, Figtree): ${results.fontsOk ? "yes" : "NO"}`);
if (!results.fontsOk) fail++;
for (const r of results.out) {
  const c = data.captions[r.i];
  // Reading time: on screen (after the 0.35 s slide-in, before the 0.18 s exit) for at least 0.5 s + 0.3 s a word.
  const words = (Array.isArray(c.text) ? c.text.join(" ") : c.text).split(/\s+/).filter(Boolean).length;
  const readable = Math.round((c.end - c.start - 0.35 - 0.18) * 100) / 100;
  const needed = Math.round((0.5 + 0.3 * words) * 100) / 100;
  r.reading = `${readable}s/${needed}s`;
  const ok = r.inSafe && r.textInPill && r.lines <= 2 && r.contrast >= 4.5 && r.direction === "rtl" && readable >= needed;
  if (!ok) fail++;
  const text = Array.isArray(c.text) ? c.text.join(" / ") : c.text;
  console.log(`${ok ? "PASS" : "FAIL"}  scene ${c.scene}  pill x ${r.pill.left}-${r.pill.right} y ${r.pill.top}-${r.pill.bottom}  lines ${r.lines}  contrast ${r.contrast}:1  ${r.direction}  safe ${r.inSafe}  text-in-pill ${r.textInPill}  read ${r.reading}  | ${text}`);
}
console.log(fail ? `${fail} caption check(s) FAILED` : `All ${results.out.length} captions pass.`);
process.exit(fail ? 1 : 0);
