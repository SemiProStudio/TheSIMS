#!/usr/bin/env node
// =============================================================================
// Flake report — reads the Playwright JSON results and makes retries visible.
//
// With retries: 1 on CI a test that fails once and passes on retry is
// reported as "flaky" and the run stays green. That is exactly the class of
// failure (optimistic-UI vs lazy-fetch latency races) that used to hide
// behind the old retries: 2 policy. This script:
//
//   1. lists every flaky and failed test in the GitHub job summary (or on
//      stdout when run locally), with the first attempt's error line
//   2. exits non-zero when the number of flaky tests exceeds FLAKE_BUDGET
//      (default 1 — one boot-hang per run is the documented local/CI noise
//      floor; two retried tests in one run is a signal, not noise)
//
// Usage: node scripts/flake-report.mjs [path/to/results.json]
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2] || path.join('playwright-report', 'results.json');
const budget = Number(process.env.FLAKE_BUDGET ?? 1);

if (!fs.existsSync(file)) {
  console.log(`flake-report: no results file at ${file} (run skipped or reporter missing)`);
  process.exit(0);
}

const report = JSON.parse(fs.readFileSync(file, 'utf8'));

/** Walk suites -> specs -> tests, yielding { title, file, line, project, test }. */
function* walk(suites, trail = []) {
  for (const suite of suites || []) {
    const next = suite.title ? [...trail, suite.title] : trail;
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        yield {
          title: [...next, spec.title].join(' > '),
          file: suite.file || spec.file,
          line: spec.line,
          project: test.projectName,
          test,
        };
      }
    }
    yield* walk(suite.suites, next);
  }
}

const flaky = [];
const failed = [];
let total = 0;
for (const entry of walk(report.suites)) {
  const { test } = entry;
  total += 1;
  if (test.status === 'flaky') flaky.push(entry);
  else if (test.status === 'unexpected' || test.status === 'failed') failed.push(entry);
}

// ANSI colour codes from Playwright's messages: ESC [ ... m
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

const firstError = (test) => {
  const result = (test.results || []).find((r) => r.status !== 'passed' && r.status !== 'skipped');
  const message = result?.error?.message || result?.errors?.[0]?.message || '';
  return message.split('\n')[0].replace(ANSI, '').replace(/\|/g, '\\|').slice(0, 160);
};

const row = (f) => `| ${f.file}:${f.line} ${f.title} | ${f.project} | ${firstError(f.test)} |`;

const lines = ['## E2E flake report', ''];
lines.push(
  `Tests: ${total} - retried-and-passed: **${flaky.length}** (budget ${budget}) - failed: **${failed.length}**`,
  '',
);
if (flaky.length) {
  lines.push('| Flaky test | Project | First attempt |', '| --- | --- | --- |');
  for (const f of flaky) lines.push(row(f));
  lines.push('');
}
if (failed.length) {
  lines.push('| Failed test | Project | Error |', '| --- | --- | --- |');
  for (const f of failed) lines.push(row(f));
  lines.push('');
}
if (!flaky.length && !failed.length) lines.push('No retries were needed.');

const markdown = lines.join('\n');
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}
console.log(markdown);

if (flaky.length > budget) {
  console.error(
    `\nflake-report: ${flaky.length} tests needed a retry (budget ${budget}). ` +
      'A latency race is hiding behind the retry - see e2e/README.md.',
  );
  process.exit(1);
}
