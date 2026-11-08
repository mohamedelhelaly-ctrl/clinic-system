// Generates the vertical (1080x1920) composition from scenes-vertical.mjs and camera.json:
// index.html, compositions/*.html, preview-times.json and ../STORYBOARD-vertical.md.
// Edit those two files (or styles-vertical.css), then run:  node build-vertical.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENES, XFADE, CAPTIONS, CHAT, AUDIO } from "./scenes-vertical.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 1080;
const H = 1920;
const read = (p) => readFileSync(join(HERE, p), "utf8");
const write = (p, s) => {
  mkdirSync(dirname(join(HERE, p)), { recursive: true });
  writeFileSync(join(HERE, p), s);
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const r2 = (n) => Math.round(n * 1000) / 1000;
const CSS = read("../composition/brand.css") + "\n" + read("styles-vertical.css");
const CAM = JSON.parse(read("camera.json"));
const CLIP_LEN = JSON.parse(read("assets/clips/speed-factors.json"));
const SRC_W = 2560;
const SRC_H = 1440;
const CARD_CY = CAM.card.areaTop + CAM.card.areaHeight / 2; // card centre stays here; only its height changes

// ---------------------------------------------------------------------------
// Timing (identical rules to the landscape build)
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
// Checks
// ---------------------------------------------------------------------------

function checkMedia(clip, from, used, where) {
  const len = CLIP_LEN[clip].out;
  if (from + used > len + 0.02) throw new Error(`${where}: ${clip} needs ${r2(from + used)} s but the clip is ${len} s`);
}
function checkKey(k, where) {
  const half = (v) => v / 2 / k.s;
  const errs = [];
  if (k.s < k.h / SRC_H - 1e-6) errs.push(`scale ${k.s} below ${r2(k.h / SRC_H)} leaves empty rows for card height ${k.h}`);
  if (k.cx < half(1000) - 0.5 || k.cx > SRC_W - half(1000) + 0.5) errs.push(`cx ${k.cx} outside ${Math.ceil(half(1000))}..${Math.floor(SRC_W - half(1000))}`);
  if (k.cy < half(k.h) - 0.5 || k.cy > SRC_H - half(k.h) + 0.5) errs.push(`cy ${k.cy} outside ${Math.ceil(half(k.h))}..${Math.floor(SRC_H - half(k.h))}`);
  if (k.h < 560 || k.h > CAM.card.areaHeight) errs.push(`card height ${k.h} outside 560..${CAM.card.areaHeight}`);
  if (k.s > 1.4) errs.push(`scale ${k.s} above 1.4`);
  if (errs.length) throw new Error(`camera ${where} t=${k.t}: ${errs.join("; ")}`);
}

// ---------------------------------------------------------------------------
// Logo (same placeholder as the landscape build)
// ---------------------------------------------------------------------------

function logoSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 262 80" role="img" aria-label="Pulse" direction="ltr" style="direction:ltr"><path d="M4 41 H22 L30 22 L40 60 L48 41 H70" fill="none" stroke="${color}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><text x="74" y="62" direction="ltr" text-anchor="start" font-family="Figtree, sans-serif" font-weight="800" font-size="64" letter-spacing="-1.5" fill="${color}">Pulse</text></svg>`;
}
const wordmark = () => `<div class="wordmark" data-layout-allow-overlap>${logoSvg("#0e7c7b")}</div>`;

// ---------------------------------------------------------------------------
// Chat graphics, portrait
// ---------------------------------------------------------------------------

const ticks = (id, read = false, hidden = false) =>
  `<svg class="ticks" id="${id}" viewBox="0 0 18 11"${hidden ? ' style="display:none"' : ""}><path d="M1 6 L4.5 9.5 L11 2" fill="none" stroke="${read ? "#3d9be0" : "#8a9795"}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 9.5 L7 9.9 L16.5 1.5" fill="none" stroke="${read ? "#3d9be0" : "#8a9795"}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function msgApp(id, body) {
  return `<div class="msg-app">
      <div class="msg-head">
        <svg width="42" height="42" viewBox="0 0 24 24"><path d="M9 5 L16 12 L9 19" fill="none" stroke="#102322" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <div class="avatar"><svg width="48" height="48" viewBox="0 0 26 26"><circle cx="13" cy="9" r="5" fill="#0e7c7b"/><path d="M3 24 C4 17 22 17 23 24 Z" fill="#0e7c7b"/></svg></div>
        <div class="name">${esc(CHAT.clinicName)}</div>
      </div>
      <div class="msg-body" id="${id}-body">${body}</div>
      <div class="msg-input"><div class="field"></div><div class="send"><svg width="42" height="42" viewBox="0 0 24 24"><path d="M3 12 L21 4 L15 20 L11 13 Z" fill="#fff"/></svg></div></div>
    </div>`;
}

