#!/usr/bin/env node
// Guard-test runner (row #337 / MR-061 s5). Runs `node --test` with human (spec)
// output on stdout and TAP to a file, then FAILS unless real tests ran and passed:
//   - node --test exit code must be 0 and TAP `# fail` must be 0
//   - TAP `# pass` >= --min-tests (executed tests, not files)
//   - file count >= --min-files
//   - every SKIP/TODO test must be listed in the allowlist ("name | reason")
// Usage: node scripts/run-guard-tests.mjs [--min-tests N] [--min-files N]
//          [--allowlist path] [--dir d] [files...]  (default: d/*.test.mjs, d=scripts)
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export function parseTap(text) {
  const num = (k) => {
    const m = text.match(new RegExp(`^# ${k} (\\d+)\\s*$`, 'm'));
    return m ? Number(m[1]) : null;
  };
  const skips = [];
  // node reports a file that registers no tests as one passing top-level "test"
  // named after the file path; those are not real tests.
  const emptyFiles = [];
  for (const line of text.split(/\r?\n/)) {
    const f = line.match(/^ok \d+ - (.*\.[cm]?js)\s*$/);
    if (f) emptyFiles.push(f[1]);
    const m = line.match(/^\s*(?:not )?ok \d+ - (.*?)\s+# (SKIP|TODO)\b/i);
    if (m) skips.push({ name: m[1].trim(), kind: m[2].toUpperCase() });
  }
  const rawPass = num('pass');
  return { tests: num('tests'), pass: rawPass === null ? null : rawPass - emptyFiles.length,
    fail: num('fail'), skipped: num('skipped'), todo: num('todo'), skips, emptyFiles };
}

export function parseAllowlist(text) {
  const names = new Set();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.lastIndexOf('|');
    const name = (i < 0 ? line : line.slice(0, i)).trim();
    const reason = i < 0 ? '' : line.slice(i + 1).trim();
    if (!reason) throw new Error(`allowlist entry has no reason: "${line}"`);
    names.add(name);
  }
  return names;
}

export function evaluate(tap, { minTests, minFiles, fileCount, allowed, exitCode }) {
  const errs = [];
  if (fileCount < minFiles) errs.push(`found ${fileCount} test files, need >= ${minFiles}`);
  if (tap.tests === null || tap.pass === null) errs.push('could not parse TAP summary (# tests / # pass)');
  for (const f of tap.emptyFiles) errs.push(`test file registers no tests: ${f}`);
  if (exitCode !== 0) errs.push(`node --test exited ${exitCode}`);
  if ((tap.fail ?? 0) > 0) errs.push(`${tap.fail} test(s) failed`);
  if (tap.pass !== null && tap.pass < minTests) errs.push(`only ${tap.pass} tests passed, need >= ${minTests}`);
  for (const s of tap.skips.filter((x) => !allowed.has(x.name))) {
    errs.push(`unexplained ${s.kind}: "${s.name}" (add to allowlist with a reason or un-skip)`);
  }
  const flagged = (tap.skipped ?? 0) + (tap.todo ?? 0);
  if (flagged > tap.skips.length) errs.push(`${flagged} skipped/todo counted but only ${tap.skips.length} identified by name`);
  return errs;
}

function main(argv) {
  let minTests = 0, minFiles = 0, allowlist = join(here, 'allowed-skips.txt'), globDir = here;
  const files = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--min-tests') minTests = Number(argv[++i]);
    else if (argv[i] === '--min-files') minFiles = Number(argv[++i]);
    else if (argv[i] === '--allowlist') allowlist = argv[++i];
    else if (argv[i] === '--dir') globDir = argv[++i];
    else files.push(argv[i]);
  }
  if (!files.length) {
    for (const f of readdirSync(globDir).sort()) if (f.endsWith('.test.mjs')) files.push(join(globDir === here ? 'scripts' : globDir, f));
  }
  if (!Number.isFinite(minTests) || !Number.isFinite(minFiles)) { console.error('bad numeric flag'); return 2; }
  const allowed = existsSync(allowlist) ? parseAllowlist(readFileSync(allowlist, 'utf8')) : new Set();
  const dir = mkdtempSync(join(tmpdir(), 'guard-tap-'));
  const tapFile = join(dir, 'out.tap');
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  try {
    const r = files.length
      ? spawnSync(process.execPath, ['--test', '--test-reporter=spec', '--test-reporter-destination=stdout',
          '--test-reporter=tap', `--test-reporter-destination=${tapFile}`, ...files], { stdio: 'inherit', env })
      : { status: 0 };
    const tap = parseTap(existsSync(tapFile) ? readFileSync(tapFile, 'utf8') : '');
    console.log(`\n[guard-tests] files=${files.length} tests=${tap.tests} real_pass=${tap.pass} empty_files=${tap.emptyFiles.length} fail=${tap.fail} skipped=${tap.skipped} todo=${tap.todo} (floors: tests>=${minTests}, files>=${minFiles})`);
    const errs = evaluate(tap, { minTests, minFiles, fileCount: files.length, allowed, exitCode: r.status ?? 1 });
    for (const e of errs) console.error(`::error::[guard-tests] ${e}`);
    return errs.length ? 1 : 0;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(main(process.argv.slice(2)));
