# Promo video clips

Records the screen clips for the promo video: one patient, Ahmed Samir, through
one appointment, with receptionist and doctor scenes, plus a short mobile and
Arabic close. Only the clips are made here; the video is assembled elsewhere.

```bash
npm run clips                          # all clips, twice from reset, compared
npm run clips -- S03a-register         # one clip
npm run clips -- S08a-visit-text S08b-prescription
npm run clips -- --runs 1              # all clips once (faster)
```

Run from the repository root. The script starts the web app on port 5184 if it
is not already running, and drives the installed **Google Chrome** (Playwright
`channel: 'chrome'`). It needs **system ffmpeg/ffprobe** on the `PATH`, and
network access to Google Fonts (Figtree, Noto Sans Arabic); a clip fails if
either font is not loaded.

## Output (`video/clips/`)

| Path                          | What                                                        | In git |
| ----------------------------- | ----------------------------------------------------------- | ------ |
| `<id>.mp4`                    | H.264, yuv420p, BT.709, 30 fps CFR, CRF 16, `+faststart`    | no     |
| `posters/<id>.png`            | Last frame                                                  | no     |
| `raw/<id>/`                   | Captured JPEG frames and the ffmpeg concat list             | no     |
| `contact-sheets/<id>.png`     | Frames at 0, 25, 50, 75 and 100 %                           | yes    |
| `contact-sheets/all-clips.png`| All clips on one sheet                                      | yes    |
| `manifest.json`               | Every clip: scene, actor, timeline, viewport, durations, snapshots, run results | yes |
| `REPORT.md`                   | Review report                                               | yes    |

Desktop clips: viewport 1440×810, deviceScaleFactor 2, output 2560×1440.
Phone clips: 390×844, deviceScaleFactor 2, output 780×1688.

## How a clip is recorded

Each clip in `clips.ts` declares:

- `needs` — the storage snapshot it starts from (`reset` = fresh seed data);
- `setup` — optional off-camera steps in a separate context (real UI or
  `window.__demo`), saved as a snapshot;
- `prepare` — off-camera navigation to the start screen in the recording context;
- `act` — the recorded action, paced like a person (`lib/human.ts`);
- `verify` — the end state; a mismatch fails the clip;
- `produces` — the snapshot later clips start from.

Running one clip rebuilds any missing snapshot by replaying its producer clip
unrecorded and without pauses. Snapshots live in `video/clips/.snapshots/`.

The app runs in recording mode (`?clean=1`): demo footer controls, the role
switcher and the "Demo: simulate" card are hidden (the Demo badge stays), tel:
links do not navigate, and `window.__demo` lets the script move the clock and
play patient replies off-camera (`apps/web/src/demo/recordingHooks.ts`).

`lib/overlay.js` (an init script, not app code) draws the cursor and click
ripple on desktop, a tap circle on phone, and hides scrollbars.

## Capture

Chrome's screencast, which Playwright's video uses, delivers frames at CSS
pixel size (1440×810) whatever the deviceScaleFactor, so it cannot give a sharp
2560×1440 file, and Playwright's own ffmpeg is not installed. `lib/capture.ts`
instead takes full-resolution screenshots continuously (about 20 per second on
desktop, 30 on phone), keeps each frame's timestamp, and lets ffmpeg build
constant 30 fps by holding each frame until the next.

## Checks (a failure fails the clip)

End state; no demo controls visible; no horizontal scroll or clipped text; no
console errors; both fonts loaded; duration within 1.5 s of the target;
2560×1440 or 780×1688 at 30 fps, H.264 yuv420p, non-empty and decodable. A full
run records everything twice from reset and fails any clip whose durations
differ by more than 0.5 s or that fails in either run.

## Pacing

Fixed values in `lib/human.ts` (`PACE`): cursor glide 380 ms, 400 ms before and
450 ms after each click, 45 ms per typed character, 900 ms smooth scrolls,
0.6 s hold at the start and at least 1.0 s at the end.
