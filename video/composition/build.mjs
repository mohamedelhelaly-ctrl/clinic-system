// Generates index.html, compositions/*.html, assets/logo-*.svg and ../STORYBOARD.md
// from scenes.mjs. Edit scenes.mjs (timing, copy) or styles.css (look), then run:
//   node build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENES, XFADE, CAPTIONS, CHAT, AUDIO } from "./scenes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 1920;
const H = 1080;
const read = (p) => readFileSync(join(HERE, p), "utf8");
const write = (p, s) => {
  mkdirSync(dirname(join(HERE, p)), { recursive: true });
  writeFileSync(join(HERE, p), s);
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const r2 = (n) => Math.round(n * 1000) / 1000;
const CSS = read("brand.css") + "\n" + read("styles.css");

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------

for (const s of SCENES) {
  if (s.parts) {
    let t = 0;
    for (const p of s.parts) {
      p.start = r2(t);
      t += p.dur;
    }
    s.dur = r2(t);
  }
}
let clock = 0;
SCENES.forEach((s, i) => {
  s.start = r2(clock);
  const last = i === SCENES.length - 1;
  s.hostDur = r2(s.dur + (last ? 0 : XFADE));
  clock += s.dur - (last ? 0 : XFADE);
});
const TOTAL = r2(clock);

// Captions in absolute time.
const captions = [];
for (const s of SCENES) {
  for (const c of s.captions || []) {
    const span = (i) => (s.parts ? s.parts[i] : { start: 0, dur: s.dur });
    const a = span(c.from);
    const b = span(c.to);
    let start = s.start + a.start + (s.parts && c.from > 0 ? 0.15 : 0.35);
    let end = s.start + b.start + b.dur - 0.12;
    if (c.lastSeconds) start = s.start + b.start + b.dur - c.lastSeconds;
    if (c.trimEnd) end = s.start + b.start + b.dur - c.trimEnd - 0.04;
    captions.push({ scene: s, text: c.text, style: c.style || "", start: r2(start), end: r2(end) });
  }
}

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------

// Placeholder wordmark: "Pulse" in Figtree with a minimal pulse line running into the P.
function logoSvg(color, { embedFont = false } = {}) {
  const font = embedFont
    ? `<style>@font-face{font-family:"Figtree";font-weight:300 900;src:url(data:font/ttf;base64,${readFileSync(join(HERE, "fonts/Figtree-VariableFont.ttf")).toString("base64")}) format("truetype");}</style>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 262 80" role="img" aria-label="Pulse" direction="ltr" style="direction:ltr">${font}<path d="M4 41 H22 L30 22 L40 60 L48 41 H70" fill="none" stroke="${color}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><text x="74" y="62" direction="ltr" text-anchor="start" font-family="Figtree, sans-serif" font-weight="800" font-size="64" letter-spacing="-1.5" fill="${color}">Pulse</text></svg>`;
}
write("assets/logo-pulse.svg", logoSvg("#0e7c7b", { embedFont: true }) + "\n");
write("assets/logo-pulse-white.svg", logoSvg("#ffffff", { embedFont: true }) + "\n");

// Refuses to build when a part asks for more footage than its sped-up clip has.
const CLIP_LEN = JSON.parse(read("assets/clips/speed-factors.json"));
function checkMedia(clip, from, used, where) {
  const len = CLIP_LEN[clip].out;
  if (from + used > len + 0.02) throw new Error(`${where}: ${clip} needs ${r2(from + used)} s but the clip is ${len} s`);
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

const ticks = (id, read = false) =>
  `<svg class="ticks" id="${id}" viewBox="0 0 18 11"><path d="M1 6 L4.5 9.5 L11 2" fill="none" stroke="${read ? "#3d9be0" : "#8a9795"}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 9.5 L7 9.9 L16.5 1.5" fill="none" stroke="${read ? "#3d9be0" : "#8a9795"}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function msgApp(id, body) {
  return `<div class="msg-app">
      <div class="msg-head">
        <svg width="30" height="30" viewBox="0 0 24 24"><path d="M9 5 L16 12 L9 19" fill="none" stroke="#102322" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <div class="avatar"><svg width="38" height="38" viewBox="0 0 26 26"><circle cx="13" cy="9" r="5" fill="#0e7c7b"/><path d="M3 24 C4 17 22 17 23 24 Z" fill="#0e7c7b"/></svg></div>
        <div class="name">${esc(CHAT.clinicName)}</div>
      </div>
      <div class="msg-body" id="${id}-body">${body}</div>
      <div class="msg-input"><div class="field"></div><div class="send"><svg width="30" height="30" viewBox="0 0 24 24"><path d="M3 12 L21 4 L15 20 L11 13 Z" fill="#fff"/></svg></div></div>
    </div>`;
}

// Returns { html, anim(t0) } for a messaging-app graphic. Times are local to the part.
function chatGraphic(kind, id) {
  if (kind === "book") {
    const body = `<div class="bubble out" id="${id}-b1">${esc(CHAT.bookRequest)}<div class="meta" data-layout-ignore>10:12 ${ticks(`${id}-t1g`)}${ticks(`${id}-t1b`, true).replace('class="ticks"', 'class="ticks" style="display:none"')}</div></div>`;
    return {
      clock: "10:12",
      body,
      anim: (t) => [
        `tl.fromTo("#${id}-b1", {opacity:0, y:26, scale:0.96}, {opacity:1, y:0, scale:1, duration:0.4, ease:"power3.out"}, ${r2(t + 0.35)});`,
        `tl.set("#${id}-t1g", {display:"none"}, ${r2(t + 1.3)}); tl.set("#${id}-t1b", {display:"block"}, ${r2(t + 1.3)});`,
      ],
    };
  }
  if (kind === "remind") {
    const body = `<div class="bubble in" id="${id}-b1">${esc(CHAT.reminder).replace("د. ", "د.&nbsp;")}<div class="meta" data-layout-ignore>11:00</div>
        <div class="actions"><span id="${id}-ok"><i class="ripple" id="${id}-rip"></i>${esc(CHAT.confirm)}</span><span>${esc(CHAT.cancel)}</span></div></div>
      <div class="bubble out" id="${id}-b2">${esc(CHAT.confirm)}<div class="meta" data-layout-ignore>11:02 ${ticks(`${id}-t2g`)}${ticks(`${id}-t2b`, true).replace('class="ticks"', 'class="ticks" style="display:none"')}</div></div>`;
    return {
      clock: "11:02",
      body,
      anim: (t) => [
        `tl.set("#${id}-b2", {display:"none"}, 0);`,
        `tl.fromTo("#${id}-b1", {opacity:0, y:26, scale:0.96}, {opacity:1, y:0, scale:1, duration:0.4, ease:"power3.out"}, ${r2(t + 0.3)});`,
        `tl.fromTo("#${id}-rip", {scale:0, opacity:0}, {scale:1, opacity:1, duration:0.35, ease:"power2.out"}, ${r2(t + 1.9)});`,
        `tl.to("#${id}-rip", {opacity:0, duration:0.3, ease:"power1.in"}, ${r2(t + 2.25)});`,
        `tl.set("#${id}-b2", {display:"block"}, ${r2(t + 2.4)});`,
        `tl.fromTo("#${id}-b2", {opacity:0, y:26, scale:0.96}, {opacity:1, y:0, scale:1, duration:0.4, ease:"power3.out"}, ${r2(t + 2.4)});`,
        `tl.set("#${id}-t2g", {display:"none"}, ${r2(t + 3.0)}); tl.set("#${id}-t2b", {display:"block"}, ${r2(t + 3.0)});`,
      ],
    };
  }
  // Prescription PDF arriving.
  const body = `<div class="bubble in" id="${id}-b1"><div class="file"><div class="doc" data-layout-ignore>PDF</div><div><div class="fname">${esc(CHAT.prescriptionFile)}</div><div class="ftype" data-layout-ignore>PDF</div></div></div><div class="meta" data-layout-ignore>11:20</div></div>`;
  return {
    clock: "11:20",
    body,
    anim: (t) => [
      `tl.fromTo("#${id}-b1", {opacity:0, y:26, scale:0.96}, {opacity:1, y:0, scale:1, duration:0.4, ease:"power3.out"}, ${r2(t + 0.35)});`,
    ],
  };
}

const wordmark = (color = "#0e7c7b") => `<div class="wordmark" data-layout-allow-overlap>${logoSvg(color)}</div>`;

function sceneFile(id, body, anims, { fadeIn = true } = {}) {
  return `<template>
  <style>
${CSS}
  </style>
  <div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}">
    <div class="scene" id="${id}-scene">
${body}
    </div>
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    ${fadeIn ? `tl.fromTo("#${id}-scene", { opacity: 0 }, { opacity: 1, duration: ${XFADE}, ease: "none" }, 0);` : ""}
    ${anims.join("\n    ")}
    window.__timelines["${id}"] = tl;
  </script>
</template>
`;
}

// Splits Arabic copy into words for a word-by-word reveal. Each word is shaped whole.
const words = (text, cls) => text.split(" ").map((w, i) => `<span class="w ${cls}" data-i="${i}">${esc(w)}</span>`).join(" ");

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

function appScene(s) {
  const id = s.id;
  const anims = [];
  const layers = [];
  const vids = [];
  let z = 2;
  s.parts.forEach((p, i) => {
    const pid = `${id}-p${i}`;
    const prev = s.parts[i - 1];
    const next = s.parts[i + 1];
    const elDur = r2(p.dur + XFADE);
    if (p.kind === "clip") {
      const rate = p.rate || 1;
      // With holdFrom, the video stops just after that point and a still of its last frame carries on.
      const vidDur = p.holdFrom != null ? r2(p.holdFrom + 0.05) : elDur;
      checkMedia(p.clip, p.in, vidDur * rate, `${id} part ${i}`);
      const rateAttr = rate !== 1 ? ` data-playback-rate="${rate}"` : "";
      const hold = p.holdFrom != null
        ? `<img id="${pid}-hold" class="clip" src="assets/stills/${p.clip}-end.png" alt="" data-start="${r2(p.start + p.holdFrom)}" data-duration="${r2(elDur - p.holdFrom)}" data-track-index="2" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover">`
        : "";
      vids.push(`        <div class="zoom" id="${pid}-z" style="z-index:${z++}">${hold}<video id="${pid}" class="clip" src="assets/clips/${p.clip}.mp4" data-start="${p.start}" data-duration="${vidDur}" data-media-start="${p.in}"${rateAttr} data-track-index="1" data-hf-media-start-basis="local" muted playsinline style="z-index:1"></video></div>`);
      if (prev && prev.kind === "clip" && !p.join) anims.push(`tl.fromTo("#${pid}", {opacity:0}, {opacity:1, duration:${XFADE}, ease:"none"}, ${p.start});`);
      if (p.zoom) {
        const zm = p.zoom;
        // Scale about the window centre and pan the focus point toward the middle,
        // clamped so the clip always covers the window (no empty edge).
        const ww = 1344, wh = 756, k = zm.scale;
        const clamp = (v, m) => Math.max(-m, Math.min(m, v));
        const tx = r2(clamp(-k * (zm.x - 0.5) * ww, ((k - 1) * ww) / 2));
        const ty = r2(clamp(-k * (zm.y - 0.5) * wh, ((k - 1) * wh) / 2));
        anims.push(`tl.fromTo("#${pid}-z", {scale:1, x:0, y:0}, {scale:${k}, x:${tx}, y:${ty}, duration:0.9, ease:"power2.inOut"}, ${r2(p.start + zm.at)});`);
        if (zm.release) anims.push(`tl.to("#${pid}-z", {scale:1, x:0, y:0, duration:0.7, ease:"power2.inOut"}, ${r2(p.start + zm.release)});`);
      }
    } else if (p.kind === "chat") {
      const g = chatGraphic(p.chat, pid);
      layers.push(`      <div id="${pid}" class="chat clip" data-start="${p.start}" data-duration="${elDur}" data-track-index="2">
        <div class="panel">${msgApp(pid, g.body)}</div>
      </div>`);
      if (prev) anims.push(`tl.fromTo("#${pid}", {opacity:0}, {opacity:1, duration:${XFADE}, ease:"none"}, ${p.start});`);
      if (next) anims.push(`tl.to("#${pid}", {opacity:0, duration:${XFADE}, ease:"none"}, ${r2(p.start + p.dur)});`);
      anims.push(...g.anim(p.start));
    } else if (p.kind === "title") {
      layers.push(`      <div id="${pid}" class="card tint clip" data-start="${p.start}" data-duration="${elDur}" data-track-index="3"><div class="card-text" id="${pid}-t">${esc(p.text)}</div></div>`);
      if (prev) anims.push(`tl.fromTo("#${pid}", {opacity:0}, {opacity:1, duration:${XFADE}, ease:"none"}, ${p.start});`);
      anims.push(`tl.fromTo("#${pid}-t", {opacity:0, filter:"blur(8px)"}, {opacity:1, filter:"blur(0px)", duration:0.35, ease:"power3.out"}, ${r2(p.start + 0.1)});`);
      if (next) anims.push(`tl.to("#${pid}", {opacity:0, duration:${XFADE}, ease:"none"}, ${r2(p.start + p.dur)});`);
    }
  });

  // Label chips over the parts that carry the scene's label.
  const chips = [];
  if (s.label) {
    let run = null;
    s.parts.forEach((p, i) => {
      const on = !p.noLabel && p.kind !== "title";
      if (on && !run) run = { start: p.start, end: p.start + p.dur };
      else if (on) run.end = p.start + p.dur;
      if ((!on || i === s.parts.length - 1) && run) {
        chips.push(run);
        run = null;
      }
    });
  }
  const chipHtml = chips
    .map((c, i) => `      <div id="${id}-chip${i}" class="chip clip" data-start="${r2(c.start)}" data-duration="${r2(c.end - c.start + XFADE)}" data-track-index="4">${esc(s.label)}</div>`)
    .join("\n");

  const body = `      ${wordmark()}
${chipHtml}
      <div class="window" id="${id}-window">
${vids.join("\n")}
      </div>
${layers.join("\n")}`;
  return sceneFile(id, body, anims, { fadeIn: true });
}

