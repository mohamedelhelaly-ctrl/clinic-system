#!/usr/bin/env python3
"""Deterministic speed-ups of the recorded clips into assets/clips/.

speed = duration / briefTargetDuration from video/clips/manifest.json, capped at 3x
(the manifest has no suggested_speed_factor). Factors under 1.1 are left at 1x.
Frames are dropped by setpts + fps=30 (no interpolation), so taps stay crisp.
"""
import json, subprocess, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "video/composition/assets/clips"
OUT.mkdir(parents=True, exist_ok=True)
manifest = json.loads((ROOT / "video/clips/manifest.json").read_text())
factors = {}
for c in manifest["clips"]:
    f = min(3.0, c["duration"] / c["briefTargetDuration"])
    f = 1.0 if f < 1.1 else round(f, 2)
    factors[c["id"]] = {"speed": f, "source": c["duration"], "out": round(c["duration"] / f, 2), "resolution": c["resolution"]}
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(ROOT / c["file"]), "-an",
                    "-vf", f"setpts=PTS/{f},fps=30", "-c:v", "libx264", "-preset", "slow", "-crf", "12",
                    "-pix_fmt", "yuv420p", "-g", "15", "-movflags", "+faststart",
                    str(OUT / f'{c["id"]}.mp4')], check=True)
(OUT / "speed-factors.json").write_text(json.dumps(factors, indent=2) + "\n")
for k, v in factors.items(): print(k, v)
