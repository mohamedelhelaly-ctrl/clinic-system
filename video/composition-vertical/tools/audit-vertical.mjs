// Audits the vertical cut at 1080x1920 with its own CSS and bundled fonts:
//   captions: inside x 60..1020 and y 140..1660, at most 3 lines, >= 48 px, RTL,
//             contrast >= 4.5:1 against the darkest ground (#eef6f6) or their own fill,
//             and the minimum on-screen times from the vertical brief;
//   card:     every camera key frame keeps the app card inside the 40 px side margins and y 280..1340.
// Usage: node tools/audit-vertical.mjs   (after node build-vertical.mjs)
import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(ROOT, "preview-times.json"), "utf8"));
const CAM = JSON.parse(readFileSync(join(ROOT, "camera.json"), "utf8"));
const css = readFileSync(join(ROOT, "../composition/brand.css"), "utf8") + readFileSync(join(ROOT, "styles-vertical.css"), "utf8");

// Minimum on-screen seconds from the vertical brief, keyed by the caption's opening words.
const MIN = [
  ["يوم عيادتك", 3.5],
  ["لو لغى", 3.8],
  ["الملاحظات الطبية", 4.0],
  ["اكتب الشكوى", 4.2],
  ["كل زيارة", 5.0],
];

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
const page = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#eef6f6}
.frame{position:absolute;inset:0;display:none}.frame.on{display:block}</style></head><body>
${data.captions
  .map((c, i) => {
    const inner = Array.isArray(c.text) ? c.text.map((l) => `<span class="line">${esc(l)}</span>`).join("") : esc(c.text);
    return `<div class="frame" id="f${i}"><div class="cap"><div class="cap-text ${c.style || ""}" id="p${i}">${inner}</div></div></div>`;
  })
  .join("\n")}</body></html>`;

const server = createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(page);
  }
  const f = join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": { ".ttf": "font/ttf" }[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const tab = await browser.newPage();
await tab.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await tab.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "networkidle0" });
const res = await tab.evaluate(async (n) => {
  await Promise.all([document.fonts.load('800 58px "Cairo"', "بيبي"), document.fonts.load('800 42px "Figtree"', "Pulse")]);
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
    const el = document.getElementById(`p${i}`);
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const rects = [];
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const r = document.createRange();
      r.selectNodeContents(t);
      rects.push(...[...r.getClientRects()].filter((x) => x.width > 0));
    }
    const lh = parseFloat(cs.lineHeight);
    const tops = [];
    for (const r of rects.sort((a, b) => a.top - b.top)) if (!tops.some((t) => Math.abs(t - r.top) < lh / 2)) tops.push(r.top);
    const left = Math.min(...rects.map((r) => r.left)), right = Math.max(...rects.map((r) => r.right));
    const top = Math.min(box.top, ...rects.map((r) => r.top)), bottom = Math.max(box.bottom, ...rects.map((r) => r.bottom));
    const bg = cs.backgroundColor.includes("0, 0, 0, 0") || cs.backgroundColor === "transparent" ? "rgb(238, 246, 246)" : cs.backgroundColor;
    const l1 = lum(cs.color), l2 = lum(bg);
    out.push({
      i,
      x: [Math.round(Math.min(left, box.left)), Math.round(Math.max(right, box.right))],
      y: [Math.round(top), Math.round(bottom)],
      lines: tops.length,
      px: parseFloat(cs.fontSize),
      dir: cs.direction,
      contrast: Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100,
    });
  }
  return { fontsOk, out };
}, data.captions.length);
await browser.close();
server.close();

let fail = 0;
const line = (ok, msg) => {
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
};
line(res.fontsOk, "fonts loaded (Cairo, Figtree)");
console.log("\nCaptions:");
for (const r of res.out) {
  const c = data.captions[r.i];
  const text = Array.isArray(c.text) ? c.text.join(" / ") : c.text;
  const onScreen = Math.round((c.end - c.start) * 100) / 100;
  const min = (MIN.find(([w]) => text.startsWith(w)) || [null, 0])[1];
  const ok = r.x[0] >= 60 && r.x[1] <= 1020 && r.y[0] >= 140 && r.y[1] <= 1660 && r.lines <= 3 && r.px >= 48 && r.dir === "rtl" && r.contrast >= 4.5 && onScreen >= min;
  line(ok, `scene ${c.scene}  x ${r.x[0]}-${r.x[1]}  y ${r.y[0]}-${r.y[1]}  ${r.lines} line(s)  ${r.px}px  ${r.contrast}:1  ${r.dir}  on screen ${onScreen}s${min ? ` (min ${min}s)` : ""}  | ${text}`);
}
console.log("\nApp card (every camera key frame):");
const { left, width, areaTop, areaHeight } = CAM.card;
const cy = areaTop + areaHeight / 2;
for (const [k, v] of Object.entries(CAM.parts)) {
  for (const key of v.keys) {
    const top = cy - key.h / 2, bottom = cy + key.h / 2;
    const ok = left >= 40 && left + width <= 1040 && top >= 280 && bottom <= 1340 && key.s <= 1.4;
    if (!ok) line(false, `${k} t=${key.t}: card x ${left}-${left + width} y ${top}-${bottom} scale ${key.s}`);
  }
}
const keys = Object.values(CAM.parts).flatMap((v) => v.keys);
line(true, `${keys.length} key frames checked: card x 40-1040, y within 280-1340, scales ${Math.min(...keys.map((k) => k.s))} to ${Math.max(...keys.map((k) => k.s))}`);
console.log(fail ? `\n${fail} check(s) FAILED` : "\nAll vertical audits pass.");
process.exit(fail ? 1 : 0);