// Same beats as the landscape chats (the reminder tap at +1.9 s), laid out for portrait.
function chatGraphic(kind, id) {
  const pop = (sel, t) => `tl.fromTo("${sel}", {opacity:0, y:34, scale:0.96}, {opacity:1, y:0, scale:1, duration:0.4, ease:"power3.out"}, ${r2(t)});`;
  if (kind === "book") {
    return {
      body: `<div class="bubble out" id="${id}-b1">${esc(CHAT.bookRequest)}<div class="meta" data-layout-ignore>10:12 ${ticks(`${id}-t1g`)}${ticks(`${id}-t1b`, true, true)}</div></div>`,
      anim: (t) => [pop(`#${id}-b1`, t + 0.35), `tl.set("#${id}-t1g", {display:"none"}, ${r2(t + 1.3)}); tl.set("#${id}-t1b", {display:"block"}, ${r2(t + 1.3)});`],
    };
  }
  if (kind === "remind") {
    return {
      body: `<div class="bubble in" id="${id}-b1">${esc(CHAT.reminder).replace("د. ", "د.&nbsp;")}<div class="meta" data-layout-ignore>11:00</div>
        <div class="actions"><span id="${id}-ok"><i class="ripple" id="${id}-rip"></i>${esc(CHAT.confirm)}</span><span>${esc(CHAT.cancel)}</span></div></div>
      <div class="bubble out" id="${id}-b2">${esc(CHAT.confirm)}<div class="meta" data-layout-ignore>11:02 ${ticks(`${id}-t2g`)}${ticks(`${id}-t2b`, true, true)}</div></div>`,
      anim: (t) => [
        `tl.set("#${id}-b2", {display:"none"}, 0);`,
        pop(`#${id}-b1`, t + 0.3),
        `tl.fromTo("#${id}-rip", {scale:0, opacity:0}, {scale:1, opacity:1, duration:0.35, ease:"power2.out"}, ${r2(t + 1.9)});`,
        `tl.to("#${id}-rip", {opacity:0, duration:0.3, ease:"power1.in"}, ${r2(t + 2.25)});`,
        `tl.set("#${id}-b2", {display:"block"}, ${r2(t + 2.4)});`,
        pop(`#${id}-b2`, t + 2.4),
        `tl.set("#${id}-t2g", {display:"none"}, ${r2(t + 3.0)}); tl.set("#${id}-t2b", {display:"block"}, ${r2(t + 3.0)});`,
      ],
    };
  }
  return {
    body: `<div class="bubble in" id="${id}-b1"><div class="file"><div class="doc" data-layout-ignore>PDF</div><div><div class="fname">${esc(CHAT.prescriptionFile)}</div><div class="ftype" data-layout-ignore>PDF</div></div></div><div class="meta" data-layout-ignore>11:20</div></div>`,
    anim: (t) => [pop(`#${id}-b1`, t + 0.35)],
  };
}

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

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