function hookScene(s) {
  const id = s.id;
  const body = `      <div class="card teal" id="${id}-card"><div class="card-text">${words(CAPTIONS.hook, `${id}-w`)}</div></div>`;
  // On screen from frame 0: WhatsApp and most players use the first frame as the thumbnail.
  const anims = [`tl.set(".${id}-w", {opacity:1}, 0);`];
  return sceneFile(id, body, anims, { fadeIn: false });
}

function endScene(s) {
  const id = s.id;
  const body = `      <div class="card teal">
        <div class="end-stack">
          <div class="logo" id="${id}-logo">${logoSvg("#ffffff")}</div>
          <div class="tagline" id="${id}-tag">${esc(CAPTIONS.tagline)}</div>
          <div class="demo" id="${id}-demo">${esc(CAPTIONS.demo)}</div>
          <div class="contact" id="${id}-contact">${esc(CAPTIONS.contactLead)} <span class="num" dir="ltr">${esc(CAPTIONS.contactNumber)}</span></div>
        </div>
      </div>`;
  const anims = [
    `tl.fromTo("#${id}-logo", {opacity:0, y:18}, {opacity:1, y:0, duration:0.5, ease:"power3.out"}, 0.15);`,
    `tl.fromTo("#${id}-tag", {opacity:0, filter:"blur(8px)"}, {opacity:1, filter:"blur(0px)", duration:0.35, ease:"power3.out"}, 0.35);`,
    `tl.fromTo("#${id}-demo", {opacity:0, filter:"blur(8px)"}, {opacity:1, filter:"blur(0px)", duration:0.35, ease:"power3.out"}, 0.5);`,
    `tl.fromTo("#${id}-contact", {opacity:0, y:22}, {opacity:1, y:0, duration:0.45, ease:"power3.out"}, 0.65);`,
  ];
  return sceneFile(id, body, anims, { fadeIn: true });
}

