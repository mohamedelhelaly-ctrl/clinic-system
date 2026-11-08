// Checks a rendered video against the brief and writes a contact sheet (one frame every 5 s).
// Usage: node tools/check-video.mjs <video.mp4> [--width 1920 --height 1080 --max-mb 16 --sheet out.png]
import { execFileSync, spawnSync } from "node:child_process";
import { statSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const file = args[0];
const opt = (k, d) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : d);
const W = Number(opt("width", 1920));
const H = Number(opt("height", 1080));
const maxMB = opt("max-mb", null);
const sheet = opt("sheet", null);
const every = Number(opt("every", 5));
// --project <dir> checks against another project (e.g. ../composition-vertical); default is this one.
const PROJECT = opt("project", null) ? join(process.cwd(), opt("project", null)) : ROOT;
const expected = JSON.parse(readFileSync(join(PROJECT, "preview-times.json"), "utf8")).total;

const run = (cmd, a) => execFileSync(cmd, a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 });
// ffmpeg filters report on stderr.
const ffmpegLog = (a) => {
  const r = spawnSync("ffmpeg", a, { encoding: "utf8", maxBuffer: 256 << 20 });
  return (r.stderr || "") + (r.stdout || "");
};

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

// --- container, streams -----------------------------------------------------
const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", file]));
const v = probe.streams.find((s) => s.codec_type === "video");
const a = probe.streams.find((s) => s.codec_type === "audio");
const dur = Number(probe.format.duration);
const [fn, fd] = v.r_frame_rate.split("/").map(Number);
const fps = fn / fd;
const sizeMB = statSync(file).size / (1024 * 1024);
check("resolution", v.width === W && v.height === H, `${v.width}x${v.height}`);
check("frame rate 30", Math.abs(fps - 30) < 0.01, `${fps.toFixed(3)} fps`);
check("video codec H.264", v.codec_name === "h264", `${v.codec_name} ${v.profile || ""} ${v.pix_fmt}`);
check("audio codec AAC", a && a.codec_name === "aac", a ? `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch` : "no audio stream");
check("duration matches composition", Math.abs(dur - expected) < 0.1, `${dur.toFixed(2)} s (composition ${expected} s)`);
// The brief targeted 70-90 s; the user then asked for longer holds (draft v2 ~92 s, v3 ~108 s; vertical ~108.6 s).
check("duration within 70-110 s (user-requested holds)", dur >= 70 && dur <= 110, `${dur.toFixed(2)} s`);
if (maxMB) check(`size <= ${maxMB} MB`, sizeMB <= Number(maxMB), `${sizeMB.toFixed(2)} MB`);
else check("size", true, `${sizeMB.toFixed(2)} MB`);
// +faststart: the moov atom comes before mdat.
const head = readFileSync(file).subarray(0, 4 << 20).toString("latin1");
const moov = head.indexOf("moov");
const mdat = head.indexOf("mdat");
check("+faststart (moov before mdat)", moov !== -1 && (mdat === -1 || moov < mdat), `moov@${moov} mdat@${mdat}`);

// --- black frames: only allowed as short dips inside fades -------------------
const black = [...ffmpegLog(["-hide_banner", "-i", file, "-vf", "blackdetect=d=0.1:pix_th=0.10", "-an", "-f", "null", "-"]).matchAll(/black_start:([\d.]+) black_end:([\d.]+) black_duration:([\d.]+)/g)].map((m) => m.slice(1).map(Number));
check("no black frames (>=0.1 s)", black.length === 0, black.length ? black.map((b) => `${b[0]}-${b[1]}`).join(", ") : "none");

// --- red font-error frame (the fonts gate) ------------------------------------
const sig = ffmpegLog(["-hide_banner", "-i", file, "-vf", "fps=2,scale=64:36,signalstats,metadata=print:key=lavfi.signalstats.VAVG", "-an", "-f", "null", "-"]);
const vavg = [...sig.matchAll(/VAVG=([\d.]+)/g)].map((m) => Number(m[1]));
const red = vavg.filter((x) => x > 175).length;
check("no font-error (red) frames", red === 0, `${red} of ${vavg.length} sampled frames`);

// --- audio --------------------------------------------------------------------
if (a) {
  const eb = ffmpegLog(["-hide_banner", "-nostats", "-i", file, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const summary = eb.slice(eb.lastIndexOf("Summary:"));
  const I = Number((summary.match(/I:\s+(-?[\d.]+) LUFS/) || [])[1]);
  const TP = Number((summary.match(/Peak:\s+(-?[\d.]+) dBFS/) || [])[1]);
  check("integrated loudness -16 LUFS (±1)", Math.abs(I + 16) <= 1, `${I} LUFS`);
  check("true peak <= -1 dBTP", TP <= -1, `${TP} dBTP`);
  const st = ffmpegLog(["-hide_banner", "-nostats", "-i", file, "-vn", "-af", "astats=metadata=0", "-f", "null", "-"]);
  const peakLevel = Number((st.match(/Overall[\s\S]*?Peak level dB:\s+(-?[\d.]+)/) || [])[1]);
  const flat = Number((st.match(/Overall[\s\S]*?Flat factor:\s+(-?[\d.]+)/) || [])[1]);
  check("no clipped samples", peakLevel < -0.1, `sample peak ${peakLevel} dBFS, flat factor ${flat}`);
}

// --- contact sheet: one frame every 5 s --------------------------------------
if (sheet) {
  const n = Math.floor(dur / every) + 1;
  const cols = H > W ? 7 : 5;
  const rows = Math.ceil(n / cols);
  run("ffmpeg", ["-v", "error", "-y", "-i", file, "-vf", `fps=1/${every},scale=${H > W ? 220 : 384}:-1,pad=iw+8:ih+8:4:4:white,tile=${cols}x${rows}`, "-frames:v", "1", sheet]);
  check("contact sheet written", true, `${sheet} (${n} frames, one every ${every} s)`);
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}: ${r.detail}`);
}
console.log(failed ? `${failed} check(s) failed` : "All checks passed.");
process.exit(failed ? 1 : 0);
