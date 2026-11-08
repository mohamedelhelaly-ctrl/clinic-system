#!/bin/sh
# Prepares the non-clip assets deterministically:
#   - the laptop still for scene 10 (first frame of S10c)
#   - the music bed, copied from Brag's bundled audio and loudness-normalised (two-pass EBU R128)
#   - the title-card sound effects (Kenney, CC0, bundled with Brag)
# Run from anywhere: sh video/composition/prepare-assets.sh
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
BRAG=${BRAG_ASSETS:-$HOME/.claude/plugins/cache/brag/brag/0.5.0/skills/brag/assets}
TRACK=${TRACK:-happy-beats-business-moves-vol-12-by-ende-dot-app.mp3}
mkdir -p "$HERE/assets/stills" "$HERE/assets/audio"

ffmpeg -loglevel error -y -ss 0.05 -i "$HERE/assets/clips/S10c-arabic-switch.mp4" -frames:v 1 "$HERE/assets/stills/S10c-start.png"
# Last frames of the clips whose result screen is held after the footage ends (holdFrom in scenes.mjs).
for c in S04-reminder-confirmed S06b-payment S06d-lock-receptionist S09b-return-history; do
  ffmpeg -loglevel error -y -sseof -0.1 -i "$HERE/assets/clips/$c.mp4" -update 1 -frames:v 1 "$HERE/assets/stills/$c-end.png"
done

# Music: first 115 s of the track (it is 117 s long), normalised to -16 LUFS integrated, true peak -1.5 dBTP.
SRC="$BRAG/music/$TRACK"
STATS=$(ffmpeg -hide_banner -t 115 -i "$SRC" -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
val() { printf '%s' "$STATS" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
ffmpeg -loglevel error -y -t 115 -i "$SRC" \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11:linear=true:measured_I=$(val input_i):measured_TP=$(val input_tp):measured_LRA=$(val input_lra):measured_thresh=$(val input_thresh):offset=$(val target_offset),aresample=48000" \
  -c:a aac -b:a 256k "$HERE/assets/audio/music.m4a"

cp "$BRAG/sfx/impact/impactSoft_medium_001.ogg" "$HERE/assets/audio/sfx-soft-1.ogg"
cp "$BRAG/sfx/impact/impactSoft_medium_004.ogg" "$HERE/assets/audio/sfx-soft-2.ogg"
echo "Prepared still, music ($TRACK) and SFX."