function devicesScene(s) {
  const id = s.id;
  // Laptop (still from the start of S10c) beside a phone playing S10a then S10b.
  const sw = 1040, sh = 585; // laptop screen
  const ph = 720, pw = Math.round(ph * (780 / 1688));
  let t = 0;
  const vids = s.phone.map((p, i) => {
    const v = `<video id="${id}-v${i}" class="clip" src="assets/clips/${p.clip}.mp4" data-start="${r2(t)}" data-duration="${r2(p.dur + XFADE)}" data-media-start="${p.in}" data-track-index="1" data-hf-media-start-basis="local" muted playsinline style="z-index:${i + 1}"></video>`;
    p.start = r2(t);
    t += p.dur;
    return v;
  });
  const body = `      ${wordmark()}
      <div class="laptop" style="left:186px; top:150px; width:${sw + 32}px">
        <div class="lid"><div class="screen" style="width:${sw}px; height:${sh}px"><img src="${s.still}" alt=""></div></div>
        <div class="base"></div>
      </div>
      <div class="phone" style="left:1378px; top:96px; width:${pw + 24}px; height:${ph + 24}px"><div class="screen">${vids.join("")}</div></div>`;
  const anims = [`tl.fromTo("#${id}-v1", {opacity:0}, {opacity:1, duration:${XFADE}, ease:"none"}, ${s.phone[1].start});`];
  return sceneFile(id, body, anims, { fadeIn: true });
}