const camState = (k) => ({ x: r2(-k.cx * k.s), y: r2(-k.cy * k.s), scale: k.s });
const cardBox = (h) => ({ top: r2(CARD_CY - h / 2), height: h });
const camUsed = new Set();

function camFor(key, where) {
  const c = CAM.parts[key];
  if (!c) throw new Error(`camera.json has no entry for ${key} (${where})`);
  camUsed.add(key);
  c.keys.forEach((k) => checkKey(k, key));
  return c;
}

function appScene(s) {
  const id = s.id;
  const anims = [];
  const layers = [];
  const cams = [];
  const cardKeys = []; // [time, h] for the card height
  let z = 2;
  s.parts.forEach((p, i) => {
    const pid = `${id}-p${i}`;
    const prev = s.parts[i - 1];
    const next = s.parts[i + 1];
    const elDur = r2(p.dur + XFADE);
    if (p.kind === "clip") {
      const rate = p.rate || 1;
      const vidDur = p.holdFrom != null ? r2(p.holdFrom + 0.05) : elDur;
      checkMedia(p.clip, p.in, vidDur * rate, `${id} part ${i}`);
      const cam = camFor(`${id}/p${i}`, `${id} part ${i}`);
      if (cam.clip !== p.clip) throw new Error(`camera ${id}/p${i} is for ${cam.clip}, the part plays ${p.clip}`);
      const rateAttr = rate !== 1 ? ` data-playback-rate="${rate}"` : "";
      const hold = p.holdFrom != null
        ? `<img id="${pid}-hold" class="clip" src="assets/stills/${p.clip}-end.png" alt="" data-start="${r2(p.start + p.holdFrom)}" data-duration="${r2(elDur - p.holdFrom)}" data-track-index="2">`
        : "";
      cams.push(`        <div class="cam-wrap" id="${pid}-w" style="position:absolute;inset:0;z-index:${z++}"><div style="position:absolute;left:50%;top:50%;width:0;height:0"><div class="cam" id="${pid}-cam">${hold}<video id="${pid}" class="clip" src="assets/clips/${p.clip}.mp4" data-start="${p.start}" data-duration="${vidDur}" data-media-start="${p.in}"${rateAttr} data-track-index="1" data-hf-media-start-basis="local" muted playsinline style="z-index:1"></video></div></div></div>`);
      if (prev && prev.kind === "clip" && !p.join) anims.push(`tl.fromTo("#${pid}-w", {opacity:0}, {opacity:1, duration:${XFADE}, ease:"none"}, ${p.start});`);
      if (prev && prev.kind === "clip" && p.join) anims.push(`tl.set("#${pid}-w", {opacity:1}, ${p.start});`);
      // Camera path: set the first framing at the part start, then arrive at each later key at its time.
      const [k0, ...rest] = cam.keys;
      anims.push(`tl.set("#${pid}-cam", ${JSON.stringify(camState(k0))}, ${r2(p.start)});`);
      cardKeys.push({ t: p.start, h: k0.h, move: prev && prev.kind === "clip" ? 0.5 : 0 });
      for (const k of rest) {
        const at = r2(p.start + k.t - CAM.move);
        anims.push(`tl.to("#${pid}-cam", {...${JSON.stringify(camState(k))}, duration:${CAM.move}, ease:"power2.inOut"}, ${at});`);
        cardKeys.push({ t: at, h: k.h, move: CAM.move });
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

  // Card height follows the camera keys; its centre never moves.
  let lastH = null;
  for (const ck of cardKeys) {
    if (lastH === null) anims.push(`tl.set("#${id}-card", ${JSON.stringify(cardBox(ck.h))}, 0);`);
    else if (ck.h !== lastH) {
      if (ck.move) anims.push(`tl.to("#${id}-card", {...${JSON.stringify(cardBox(ck.h))}, duration:${ck.move}, ease:"power2.inOut"}, ${r2(ck.t)});`);
      else anims.push(`tl.set("#${id}-card", ${JSON.stringify(cardBox(ck.h))}, ${r2(ck.t)});`);
    }
    lastH = ck.h;
  }

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
  const firstH = cardKeys.length ? cardKeys[0].h : 1000;
  const body = `      ${wordmark()}
${chipHtml}
      <div class="card-app" id="${id}-card" style="top:${cardBox(firstH).top}px;height:${firstH}px">
${cams.join("\n")}
      </div>
${layers.join("\n")}`;
  return sceneFile(id, body, anims);
}

function hookScene(s) {
  const id = s.id;
  const body = `      <div class="card teal"><div class="card-text">${esc(CAPTIONS.hook)}</div></div>`;
  return sceneFile(id, body, [], { fadeIn: false });
}

function endScene(s) {
  const id = s.id;
  const body = `      <div class="card teal">
        <div class="end-stack">
          <div class="logo" id="${id}-logo">${logoSvg("#ffffff")}</div>
          <div class="tagline" id="${id}-tag">${esc(CAPTIONS.tagline)}</div>
          <div class="demo" id="${id}-demo">${esc(CAPTIONS.demo)}</div>
          <div class="contact" id="${id}-contact"><span class="lead">${esc(CAPTIONS.contactLead)}</span><span class="num">${esc(CAPTIONS.contactNumber)}</span></div>
        </div>
      </div>
      <div class="credit" id="${id}-credit">${esc(AUDIO.music.credit)}</div>`;
  const anims = [
    `tl.fromTo("#${id}-logo", {opacity:0, y:22}, {opacity:1, y:0, duration:0.5, ease:"power3.out"}, 0.15);`,
    `tl.fromTo("#${id}-tag", {opacity:0, filter:"blur(8px)"}, {opacity:1, filter:"blur(0px)", duration:0.35, ease:"power3.out"}, 0.35);`,
    `tl.fromTo("#${id}-demo", {opacity:0, filter:"blur(8px)"}, {opacity:1, filter:"blur(0px)", duration:0.35, ease:"power3.out"}, 0.5);`,
    `tl.fromTo("#${id}-contact", {opacity:0, y:26}, {opacity:1, y:0, duration:0.45, ease:"power3.out"}, 0.65);`,
    `tl.fromTo("#${id}-credit", {opacity:0}, {opacity:1, duration:0.4, ease:"none"}, 0.9);`,
  ];
  return sceneFile(id, body, anims);
}

function devicesScene(s) {
  const id = s.id;
  // Laptop (still from the start of S10c) with the phone in front, overlapping its lower right.
  const sw = 868, sh = Math.round(sw * 9 / 16);
  const ph = 760, pw = Math.round(ph * (780 / 1688));
  let t = 0;
  const vids = s.phone.map((p, i) => {
    checkMedia(p.clip, p.in, p.dur + XFADE, `${id} phone ${i}`);
    const v = `<video id="${id}-v${i}" class="clip" src="assets/clips/${p.clip}.mp4" data-start="${r2(t)}" data-duration="${r2(p.dur + XFADE)}" data-media-start="${p.in}" data-track-index="1" data-hf-media-start-basis="local" muted playsinline style="z-index:${i + 1}"></video>`;
    p.start = r2(t);
    t += p.dur;
    return v;
  });
  const body = `      ${wordmark()}
      <div class="laptop" style="left:80px; top:300px; width:${sw + 32}px">
        <div class="lid"><div class="screen" style="width:${sw}px; height:${sh}px"><img src="${s.still}" alt=""></div></div>
        <div class="base"></div>
      </div>
      <div class="phone" style="left:${1040 - pw - 24}px; top:${1340 - ph - 24}px; width:${pw + 24}px; height:${ph + 24}px"><div class="screen">${vids.join("")}</div></div>`;
  const anims = [`tl.fromTo("#${id}-v1", {opacity:0}, {opacity:1, duration:${XFADE}, ease:"none"}, ${s.phone[1].start});`];
  return sceneFile(id, body, anims);
}

function arabicScene(s) {
  const id = s.id;
  const cam = camFor("arabic/desktop", id);
  const k = cam.keys[0];
  checkMedia(s.desktop.clip, s.desktop.in, s.dur + XFADE, `${id} desktop`);
  const ph = 600, pw = Math.round(ph * (780 / 1688));
  const top = CAM.card.areaTop + 20;
  const body = `      ${wordmark()}
      <div class="card-app" style="top:${top}px;height:${k.h}px"><div style="position:absolute;left:50%;top:50%;width:0;height:0"><div class="cam" id="${id}-cam"><video id="${id}-d" class="clip" src="assets/clips/${s.desktop.clip}.mp4" data-start="0" data-duration="${r2(s.dur + XFADE)}" data-media-start="${s.desktop.in}" data-track-index="1" data-hf-media-start-basis="local" muted playsinline></video></div></div></div>
      <div class="phone" id="${id}-phone" style="left:60px; top:${1340 - ph - 24}px; width:${pw + 24}px; height:${ph + 24}px; z-index:5"><div class="screen"><video id="${id}-p" class="clip" src="assets/clips/${s.phone.clip}.mp4" data-start="${s.phone.start}" data-duration="${r2(s.dur - s.phone.start)}" data-media-start="${s.phone.in}" data-track-index="2" data-hf-media-start-basis="local" muted playsinline></video></div></div>`;
  const anims = [
    `tl.set("#${id}-cam", ${JSON.stringify(camState(k))}, 0);`,
    `tl.fromTo("#${id}-phone", {opacity:0}, {opacity:1, duration:${XFADE}, ease:"none"}, ${s.phone.start});`,
  ];
  return sceneFile(id, body, anims);
}

function captionsFile() {
  const items = captions
    .map((c, i) => {
      const inner = Array.isArray(c.text) ? c.text.map((l) => `<span class="line">${esc(l)}</span>`).join("") : esc(c.text);
      return `    <div id="cap${i}" class="cap clip" data-start="${c.start}" data-duration="${r2(c.end - c.start)}" data-track-index="0"><div class="cap-text ${c.style}" id="cap${i}-p">${inner}</div></div>`;
    })
    .join("\n");
  const anims = captions.map((c, i) => {
    const d = r2(c.end - c.start);
    return `tl.fromTo("#cap${i}-p", {opacity:0, y:30}, {opacity:1, y:0, duration:0.35, ease:"power3.out"}, ${c.start});\n    tl.to("#cap${i}-p", {opacity:0, y:6, duration:0.18, ease:"power2.in"}, ${r2(c.start + d - 0.18)});`;
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
const unused = Object.keys(CAM.parts).filter((k) => !camUsed.has(k));
if (unused.length) throw new Error(`camera.json entries not used by any part: ${unused.join(", ")}`);

const hosts = SCENES.map(
  (s, i) =>
    `      <div id="${s.id}" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html" data-start="${s.start}" data-duration="${s.hostDur}" data-track-index="1" data-track-kind="graphics" data-width="${W}" data-height="${H}" style="z-index:${i + 1}"></div>`,
).join("\n");

const titleTimes = [];
for (const s of SCENES) for (const p of s.parts || []) if (p.kind === "title" && p.sfx) titleTimes.push(r2(s.start + p.start + 0.1));
const sfx = titleTimes
  .map((t, i) => `      <audio id="sfx${i}" src="${AUDIO.titleSfx[i % AUDIO.titleSfx.length]}" data-start="${t}" data-duration="${AUDIO.titleSfxDur[i % AUDIO.titleSfxDur.length]}" data-track-index="11" data-volume="${AUDIO.sfxVolume}"></audio>`)
  .join("\n");

write(
  "index.html",
  `<!doctype html>
<!-- Generated by build-vertical.mjs from scenes-vertical.mjs and camera.json. Edit those, then run: node build-vertical.mjs -->
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
      <div id="font-error">FONTS NOT LOADED:<br>Cairo / Figtree</div>
    </div>
    <script>
      // Fonts gate: the timeline is registered only once both bundled fonts have loaded.
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
// Preview moments, caption table, storyboard
// ---------------------------------------------------------------------------

// Per scene: first frame (after the fade), the key moment, and the last frame (before the cross-fade).
// The key moment is 0.6 s after the camera settles in the part that carries the scene's key element.
const KEY_PART = { dashboard: 0, booking: 1, reminder: 2, noreply: 1, visitday: 1, doctor: 1, consult: 0, history: 1 };
const keyMoment = (s) => {
  if (s.kind === "hook") return 1.5;
  if (s.kind === "end") return s.start + s.dur - 0.5;
  if (s.kind === "devices" || s.kind === "arabic") return s.start + s.dur * 0.55;
  const i = KEY_PART[s.id];
  const p = s.parts[i];
  const k = CAM.parts[`${s.id}/p${i}`].keys.at(-1);
  return s.start + p.start + (k.t === 0 ? p.dur * 0.7 : Math.min(p.dur - 0.2, k.t + 0.6));
};
const previews = SCENES.map((s) => ({
  scene: s.n,
  id: s.id,
  first: r2(s.start + (s.kind === "hook" ? 0 : XFADE + 0.05)),
  key: r2(keyMoment(s)),
  last: r2(s.start + s.dur - (s.n === SCENES.length ? 0.05 : XFADE + 0.05)), // before the next scene starts fading in
}));
writeFileSync(
  join(HERE, "preview-times.json"),
  JSON.stringify({ total: TOTAL, scenes: previews, captions: captions.map((c) => ({ scene: c.scene.n, start: c.start, end: c.end, style: c.style, text: c.text })) }, null, 2) + "\n",
);

const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
const capText = (t) => (Array.isArray(t) ? t.join(" / ") : t);
let md = `# Pulse promo, vertical (1080x1920): storyboard

Generated by \`video/composition-vertical/build-vertical.mjs\` from \`scenes-vertical.mjs\` (which reuses the approved landscape v3 \`../composition/scenes.mjs\`) and \`camera.json\`. Do not edit by hand.

- Total length: **${TOTAL.toFixed(2)} s** at 1080x1920, 30 fps.
- Same story, order, captions, clips, speed-ups, holds and music as the landscape v3. Vertical-only change: the privacy part (S06d) runs 4.5 s so its line is on screen at least 4 s, at the normal caption size.
- Desktop clips are shown through a virtual camera (crop and scale per key frame in \`camera.json\`).

| # | Scene | Start | Length |
|---|---|---|---|
`;
for (const s of SCENES) md += `| ${s.n} | ${s.id} | ${fmt(s.start)} | ${s.dur.toFixed(2)} s |\n`;
md += `
## Captions

| Scene | From | To | On screen | Text |
|---|---|---|---|---|
`;
for (const c of captions) md += `| ${c.scene.n} | ${fmt(c.start)} | ${fmt(c.end)} | ${(c.end - c.start).toFixed(2)} s | ${capText(c.text)} |\n`;
md += `
## Camera (from camera.json)

| Part | Clip | Key element | Key frames (t: centre @ scale, card height) |
|---|---|---|---|
`;
for (const [k, v] of Object.entries(CAM.parts)) md += `| ${k} | ${v.clip} | ${v.key} | ${v.keys.map((x) => `${x.t}s: (${x.cx}, ${x.cy}) @ ${x.s}, h ${x.h}`).join("; ")} |\n`;
writeFileSync(join(HERE, "../STORYBOARD-vertical.md"), md);

console.log(`Built ${SCENES.length} scenes + captions, total ${TOTAL} s, ${captions.length} captions, camera parts ${camUsed.size}.`);
