#!/usr/bin/env node
// Guard-test runner (row #337 / MR-061 s5). Runs `node --test` with human (spec)
// output on stdout and TAP to a file, then FAILS unless real tests ran and passed:
//   - node --test exit code must be 0 and TAP `# fail` must be 0
//   - TAP `# pass` >= --min-tests (executed tests, not files)
//   - file count >= --min-files
//   - every SKIP/TODO test must be listed in the allowlist ("name | reason")
//   - (row #343) every file must execute >= 1 test (a describe-only, empty or
//     all-skipped file contributes zero and is named), and with --manifest the
//     per-file executed count must EQUAL the committed manifest (file -> count),
//     so a deleted test fails and an added test forces a manifest bump in the
//     same commit. Each file runs in its own `node --test` so counts are per file.
// Usage: node scripts/run-guard-tests.mjs [--min-tests N] [--min-files N]
//          [--manifest path.json] [--allowlist path] [--dir d] [files...]
//          (default files: d/*.test.mjs, d=scripts)
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
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

export function parseManifest(text) {
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('manifest must be a JSON object {file: count}');
  for (const [k, v] of Object.entries(obj)) {
    if (!Number.isInteger(v) || v < 1) throw new Error(`manifest count for ${k} must be an integer >= 1, got ${JSON.stringify(v)}${v === 0 ? ' (a file that executes zero tests is never valid; add tests to it or remove it from the runner)' : ''}`);
  }
  return obj;
}

// perFile: [{ file (basename), executed }]; manifest: {file: count} or null.
export function evaluatePerFile(perFile, manifest, manifestPath = 'the manifest') {
  const errs = [];
  for (const { file, executed } of perFile) {
    if (executed === 0) errs.push(`${file} executed zero tests (empty, describe-only, early-exit or all skipped)`);
  }
  if (!manifest) return errs;
  const seen = new Set();
  for (const { file, executed } of perFile) {
    seen.add(file);
    if (!(file in manifest)) {
      errs.push(executed === 0
        ? `${file} is not in ${manifestPath} and executed zero tests: add tests to it, then list it in the manifest with its count`
        : `${file} is not in ${manifestPath}: add "${file}": ${executed}`);
    } else if (executed > manifest[file]) {
      errs.push(`${file} executed ${executed} tests but ${manifestPath} expects ${manifest[file]}: update it to "${file}": ${executed} in the same commit`);
    } else if (executed < manifest[file]) {
      errs.push(`${file} executed ${executed} tests but ${manifestPath} expects ${manifest[file]}: ${manifest[file] - executed} test(s) deleted or not running (if intentional, update the manifest to ${executed})`);
    }
  }
  for (const file of Object.keys(manifest)) {
    if (!seen.has(file)) errs.push(`${manifestPath} lists ${file} (${manifest[file]} tests) but it was not run`);
  }
  return errs;
}

function main(argv) {
  let minTests = 0, minFiles = 0, allowlist = join(here, 'allowed-skips.txt'), globDir = here, manifestPath = null;
  const files = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--min-tests') minTests = Number(argv[++i]);
    else if (argv[i] === '--min-files') minFiles = Number(argv[++i]);
    else if (argv[i] === '--allowlist') allowlist = argv[++i];
    else if (argv[i] === '--manifest') manifestPath = argv[++i];
    else if (argv[i] === '--dir') globDir = argv[++i];
    else files.push(argv[i]);
  }
  if (!files.length) {
    for (const f of readdirSync(globDir).sort()) if (f.endsWith('.test.mjs')) files.push(join(globDir === here ? 'scripts' : globDir, f));
  }
  if (!Number.isFinite(minTests) || !Number.isFinite(minFiles)) { console.error('bad numeric flag'); return 2; }
  const allowed = existsSync(allowlist) ? parseAllowlist(readFileSync(allowlist, 'utf8')) : new Set();
  const dir = mkdtempSync(join(tmpdir(), 'guard-tap-'));
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  try {
    const total = { tests: 0, pass: 0, fail: 0, skipped: 0, todo: 0, skips: [], emptyFiles: [] };
    const perFile = [];
    let exitCode = 0, unparsed = false;
    for (const [idx, f] of files.entries()) {
      const tapFile = join(dir, `out${idx}.tap`);
      const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', '--test-reporter-destination=stdout',
        '--test-reporter=tap', `--test-reporter-destination=${tapFile}`, f], { stdio: 'inherit', env });
      if (r.status !== 0) exitCode = r.status ?? 1;
      const t = parseTap(existsSync(tapFile) ? readFileSync(tapFile, 'utf8') : '');
      if (t.tests === null || t.pass === null) unparsed = true;
      perFile.push({ file: basename(f), executed: t.pass ?? 0 });
      for (const k of ['tests', 'pass', 'fail', 'skipped', 'todo']) total[k] += t[k] ?? 0;
      total.skips.push(...t.skips);
      total.emptyFiles.push(...t.emptyFiles);
    }
    if (!files.length) { total.tests = 0; }
    const tap = unparsed ? { ...total, tests: null, pass: null } : total;
    console.log(`
[guard-tests] files=${files.length} tests=${tap.tests} real_pass=${tap.pass} empty_files=${tap.emptyFiles.length} fail=${tap.fail} skipped=${tap.skipped} todo=${tap.todo} (floors: tests>=${minTests}, files>=${minFiles}${manifestPath ? `, manifest=${manifestPath}` : ''})`);
    const errs = evaluate(tap, { minTests, minFiles, fileCount: files.length, allowed, exitCode });
    let manifest = null;
    if (manifestPath) {
      try { manifest = parseManifest(readFileSync(manifestPath, 'utf8')); }
      catch (e) { errs.push(`cannot use manifest ${manifestPath}: ${e.message}`); }
    }
    errs.push(...evaluatePerFile(perFile, manifest, manifestPath ?? undefined));
    for (const e of errs) console.error(`::error::[guard-tests] ${e}`);
    return errs.length ? 1 : 0;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(main(process.argv.slice(2)));