function arabicScene(s) {
  const id = s.id;
  const ww = 1180, wh = Math.round(ww * 9 / 16);
  const ph = 700, pw = Math.round(ph * (780 / 1688));
  const body = `      ${wordmark()}
      <div class="window" style="left:150px; top:118px; width:${ww}px; height:${wh}px"><video id="${id}-d" class="clip" src="assets/clips/${s.desktop.clip}.mp4" data-start="0" data-duration="${r2(s.dur + XFADE)}" data-media-start="${s.desktop.in}" data-track-index="1" data-hf-media-start-basis="local" muted playsinline></video></div>
      <div class="phone" style="left:1430px; top:104px; width:${pw + 24}px; height:${ph + 24}px"><div class="screen"><video id="${id}-p" class="clip" src="assets/clips/${s.phone.clip}.mp4" data-start="${s.phone.start}" data-duration="${r2(s.dur - s.phone.start)}" data-media-start="${s.phone.in}" data-track-index="2" data-hf-media-start-basis="local" muted playsinline></video></div></div>`;
  const anims = [`tl.fromTo("#${id}-p", {opacity:0}, {opacity:1, duration:${XFADE}, ease:"none"}, ${s.phone.start});`];
  return sceneFile(id, body, anims, { fadeIn: true });
}

function captionsFile() {
  const items = captions
    .map((c, i) => {
      const inner = Array.isArray(c.text) ? c.text.map((l) => `<span class="line">${esc(l)}</span>`).join("") : esc(c.text);
      return `    <div id="cap${i}" class="cap clip" data-start="${c.start}" data-duration="${r2(c.end - c.start)}" data-track-index="0"><div class="pill ${c.style}" id="cap${i}-p">${inner}</div></div>`;
    })
    .join("\n");
  const anims = captions.map((c, i) => {
    const d = r2(c.end - c.start);
    return `tl.fromTo("#cap${i}-p", {opacity:0, y:28}, {opacity:1, y:0, duration:0.35, ease:"power3.out"}, ${c.start});\n    tl.to("#cap${i}-p", {opacity:0, y:6, duration:0.18, ease:"power2.in"}, ${r2(c.start + d - 0.18)});`;
  });
  return `<template>
  <style>
${CSS}
    #root { pointer-events: none; }
  </style>
  <div id="root" data-composition-id="captions" data-width="${W}" data-height="${H}">
${items}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    ${anims.join("\n    ")}
    window.__timelines["captions"] = tl;
  </script>
</template>
`;
}

