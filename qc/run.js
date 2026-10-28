#!/usr/bin/env node
// Vocab Quest QC suite — one command checks the whole app.
//
//   node qc/run.js            # logic + data + browser flows
//   node qc/run.js --unit     # logic + data only (no browser)
//
// Browser flows use Playwright + Chromium and a FAKE Firebase (no network,
// no real accounts touched). Things that need the real Firebase, email,
// Google Calendar, microphone or a real phone are in docs/QC-CHECKLIST.md.
'use strict';
const fs = require('fs');
const path = require('path');
const { summary, ROOT } = require('./lib');

(async () => {
  const t0 = Date.now();
  const unitOnly = process.argv.includes('--unit');
  console.log('\n=== QC: logic & data ===');
  await require('./unit')();
  if (!unitOnly) {
    console.log('\n=== QC: browser flows ===');
    await require('./e2e')();
  }
  const s = summary();
  console.log('\n=== QC summary ===');
  Object.entries(s.byArea).forEach(([a, v]) => console.log((v.fail ? '❌ ' : '✅ ') + a.padEnd(34) + ' ' + v.pass + ' pass' + (v.fail ? ', ' + v.fail + ' FAIL' : '')));
  console.log('\n' + (s.failed ? s.failed + ' / ' + s.total + ' checks FAILED' : 'ALL ' + s.total + ' checks passed') + ' in ' + Math.round((Date.now() - t0) / 1000) + 's');
  try {
    fs.writeFileSync(path.join(ROOT, 'qc', 'last-run.json'), JSON.stringify({ at: new Date().toISOString(), ...s }, null, 2));
  } catch (e) { /* read-only checkout */ }
  process.exit(s.failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
