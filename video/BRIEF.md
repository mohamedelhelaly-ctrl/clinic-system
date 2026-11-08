# Pulse promo video: brief and progress

The brief is copied verbatim below. The progress note is at the end. A new session should read this whole file first.

---

## Brief (verbatim)

You are building a promo video for a clinic management DEMO called "Pulse" (working name). The screen-recorded clips already exist. Your job in this task is to assemble them into a finished video with Arabic captions, graphics and music. Do not re-record clips and do not change the app.

INPUTS
- Clips: video/clips/*.mp4 (23 clips, S02 through S10d), with video/clips/manifest.json (durations, viewport, suggested_speed_factor) and video/clips/REPORT.md. Desktop clips are 2560x1440; phone clips are 780x1688.
- Brand: white and teal #0e7c7b. Name: Pulse. Tagline: نظام بسيط لإدارة العيادات. Contact: WhatsApp 01094176420.
- No voiceover. The video must work with the sound off; Arabic captions carry the story.

OUTPUT
- Main video: 1920x1080, 30 fps, landscape 16:9, H.264 + AAC, +faststart, target 70 to 90 seconds (report the actual length). Save as video/pulse-promo.mp4.
- Share version: 1280x720, 16 MB or less so it plays inline on WhatsApp, as video/pulse-promo-share.mp4.
- A poster frame (the best frame) as video/pulse-promo-poster.png.
- video/share-copy.md: a short Arabic post caption in Egyptian dialect, ending with the link wa.me/201094176420.
- The composition source (HTML/CSS/JS), assets and brand tokens in video/composition/, so I can re-render after changes.
- Do NOT build the 30-second teaser yet.

TOOLS AND SETUP
- Use HyperFrames as the builder (Node.js 22+ and FFmpeg on PATH). Install its Claude Code plugin per its README (claude plugin marketplace add heygen-com/hyperframes, then claude plugin install hyperframes@hyperframes) and run npx hyperframes doctor. Ask before installing anything. If a step needs me to run a slash command, give me the exact command and wait.
- Use Brag ONLY for its bundled music and sound effects (install from the latent-spaces/brag repo following its README; use the full variant, since the slim one has no bundled assets). Do NOT let Brag re-plan the story or the scenes. List the bundled tracks, choose a calm, warm, non-dramatic one that suits a clinic product, read the license terms of the bundled audio and tell me what they allow, and let me approve the track before the final render.
- Fonts: bundle an Arabic font (Noto Sans Arabic or Cairo, SIL OFL) and Figtree (the app's font) inside video/composition/fonts/. Do not rely on network fonts. Assert fonts are loaded before every render.
- Arabic must render with correctly joined letters and right-to-left order everywhere. Verify this by extracting and viewing frames; this is a common failure in renderers.

DESIGN
- Teal #0e7c7b with white text for the hook and the end card. App scenes on a near-white background with a faint teal tint. Captions: a rounded pill at the bottom, dark teal text on white or white on teal, minimum contrast 4.5:1, in right-to-left alignment, never more than two lines, with generous margins (keep 5% of the frame free on all sides). Derive one darker teal and one light tint from #0e7c7b and document them in video/composition/brand.css.
- Desktop clips go inside a rounded window frame (soft shadow, no fake address bar), centered at about 70% of the frame width. Phone clips go inside a simple phone frame.
- Small Pulse wordmark in the top-left corner on all app scenes. Scene labels (such as "الحجز", "الدكتور") as small teal chips in the top-right.
- Logo: a clean text wordmark "Pulse" in teal with a simple, understated mark, such as a minimal pulse line integrated into the wordmark; no caduceus, cross or stethoscope. Save as SVG in video/composition/assets/. It is a placeholder I will replace later.
- Motion: gentle fades, caption slide-ins of 300 to 400 ms, and slow punch-ins (up to 130 percent) on the key UI area in these scenes: S03a (the auto-filled age), S06a (the "Payment required" message), S07b (the allergy warning), S09b (allergy and previous visit). Use the high-resolution clips so zooms stay sharp. No flashy transitions.
- Speed-ups: apply suggested_speed_factor from manifest.json to the long clips (cap at 3x) with ffmpeg setpts into video/composition/assets/, so the result is deterministic. Typing sped up is fine; taps should still read clearly.
- WhatsApp-style chat graphics are built in HTML, not recorded. Do NOT use the WhatsApp logo or any trademarked assets; build a generic chat-bubble look (green outgoing bubbles, ticks) that reads as a messaging app.

SCENES, IN ORDER (captions are final; do not edit the Arabic text, and ask me before changing any)
1. Hook (about 3 s), deep teal background, white text: لسه بتدير عيادتك بالورق والواتساب؟
2. S02-dashboard. Caption: يوم عيادتك كله قدامك في شاشة واحدة
3. Chat graphic: Ahmed asks to book (a message in Egyptian Arabic, for example "السلام عليكم، عايز أحجز كشف بكرة"); then S03a-register, S03b-book, S03c-roster-scheduled. Label: الحجز. Caption: مريض جديد؟ تسجّله وتحجزله في أقل من دقيقة
4. Title card: قبل الميعاد بيوم. Then a reminder chat graphic (Arabic text: تذكير: عندك ميعاد بكرة الساعة 11:00 مع د. كريم عادل, with two buttons تأكيد and إلغاء; Ahmed taps تأكيد), then S04-reminder-confirmed. Caption: التذكير بيتبعت لوحده على واتساب، والمريض بيأكّد بضغطة
5. Title card: ولو ما ردّش؟ Then S05a-needs-call, S05b-call-list. Caption: كلّمه من قايمة المكالمات وأكّد الميعاد بضغطة. One-second flash line: لو لغى على واتساب، الميعاد بيتفضّى لوحده
6. Title card: يوم الكشف. Then S06a-arrival-gate, S06b-payment, S06c-packages. Two-line caption: الدفع قبل ما المريض يدخل للدكتور / كشف واحد أو باقة، والسيستم بيحسبلك الزيارات
7. Label: الدكتور. Then S07a-doctor-dashboard, S07b-calendar-appointment. Caption: الدكتور شايف يومه، والمريض وحساسيته قدامه على طول
8. S08a-visit-text with caption: اكتب الشكوى والتشخيص والعلاج في 3 خانات بس. Then S08b-prescription, S08c-prescription-sent with caption: والروشتة بتوصل للمريض على واتساب لوحدها, plus a chat graphic showing the prescription arriving as a PDF card named "روشتة - أحمد سمير". Then S08d-complete.
9. S09a-history-saved, then S06d-lock-receptionist with the small line: الملاحظات الطبية بتظهر للدكتور بس. Then title card: بعد 3 شهور. Then S09b-return-history. Caption: كل زيارة بتتسجل، والتاريخ المرضي جاهز قبل ما المريض يدخل
10. Devices: a laptop frame (a still from the start of S10c) next to a phone frame playing S10a-phone-roster and then S10b-phone-booking. Caption: بيشتغل على الكمبيوتر والموبايل. Then S10c-arabic-switch full width on desktop (and S10d-arabic-phone in a phone frame beside it if it fits). Caption: وبضغطة واحدة يبقى كله بالعربي
11. End card, deep teal: the Pulse wordmark, the tagline نظام بسيط لإدارة العيادات, the line نسخة تجريبية.. وبندوّر على عيادات تجرّب معانا, and the line مهتم؟ كلّمنا على واتساب: 01094176420 (large and easy to read).
- Numbers use Western digits throughout.
- Write all of this into video/STORYBOARD.md (scene, clips used, graphics, exact captions, durations) and keep it in sync with the composition.

AUDIO
- Music: the approved Brag track, integrated loudness around -16 LUFS (there is no voiceover to duck under), fade in at the start and fade out at the end. Subtle sound effects only on the title cards. No sound on every click.

WORKFLOW (stop at step 3 and wait for me)
1. Set up tools, fonts, brand tokens, logo and graphics; speed up the clips; write STORYBOARD.md.
2. Do a fast low-resolution draft render to check timing, and fix obvious problems.
3. STOP. Give me a preview board: one still PNG per scene (with the caption in place) at video/preview-board/, plus one overview sheet, and the track name with its license summary. Wait for my approval or changes.
4. After I approve, render the final video, the share version, the poster and share-copy.md.

AUTOMATIC CHECKS
- Every caption fits inside the safe margins and its pill, measured, at 1920x1080.
- Caption contrast of at least 4.5:1.
- Arabic text shaping and direction verified from extracted frames.
- No visible demo controls, no black frames except intentional fades, no clipped frames.
- The total duration, resolution, frame rate and file sizes are as specified.
- Audio levels within range, and no clipping.
- A final contact sheet of the finished video (one frame every 5 seconds).

WHEN DONE
Summarize in chat: the final length, the file sizes, which checks passed, anything you changed from this brief, and anything I should look at. Never claim a check passed without running it.

---

## Decisions made so far (approved by the user)

- Arabic font: **Cairo**, plus **Figtree**. Both are SIL OFL, downloaded from google/fonts into `video/composition/fonts/` with their OFL.txt files.
- Speed factors: the manifest has **no `suggested_speed_factor`** field and **`video/clips/REPORT.md` does not exist**. The approved rule is speed = `duration / briefTargetDuration`, capped at 3×, and left at 1× when under 1.1.
- Installing: the user runs or approves each install command. `/plugin` slash commands are not available in this environment, so installs go through the CLI.

## Progress

Last updated 2026-10-25.

- [x] Fonts are in `video/composition/fonts/` (Cairo-VariableFont.ttf, Figtree-VariableFont.ttf, with their OFL files).
- [x] Clips are sped up by `video/composition/speedup.py` into `video/composition/assets/clips/*.mp4`: full resolution, CRF 12, 30 fps, no interpolation. The factors are in `assets/clips/speed-factors.json`. Notable factors: S03a 3×, S08b 2.43×, S08a 1.92×, S06b 1.68×, S05b 1.54×, S03b 1.5×, S06d 1.5×, S08d 1.44×, S10b 1.42×, S04 1.24×.
- [x] Brag's bundled music has been looked at (not yet downloaded). There are five tracks, "Happy Beats / Business Moves" Vol. 1 (2:44), 9 (1:54), 10 (1:00), 11 (1:28) and 12 (1:58), by Sascha Ende (ende.app), licensed **CC BY 4.0**. Credit line: "Music: Sascha Ende, ende.app (CC BY 4.0)". The SFX are from Kenney, in folders ui/, interface/, impact/, keyboard/ and casino/; their license is still to be confirmed from the files.
- [x] Installed HyperFrames 0.8.198 and Brag 0.5.0 at **project scope** (`.claude/settings.json`). This used the CLI bundled with VS Code, `~/.vscode/extensions/anthropic.claude-code-2.1.310-darwin-arm64/resources/native-binary/claude`, because `claude` is not on PATH. The HyperFrames repo uses Git LFS and `git-lfs` is not installed, so the install ran with the LFS filters disabled through the `GIT_CONFIG_*` environment variables. Only a sample skill's media came through as pointer files, which is harmless.
  - The plugin files are in `~/.claude/plugins/cache/hyperframes/hyperframes/0.8.198/skills/` and `~/.claude/plugins/cache/brag/brag/0.5.0/skills/brag/assets/` (music/ and sfx/ hold real files).
  - The SFX are credited to Kenney in Brag's README. No license file for them is bundled.
- [x] `doctor` passed (Node 24, FFmpeg 8.1.2, Chrome). `init` was scaffolded in the scratchpad and merged into `video/composition/` (hyperframes.json, package.json, meta.json, AGENTS.md, CLAUDE.md). GSAP 3.14.2 is vendored in `vendor/`.
- [x] The composition is generated: `scenes.mjs` (timing and copy, the source of truth) → `node build.mjs` → `index.html`, `compositions/*.html`, `assets/logo-pulse*.svg`, `../STORYBOARD.md` and `preview-times.json`. The look is in `brand.css` and `styles.css`. `prepare-assets.sh` makes the laptop still, the music (Vol. 12 normalised to −16 LUFS) and the SFX.
- [x] Checks are in `tools/`: `audit-captions.mjs` (13/13 pass), `check-video.mjs` (all pass on the draft) and `preview-board.mjs`. The font gate in index.html was tested: a broken font path renders a red "FONTS NOT LOADED" frame.
- [x] Draft render is `composition/renders/draft.mp4` (86.2 s). The preview board is in `video/preview-board/` (00-overview.png plus 21 stills).
- [x] Draft 1 feedback (2026-10-25): the user approved the video up to 0:32 and **approved the music (Vol. 12)**. Four captions were too quick, and two text changes were requested. Draft v2 changes:
  - S05b is split: the first 2.7 s at the current speed, then the footage continues at ×0.5 for 3.4 s under the cancel flash line (hard join, no cross-fade).
  - S08a uses more footage (in 2.2 s, 4.5 s on screen).
  - S06d starts at 2.3 s and plays at ×0.5 for 3.0 s.
  - S09b runs 5.3 s, with its last frame held from 4.5 s (`assets/stills/S09b-return-history-end.png`).
  - The title card "بعد 3 شهور" is now "لو المريض زار العيادة تاني" (1.8 s).
  - The end line is now "بندوّر على عيادات تجرّب معانا" (نسخة تجريبية removed).
  - The user chose not to trim elsewhere, so the length is **92.0 s**. The 70-90 s check now allows up to 92 s, approved by the user.
  - The caption audit now also checks reading time (0.5 s + 0.3 s a word). The scene 2 caption misses by 0.1 s, and the user accepted that section as it is.
- [x] Draft v2 rendered to `renders/draft-v2.mp4` (92.0 s, every `check-video.mjs` check passes, −16.2 LUFS). The preview board is refreshed. The changed text was verified in frames taken from the rendered MP4.
- [x] Draft v3 (user request: speed changes only, nothing else). Total **107.95 s**.
  - Title cards are fully visible 2 s (2.5 s for "لو المريض زار العيادة تاني"): part lengths 2.3 s and 2.8 s.
  - Caption on-screen minimums: dashboard (S02 4.0 s), flash (S05b slow part 4.1 s), privacy (S06d 3.9 s with its last frame held), S08a (in 2.0 s, 4.7 s).
  - Result holds: roster Scheduled+Unpaid (S03b to its end + S03c from 0) about 3.2 s; Confirmed roster (S04 held, 5.45 s) at least 2.25 s; Paid (S06b held, 5.6 s) at least 2.25 s.
  - End card 7.2 s with the entrances tightened, so the number is fully visible about 6.1 s.
  - Music re-prepared from the first 115 s of the track (−16.0 LUFS). Stills for the held clips are made by prepare-assets.sh.
- [x] The user approved draft v3 ("perfect"). **Final delivered on 2026-10-25:**
  - `video/pulse-promo.mp4`: 1920x1080, 30 fps, H.264 High + AAC, faststart, 107.97 s, 17.8 MB, −15.8 LUFS, true peak −1.7 dBTP.
  - `video/pulse-promo-share.mp4`: 1280x720, two-pass 950 kb/s + AAC 128k, faststart, 14.3 MB (13.6 MiB).
  - `video/pulse-promo-poster.png`: the devices scene at 95.34 s, captured losslessly from the composition.
  - `video/share-copy.md`: the Egyptian Arabic post, with the music credit (CC BY 4.0) on the line before the link `wa.me/201094176420`.
  - `video/pulse-promo-contact-sheet.png`: 22 frames, one every 5 s.
  - `tools/check-video.mjs` passed every check on both files, and all 13 captions pass `tools/audit-captions.mjs`. Arabic was verified from frames of both the 1080p and 720p files.
- The music credit went in share-copy.md only (the default proposed, since the user had not chosen), so the video matches the approved v3. The 30-second teaser has not been built, as the brief asked. After approval: render with `--quality delivery`, then make the 1280x720 share version (≤16 MB), the poster, `share-copy.md` and the final contact sheet, and run `tools/check-video.mjs` on both files.
- [ ] Still open: where the CC BY 4.0 credit goes (proposed: share-copy.md only). After approval: render with `--quality delivery`, then make the 1280x720 share version (≤16 MB), the poster, `share-copy.md` and the final contact sheet, and run `tools/check-video.mjs` on both files.

Open questions for the user (raised at the stop):
- The CC BY 4.0 music credit is not in the video yet. Options: a credit line in share-copy.md, or a small credit on the end card.
- Arabic text added beyond the brief: the chat header "عيادة نايل كير" (the app's own Arabic name) and the "PDF" label.
- The label chips are used only where the brief named them (الحجز, الدكتور).
- Things in the recordings that can't be changed: Arabic-Indic digits in S10c/S10d dates, "Persistent cough" untranslated, and the small "Demo / تجريبي" badge (kept on purpose in ?clean=1 mode).

Notes for later:
- The clips total about 117 s even after the speed-ups, so they need trimming to key moments to reach 70 to 90 s. Each trim goes in STORYBOARD.md.
- The manifest marks S03a and S08d as `passed: false`. For S03a the reason is only that its duration differed between runs; for S08d no reason is given. Check both frame by frame.

## Vertical version (started 2026-10-25)

The user asked for a 1080x1920 version built from the approved v3 cut. The full vertical brief was pasted in chat; its key points are layout (top 140 px empty, header 140-260, card from y≈280, 1000 px wide, up to ≈1060 tall; captions y≈1380-1660, 54-60 px bold, no pill; bottom 260 px empty), a per-clip "virtual camera" in `camera.json` (scale 0.45-1.0, up to 1.4 for short punch-ins), the same timing as v3 plus the privacy line at ≥4 s and the same size as the others, stop at a preview board in `video/preview-board-vertical/`, and outputs `pulse-promo-vertical.mp4`, `-share.mp4` (720x1280, ≤16 MB), `-poster.png`.

Progress:
- [x] `video/composition-vertical/` created. fonts, vendor, assets/clips, audio, stills are symlinks to `../composition` (no duplicates).
- [x] `scenes-vertical.mjs` imports the landscape v3 `scenes.mjs` and changes only the privacy part (S06d 4.5 s, normal caption style).
- [x] `tools/grid-frames.mjs` makes source-pixel grid frames per clip part (for writing camera.json).
- [x] camera.json (21 parts, 37 key frames, scale 0.45-1.25), build-vertical.mjs, styles-vertical.css, tools/audit-vertical.mjs, tools/preview-board.mjs. `../composition/tools/check-video.mjs` gained `--project` and `--every` (landscape defaults unchanged).
- [x] Draft `composition-vertical/renders/draft-vertical.mp4`: 108.55 s, all checks pass. Preview board in `video/preview-board-vertical/` (36 stills + 00-overview.png + captions.md). `video/STORYBOARD-vertical.md` is generated.
- [x] 390 px check done: rosters were too small at 0.55-0.62, so the camera now settles on the reason + status columns at 1.0. S06a uses 1.25, S08a 1.15, S06d 1.2.
- [ ] **WAITING FOR USER APPROVAL of the vertical preview board.** Then render with `--quality delivery`, make the 720x1280 ≤16 MB share version and the poster, and run check-video with `--width 1080 --height 1920 --project ../composition-vertical --every 4 --sheet`.
- Known differences to report: the camera uses eased key frames, not a cursor-follow. S08d has no visible "Completed" badge. The S07b allergy stays at 0.85 to keep the name in shot. The music credit is on the vertical end card (the brief asked for it there).