// ---------------------------------------------------------------------------
// Write everything
// ---------------------------------------------------------------------------

for (const s of SCENES) {
  const html = { hook: hookScene, app: appScene, devices: devicesScene, arabic: arabicScene, end: endScene }[s.kind](s);
  write(`compositions/${s.id}.html`, html);
}
write("compositions/captions.html", captionsFile());

const hosts = SCENES.map(
  (s, i) =>
    `      <div id="${s.id}" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html" data-start="${s.start}" data-duration="${s.hostDur}" data-track-index="1" data-track-kind="graphics" data-width="${W}" data-height="${H}" style="z-index:${i + 1}"></div>`,
).join("\n");

// One soft hit on each title card, alternating two takes.
const titleTimes = [];
for (const s of SCENES) for (const p of s.parts || []) if (p.kind === "title" && p.sfx) titleTimes.push(r2(s.start + p.start + 0.1));
const sfx = titleTimes
  .map((t, i) => `      <audio id="sfx${i}" src="${AUDIO.titleSfx[i % AUDIO.titleSfx.length]}" data-start="${t}" data-duration="${AUDIO.titleSfxDur[i % AUDIO.titleSfxDur.length]}" data-track-index="11" data-volume="${AUDIO.sfxVolume}"></audio>`)
  .join("\n");

