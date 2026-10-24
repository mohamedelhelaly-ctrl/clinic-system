# Demo recordings

Playwright scripts that drive the demo through the main click paths and save
one video per take. They start the web app themselves (port 5181) and reset the
demo data at the start of every take, so each run looks the same.

```bash
npm run record                     # all takes, desktop and phone
npm run record:receptionist -w demo-recording
npm run record:doctor -w demo-recording
npx playwright test -c demo-recording --project=desktop   # one viewport
```

Videos land in `demo-recording/output/videos/<desktop|phone>/<actor>--<take>.webm`
(git-ignored). The takes and their narration are listed in `docs/DEMO.md`.

`@playwright/test` is pinned to the Chromium build installed on the machine;
run `npx playwright install chromium` first on a fresh workstation.
