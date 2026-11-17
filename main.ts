// makefun-frontend-01 entry (Node 22, standard library only).
//
// The frontend is this directory's app/: plain static files — index.html,
// ES modules and one stylesheet, no build step — that read make.fun's public
// API (https://make.fun/api, GET only, read-only) and show the live bounty
// board, a bounty's page, its leaderboard and an account's public profile,
// each on its own hash route. Serve it locally with `node serve.ts`, then
// open http://localhost:8080.
//
// This program hands the entry in: it copies app/ and screenshots/ from
// beside this file into the output directory and writes
// /output/dossier.json with the vendored make.fun library, so the judge can
// read the screenshots, the first load's files and bytes, and the source.
// Leave vendor/makefun-frontend.ts as it is: the scorer rebuilds the
// dossier with its own copy and requires the two to match byte for byte.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The output folder itself is never removed or recreated: the grader runs
// as a non-root user and cannot delete /output, so only the entries inside
// it are cleared before each run. That keeps both runs identical.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Clear only the contents of the output folder, never the folder itself.
mkdirSync(out, { recursive: true });
for (const entry of readdirSync(out)) {
  rmSync(join(out, entry), { recursive: true, force: true });
}

cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the others
// refuse an entry the scorer would refuse (more than 3 screenshots or one
// over 256 KiB; more than 993 files and directories in app/ or 16 MiB of
// app files, counted beside /output's own 1000-entry cap).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 3, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 }),
);