write(
  "index.html",
  `<!doctype html>
<!-- Generated by build.mjs from scenes.mjs. Edit those, then run: node build.mjs -->
<html lang="ar">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="vendor/gsap.min.js"></script>
    <style>
${CSS}
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: var(--bg); }
      #main { position: relative; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="main" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="${W}" data-height="${H}" data-fps="30">
${hosts}
      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${TOTAL}" data-track-index="0" data-track-kind="captions" data-width="${W}" data-height="${H}" style="z-index:100"></div>
      <audio id="music" src="${AUDIO.music.file}" data-start="0" data-duration="${TOTAL}" data-track-index="10" data-volume="${AUDIO.music.volume}" data-fade-in="${AUDIO.music.fadeIn}" data-fade-out="${AUDIO.music.fadeOut}"></audio>
${sfx}
      <div id="font-error">FONTS NOT LOADED: Cairo / Figtree</div>
    </div>
    <script>
      // Fonts gate: the timeline is registered only once both bundled fonts have loaded.
      // If either fails, nothing renders except a red error frame, so a bad render cannot pass unnoticed.
      (async () => {
        const want = ["Cairo", "Figtree"];
        await Promise.all([
          document.fonts.load('800 42px "Cairo"', "بيبي"),
          document.fonts.load('800 42px "Figtree"', "Pulse 0123"),
        ]).catch(() => {});
        const loaded = (fam) => [...document.fonts].some((f) => f.family.replace(/"/g, "") === fam && f.status === "loaded");
        const missing = want.filter((f) => !loaded(f));
        window.__fontsLoaded = missing.length === 0;
        if (missing.length) {
          document.getElementById("font-error").style.display = "flex";
          throw new Error("Fonts not loaded: " + missing.join(", "));
        }
        window.__timelines["main"] = gsap.timeline({ paused: true });
      })();
    </script>
  </body>
</html>
`,
);

// ---------------------------------------------------------------------------
// STORYBOARD.md
// ---------------------------------------------------------------------------

