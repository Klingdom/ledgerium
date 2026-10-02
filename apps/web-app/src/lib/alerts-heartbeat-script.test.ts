/**
 * Row #282: .github/scripts/alerts-heartbeat.sh status -> exit-code contract,
 * run for real against a NO-NETWORK stub `curl` on PATH, plus structural checks
 * on .github/workflows/alerts-heartbeat.yml. The stub never touches a network:
 * it prints $STUB_HTTP_CODE (or exits $STUB_CURL_RC) and records its argv.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, chmodSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const SCRIPT = path.join(REPO_ROOT, '.github/scripts/alerts-heartbeat.sh');
const WORKFLOW = path.join(REPO_ROOT, '.github/workflows/alerts-heartbeat.yml');

const bashProbe = spawnSync('bash', ['-c', 'echo ok'], { encoding: 'utf8' });
const hasBash = bashProbe.status === 0;

let dir: string;
let argvLog: string;

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'hb-stub-'));
  argvLog = path.join(dir, 'argv.txt');
  const stub = [
    '#!/usr/bin/env bash',
    'printf "%s\\n" "$@" > "$STUB_ARGV_LOG"',
    'cat > /dev/null',
    '[ "${STUB_CURL_RC:-0}" != "0" ] && exit "$STUB_CURL_RC"',
    'printf "%s" "$STUB_HTTP_CODE"',
    '',
  ].join('\n');
  writeFileSync(path.join(dir, 'curl'), stub);
  chmodSync(path.join(dir, 'curl'), 0o755);
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function run(env: Record<string, string | undefined>) {
  const pathSep = process.platform === 'win32' ? ';' : ':';
  const r = spawnSync('bash', [SCRIPT], {
    encoding: 'utf8',
    env: {
      PATH: `${dir}${pathSep}${process.env.PATH ?? ''}`,
      STUB_ARGV_LOG: argvLog,
      ...env,
    } as unknown as NodeJS.ProcessEnv,
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const BASE = { CRON_SECRET: 's3cret-value', ALERTS_HEARTBEAT_URL: 'https://app.test/api/admin/alerts/heartbeat' };

describe.skipIf(!hasBash)('alerts-heartbeat.sh', () => {
  it.each([
    ['200', 0],
    ['207', 6],
    ['424', 5],
    ['412', 7],
    ['503', 4],
    ['500', 1],
    ['401', 1],
    ['405', 1],
  ])('HTTP %s -> exit %i, prints the status only', (code, exit) => {
    const r = run({ ...BASE, STUB_HTTP_CODE: code });
    expect(r.code).toBe(exit);
    expect(r.out).toContain(`HTTP status: ${code}`);
    expect(r.out).not.toContain(BASE.CRON_SECRET);
  });

  it('curl failure -> exit 3', () => {
    expect(run({ ...BASE, STUB_CURL_RC: '28', STUB_HTTP_CODE: '' }).code).toBe(3);
  });

  it('missing CRON_SECRET -> exit 2', () => {
    expect(run({ ALERTS_HEARTBEAT_URL: BASE.ALERTS_HEARTBEAT_URL, STUB_HTTP_CODE: '200' }).code).toBe(2);
  });

  it('no heartbeat URL and no derivable check URL -> exit 2', () => {
    expect(run({ CRON_SECRET: BASE.CRON_SECRET, ALERTS_CHECK_URL: 'https://app.test/other', STUB_HTTP_CODE: '200' }).code).toBe(2);
  });

  it('derives the heartbeat URL from ALERTS_CHECK_URL ending in /alerts/check', () => {
    const r = run({ CRON_SECRET: BASE.CRON_SECRET, ALERTS_CHECK_URL: 'https://app.test/api/admin/alerts/check', STUB_HTTP_CODE: '200' });
    expect(r.code).toBe(0);
    expect(readFileSync(argvLog, 'utf8')).toContain('https://app.test/api/admin/alerts/heartbeat');
  });

  it('POSTs, and never puts the secret in curl argv', () => {
    run({ ...BASE, STUB_HTTP_CODE: '200' });
    const argv = readFileSync(argvLog, 'utf8');
    expect(argv).toMatch(/^-X$/m);
    expect(argv).toMatch(/^POST$/m);
    expect(argv).not.toContain(BASE.CRON_SECRET);
  });
});

describe('alerts-heartbeat.yml', () => {
  const yml = readFileSync(WORKFLOW, 'utf8');
  it('exists alongside the script, scheduled daily + dispatchable, status-only script', () => {
    expect(existsSync(SCRIPT)).toBe(true);
    expect(yml).toMatch(/^\s*- cron: '\d+ \d+ \* \* \*'\s*$/m);
    expect(yml).toMatch(/workflow_dispatch:/);
    expect(yml).toMatch(/run: bash \.github\/scripts\/alerts-heartbeat\.sh/);
    expect(yml).toMatch(/CRON_SECRET: \$\{\{ secrets\.CRON_SECRET \}\}/);
    expect(yml).toMatch(/permissions:\s*\n\s*contents: read/);
  });
});
