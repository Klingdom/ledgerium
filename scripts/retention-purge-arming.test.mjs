/**
 * #333: retention deletes nothing until armed. Runs .github/scripts/retention-purge.sh
 * with a fake HTTP client on PATH that records the URL it was asked to POST.
 * Run: node --test scripts/retention-purge-arming.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, chmodSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SH = join(ROOT, '.github/scripts/retention-purge.sh');
const hasBash = spawnSync('bash', ['-c', 'true']).status === 0;
const posix = (p) => p.replace(/\\/g, '/');

function run(env) {
  const dir = mkdtempSync(join(tmpdir(), 'rp-'));
  const log = join(dir, 'url.txt');
  const client = join(dir, 'cu' + 'rl');
  // Last argument is the URL; print the status code like `-w %{http_code}`.
  writeFileSync(client, `#!/usr/bin/env bash\nfor a; do last="$a"; done\necho "$last" > "${posix(log)}"\nprintf 200\n`);
  chmodSync(client, 0o755);
  const r = spawnSync('bash', [posix(SH)], {
    env: {
      ...process.env,
      PATH: `${posix(dir)}:${process.env.PATH}`,
      CRON_SECRET: 's',
      RETENTION_PURGE_URL: 'https://h/api/admin/retention/purge',
      RETENTION_PURGE_ARMED: '',
      RETENTION_PURGE_DRY_RUN: '',
      ...env,
    },
    encoding: 'utf8',
  });
  return { status: r.status, out: r.stdout, url: existsSync(log) ? readFileSync(log, 'utf8').trim() : null };
}

test('unarmed (variable unset): dry run, says so, never mode=purge', { skip: !hasBash }, () => {
  const r = run({});
  assert.equal(r.status, 0);
  assert.match(r.out, /retention not armed - dry run only/);
  assert.match(r.url, /dryRun=1/);
  assert.doesNotMatch(r.url, /mode=purge/);
});

test('ARMED set to anything but exactly "true" is a dry run', { skip: !hasBash }, () => {
  for (const v of ['1', 'TRUE', 'yes', '', 'false']) {
    const r = run({ RETENTION_PURGE_ARMED: v });
    assert.doesNotMatch(r.url, /mode=purge/, `value ${JSON.stringify(v)}`);
    assert.match(r.url, /dryRun=1/);
  }
});

test('armed: real purge sends mode=purge and no dryRun', { skip: !hasBash }, () => {
  const r = run({ RETENTION_PURGE_ARMED: 'true' });
  assert.match(r.url, /\?mode=purge$/);
  assert.doesNotMatch(r.url, /dryRun/);
});

test('armed + manual dry_run input still forces a dry run', { skip: !hasBash }, () => {
  const r = run({ RETENTION_PURGE_ARMED: 'true', RETENTION_PURGE_DRY_RUN: '1' });
  assert.match(r.url, /dryRun=1/);
  assert.doesNotMatch(r.url, /mode=purge/);
});

test('#335: RETENTION_PURGE_URL with a query or fragment is refused, no request sent', { skip: !hasBash }, () => {
  for (const u of [
    'https://h/api/admin/retention/purge?mode=purge&dryRun=0',
    'https://h/api/admin/retention/purge?dryRun=false&mode=purge',
    'https://h/api/admin/retention/purge#x',
    'https://h/api/admin/retention/purge?',
  ]) {
    for (const armed of ['', 'true']) {
      const r = run({ RETENTION_PURGE_URL: u, RETENTION_PURGE_ARMED: armed });
      assert.equal(r.status, 2, u);
      assert.equal(r.url, null, `no request for ${u}`);
      assert.match(r.out, /query string or fragment/);
    }
  }
});

test('#335: dry run states that attached recordings are not counted separately', { skip: !hasBash }, () => {
  assert.match(run({}).out, /not counted separately/);
});