const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
const sceneTitle = {
  hook: "Hook", dashboard: "Dashboard", booking: "Booking", reminder: "Reminder the day before",
  noreply: "No reply: call list", visitday: "Visit day: arrival and payment", doctor: "Doctor",
  consult: "Consultation and prescription", history: "History and privacy", devices: "Devices",
  arabic: "Arabic in one tap", end: "End card",
};
const capText = (t) => (Array.isArray(t) ? t.join(" / ") : t);
let md = `# Pulse promo: storyboard

Generated by \`video/composition/build.mjs\` from \`video/composition/scenes.mjs\`, so it always matches the composition. Edit \`scenes.mjs\`, then run \`node build.mjs\`.

- Total length: **${TOTAL.toFixed(2)} s** at 1920x1080, 30 fps.
- Scenes cross-fade over ${XFADE} s. Inside a scene, parts cross-fade over ${XFADE} s too.
- Clips are the sped-up copies in \`video/composition/assets/clips/\` (factors in \`speed-factors.json\`). "In" is the offset into that sped-up clip.
- Music: ${AUDIO.music.source} (${AUDIO.music.credit}), fade in ${AUDIO.music.fadeIn} s, fade out ${AUDIO.music.fadeOut} s. Soft sound effect on each title card only.

| # | Scene | Start | Length | Contents |
|---|---|---|---|---|
`;
for (const s of SCENES) {
  let contents = "";
  if (s.kind === "hook") contents = `Teal card, white text: ${CAPTIONS.hook}`;
  else if (s.kind === "end") contents = `Teal card: Pulse wordmark; ${CAPTIONS.tagline}; ${CAPTIONS.demo}; ${CAPTIONS.contactLead} ${CAPTIONS.contactNumber}`;
  else if (s.kind === "devices") contents = `Laptop frame (still from the start of S10c-arabic-switch) beside a phone frame playing ${s.phone.map((p) => `${p.clip} (in ${p.in} s, ${p.dur} s)`).join(" then ")}`;
  else if (s.kind === "arabic") contents = `Desktop window ${s.desktop.clip} (in ${s.desktop.in} s) beside a phone frame with ${s.phone.clip} (from ${s.phone.start} s)`;
  else
    contents = s.parts
      .map((p) => {
        if (p.kind === "clip") return `${p.clip} (in ${p.in} s, ${p.dur} s${p.zoom ? `, punch-in to ${Math.round(p.zoom.scale * 100)}% at ${p.zoom.at} s` : ""})`;
        if (p.kind === "chat") return `chat graphic "${p.chat}" (${p.dur} s)`;
        return `title card "${p.text}" (${p.dur} s)`;
      })
      .join(" → ");
  md += `| ${s.n} | ${sceneTitle[s.id]}${s.label ? ` · chip: ${s.label}` : ""} | ${fmt(s.start)} | ${s.dur.toFixed(1)} s | ${contents} |\n`;
}
md += `
## Captions (exact text and times)

| Scene | From | To | Style | Text |
|---|---|---|---|---|
`;
for (const c of captions) md += `| ${c.scene.n} | ${fmt(c.start)} | ${fmt(c.end)} | ${c.style || "pill"} | ${capText(c.text)} |\n`;
md += `
## Chat graphics

Generic messaging-app look built in HTML: green outgoing bubbles, white incoming bubbles, tick marks. No WhatsApp logo or trademarked assets. Header name: ${CHAT.clinicName}.

- **book** (scene 3): Ahmed sends "${CHAT.bookRequest}". The ticks turn blue.
- **remind** (scene 4): the clinic sends "${CHAT.reminder}" with buttons "${CHAT.confirm}" and "${CHAT.cancel}". Ahmed taps "${CHAT.confirm}" and his reply appears.
- **rx** (scene 8): a PDF card named "${CHAT.prescriptionFile}" arrives.
`;
writeFileSync(join(HERE, "../STORYBOARD.md"), md);

// One representative moment per scene for the preview board: the main caption fully in,
// or the scene's own moment where it has no caption.
const previews = SCENES.map((s) => {
  const caps = captions.filter((c) => c.scene === s && c.style !== "flash" && c.style !== "small");
  const c = caps[caps.length - 1];
  let t;
  if (s.kind === "hook") t = 1.5;
  else if (s.kind === "end") t = s.start + s.dur - 0.5;
  else if (s.parts && s.parts.some((p) => p.zoom)) {
    const p = s.parts.find((q) => q.zoom);
    t = s.start + p.start + p.zoom.at + 1.0;
  } else if (c) t = Math.min(c.end - 0.3, c.start + Math.max(1.2, (c.end - c.start) * 0.6));
  else t = s.start + s.dur / 2;
  return { scene: s.n, id: s.id, t: r2(t) };
});
let extras = captions.filter((c) => c.style === "flash" || c.style === "small").map((c) => ({ scene: c.scene.n, id: `${c.scene.id}-${c.style}`, t: r2(c.end - 0.4) }));
// Title cards and chat graphics, so the board shows every new visual.
for (const s of SCENES)
  (s.parts || []).forEach((p, i) => {
    if (p.kind === "title") extras.push({ scene: s.n, id: `${s.id}-title`, t: r2(s.start + p.start + 0.7) });
    if (p.kind === "chat") extras.push({ scene: s.n, id: `${s.id}-chat-${p.chat}`, t: r2(s.start + p.start + p.dur - 0.15) });
  });
writeFileSync(join(HERE, "preview-times.json"), JSON.stringify({ total: TOTAL, scenes: previews, extras, captions: captions.map((c) => ({ scene: c.scene.n, start: c.start, end: c.end, style: c.style, text: c.text })) }, null, 2) + "\n");

console.log(`Built ${SCENES.length} scenes + captions, total ${TOTAL} s, ${captions.length} captions, ${titleTimes.length} title SFX.`);
