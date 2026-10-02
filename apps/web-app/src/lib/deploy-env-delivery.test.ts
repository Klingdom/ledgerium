/**
 * Deploy env-delivery check (backlog row #277, the class behind loop 85 and MR-045).
 *
 * THE DELIVERY MECHANISM, traced from the files (not assumed):
 *
 *   1. .github/workflows/deploy.yml, step "Deploy to Hostinger"
 *      (hostinger/deploy-on-vps@v2), passes `docker-compose-path:
 *      compose.hostinger.yaml` and an `environment-variables: |` block of
 *      KEY=VALUE lines. That block is the SET side: it puts KEY in the HOST
 *      environment the action runs `docker compose` under.
 *   2. There is no `env_file:` anywhere in compose.hostinger.yaml. The only way
 *      a host variable reaches a container is Compose interpolation inside a
 *      service's `environment:` list (`- KEY=${KEY:-default}`). A variable that
 *      is set in step 1 but not listed there never reaches the container; the
 *      compose file says so itself ("These MUST be enumerated here or the deploy
 *      env never reaches the container").
 *   3. So "delivered" means: for the service that consumes it, an `environment:`
 *      entry named KEY exists. Reading the line that SETS a variable (step 1)
 *      proves nothing; this test reads the line that DELIVERS it (step 3).
 *
 * Limits, stated plainly: this verifies the files, not the Hostinger action's
 * runtime behaviour (that it exports the block to the host shell is taken from
 * the compose file's own comments and the loop-85 history, not re-proven here).
 * No YAML parser is installed in the workspace (no `yaml`/`js-yaml`), so both
 * files are parsed by indentation for the specific structures used; the parsers
 * throw if they find nothing, so a restructure fails loudly instead of passing.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const DEPLOY_YML = path.join(REPO_ROOT, '.github/workflows/deploy.yml')
const COMPOSE = path.join(REPO_ROOT, 'compose.hostinger.yaml')

// ── Parsers ──────────────────────────────────────────────────────────────────

/** KEY names written by the `environment-variables: |` block, in order. */
export function parseDeployWrittenVars(yml: string): string[] {
  const lines = yml.split(/\r?\n/)
  const start = lines.findIndex((l) => /^\s*environment-variables:\s*\|\s*$/.test(l))
  if (start < 0) throw new Error('deploy.yml: no `environment-variables: |` block found')
  const baseIndent = lines[start]!.match(/^\s*/)![0].length
  const keys: string[] = []
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]!
    if (line.trim() === '') continue
    if (line.match(/^\s*/)![0].length <= baseIndent) break // block ended
    const t = line.trim()
    if (t.startsWith('#')) continue
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(t)
    if (!m) throw new Error(`deploy.yml: non KEY=VALUE line in env block: ${t}`)
    keys.push(m[1]!)
  }
  if (keys.length === 0) throw new Error('deploy.yml: environment-variables block is empty')
  return keys
}

export interface ComposeEnvEntry {
  key: string
  value: string
}

/** service name -> its `environment:` list entries (KEY=VALUE form). */
export function parseComposeServiceEnv(yml: string): Record<string, ComposeEnvEntry[]> {
  const lines = yml.split(/\r?\n/)
  const out: Record<string, ComposeEnvEntry[]> = {}
  let inServices = false
  let service: string | null = null
  let inEnv = false
  for (const raw of lines) {
    if (raw.trim() === '' || raw.trim().startsWith('#')) continue
    const indent = raw.match(/^\s*/)![0].length
    const t = raw.trim()
    if (indent === 0) {
      inServices = t === 'services:'
      service = null
      inEnv = false
      continue
    }
    if (!inServices) continue
    if (indent === 2) {
      service = t.replace(/:$/, '')
      out[service] = []
      inEnv = false
      continue
    }
    if (service && indent === 4) {
      inEnv = t === 'environment:'
      continue
    }
    if (service && inEnv && indent === 6 && t.startsWith('- ')) {
      let item = t.slice(2).trim()
      if (/^".*"$/.test(item) || /^'.*'$/.test(item)) item = item.slice(1, -1)
      const eq = item.indexOf('=')
      if (eq > 0) out[service]!.push({ key: item.slice(0, eq), value: item.slice(eq + 1) })
    }
  }
  if (!out['web'] || out['web'].length === 0) throw new Error('compose: no web.environment entries parsed')
  return out
}

// ── The check ────────────────────────────────────────────────────────────────

/**
 * Variables written by deploy.yml that are consumed by a service other than
 * `web`. Delivery is satisfied by the named service referencing ${KEY} (or
 * naming KEY). Anything not listed here must be delivered to `web` by name.
 */
export const NON_WEB_CONSUMERS: Record<string, string[]> = {
  BACKUP_S3_URI: ['backup'],
  UPLOADS_BACKUP_S3_URI: ['backup'],
  BACKUP_S3_ENDPOINT: ['backup'],
  AGE_RECIPIENT: ['backup'],
  AWS_ACCESS_KEY_ID: ['backup'],
  AWS_SECRET_ACCESS_KEY: ['backup'],
  BACKUP_RETAIN_LOCAL: ['backup'],
  UMAMI_APP_SECRET: ['umami'],
  UMAMI_DB_PASSWORD: ['umami', 'umami-db'],
}

/**
 * Written by deploy.yml, deliberately NOT delivered. Exact: an entry that is
 * delivered, or no longer written, fails the stale-entry check.
 */
export const WRITTEN_NOT_DELIVERED: Record<string, string> = {
  DISABLE_ADMIN_BOOTSTRAP:
    'row #277: moot since loop 98 — admin bootstrap retired, nothing reads this variable',
  DEMO_MODE_DISABLE_TEAMS:
    'row #277: CEO must decide the intended value first — wiring the written default (true) would switch teams off in production',
  NEXTAUTH_SESSION_MAXAGE:
    'row #277: CEO must decide the intended session lifetime before it is wired',
}

function isDelivered(
  key: string,
  env: Record<string, ComposeEnvEntry[]>,
): boolean {
  const consumers = NON_WEB_CONSUMERS[key]
  if (!consumers) return (env['web'] ?? []).some((e) => e.key === key)
  const ref = '${' + key
  return consumers.every((svc) =>
    (env[svc] ?? []).some((e) => e.key === key || e.value.includes(ref)),
  )
}

export function findUndelivered(
  written: string[],
  env: Record<string, ComposeEnvEntry[]>,
  allow: Record<string, string>,
): { undelivered: string[]; staleAllow: string[] } {
  const undelivered = written.filter((k) => !isDelivered(k, env) && !(k in allow))
  const staleAllow = Object.keys(allow).filter((k) => !written.includes(k) || isDelivered(k, env))
  return { undelivered, staleAllow }
}

describe('deploy.yml -> compose.hostinger.yaml env delivery (row #277)', () => {
  const written = parseDeployWrittenVars(readFileSync(DEPLOY_YML, 'utf8'))
  const env = parseComposeServiceEnv(readFileSync(COMPOSE, 'utf8'))

  it('every variable deploy.yml writes is delivered to its consuming container', () => {
    const { undelivered } = findUndelivered(written, env, WRITTEN_NOT_DELIVERED)
    expect(
      undelivered,
      `Written by deploy.yml but not delivered by compose.hostinger.yaml (it never reaches the container): ${undelivered.join(', ')}. ` +
        `Add "- KEY=\${KEY:-}" to the service's environment:, or allowlist it in WRITTEN_NOT_DELIVERED with a reason.`,
    ).toEqual([])
  })

  it('the not-delivered allowlist has no stale entries', () => {
    const { staleAllow } = findUndelivered(written, env, WRITTEN_NOT_DELIVERED)
    expect(
      staleAllow,
      `Allowlist entries that are now delivered or no longer written: ${staleAllow.join(', ')}. Remove them.`,
    ).toEqual([])
  })

  it('NON_WEB_CONSUMERS only names variables deploy.yml writes and services that exist', () => {
    for (const [k, svcs] of Object.entries(NON_WEB_CONSUMERS)) {
      expect(written, `${k} not written by deploy.yml`).toContain(k)
      for (const s of svcs) expect(Object.keys(env), `service ${s}`).toContain(s)
    }
  })

  it('a delivered web entry that interpolates must interpolate its own name', () => {
    const bad = env['web']!.filter((e) => {
      const m = /\$\{([A-Za-z_][A-Za-z0-9_]*)/.exec(e.value)
      return m && m[1] !== e.key
    }).map((e) => `${e.key} <- \${${/\$\{([A-Za-z_][A-Za-z0-9_]*)/.exec(e.value)![1]}}`)
    expect(bad).toEqual([])
  })

  // ── Checker self-tests: the mutation cases, kept as permanent fixtures ────
  describe('checker self-test (fixtures, not the real files)', () => {
    const composeFixture = [
      'services:',
      '  web:',
      '    environment:',
      '      - A=${A:-}',
      '      - "B=${B:-x y}"',
      '    networks:',
      '      - n',
      '  backup:',
      '    environment:',
      '      - BACKUP_S3_URI=${BACKUP_S3_URI:-}',
    ].join('\n')
    const fenv = parseComposeServiceEnv(composeFixture)

    it('flags a written-but-undelivered variable', () => {
      const r = findUndelivered(['A', 'B', 'NEW_VAR'], fenv, {})
      expect(r.undelivered).toEqual(['NEW_VAR'])
    })
    it('flags an allowlist entry that is actually delivered (stale)', () => {
      const r = findUndelivered(['A'], fenv, { A: 'reason' })
      expect(r.staleAllow).toEqual(['A'])
    })
    it('flags an allowlist entry deploy.yml no longer writes (stale)', () => {
      const r = findUndelivered(['A'], fenv, { GONE: 'reason' })
      expect(r.staleAllow).toEqual(['GONE'])
    })
    it('accepts an allowlisted undelivered variable', () => {
      const r = findUndelivered(['A', 'X'], fenv, { X: 'reason' })
      expect(r).toEqual({ undelivered: [], staleAllow: [] })
    })
    it('parses the deploy env block, skipping comments, stopping at block end', () => {
      const yml = [
        '      - name: Deploy',
        '        with:',
        '          environment-variables: |',
        '            A=1',
        '            # comment (with parens)',
        '            B=${{ secrets.B }}',
        '          other: x',
      ].join('\n')
      expect(parseDeployWrittenVars(yml)).toEqual(['A', 'B'])
    })
  })
})

// ── Secrets must have no usable fallback (row #280) ──────────────────────────
// Loop 99's check above counted `${KEY:-change-me}` as "delivered". It is, and
// that is the problem: a public default for a signing key is a forgeable
// session. A secret-like variable may only be `${KEY:-}` (empty: the feature
// degrades visibly) or `${KEY:?msg}` (required: compose refuses to start).

const SECRET_NAME = /SECRET|PASSWORD|PASSWD|TOKEN|WEBHOOK|(^|_)KEY(_|$)/
const COMPOSE_FILES = readdirSync(REPO_ROOT).filter(
  (f) => /^compose.*\.ya?ml$/.test(f) || f === 'hostinger-paste.yaml',
)

/** Secret-like keys whose `${VAR:-default}` / `${VAR-default}` default is non-empty. */
export function findSecretFallbacks(yml: string): string[] {
  const bad: string[] = []
  yml.split(/\r?\n/).forEach((raw, i) => {
    const t = raw.trim().replace(/^-\s*/, '').replace(/^["']|["']$/g, '')
    if (t.startsWith('#')) return
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*[=:]\s*(.*)$/.exec(t)
    if (!m || !SECRET_NAME.test(m[1]!)) return
    const d = /\$\{[A-Za-z_][A-Za-z0-9_]*:?-([^}]*)\}/.exec(m[2]!)
    if (d && d[1]!.length > 0) bad.push(`line ${i + 1}: ${m[1]}`)
  })
  return bad
}

/**
 * The placeholder list + length + validation block. Single source of truth is
 * scripts/validate-secrets.sh (row #284): docker-start.sh and deploy.yml both
 * RUN it; neither holds a copy.
 */
const START_SH = readFileSync(path.join(REPO_ROOT, 'scripts/validate-secrets.sh'), 'utf8').replace(/\r\n/g, '\n')
export function parsePlaceholders(sh: string): string[] {
  const m = /^PLACEHOLDER_SECRETS="([^"]*)"/m.exec(sh)
  if (!m) throw new Error('validate-secrets.sh: PLACEHOLDER_SECRETS not found')
  return m[1]!.split(/\s+/).filter(Boolean)
}

describe('secrets have no non-empty fallback (row #280)', () => {
  it('no compose file gives a secret-like variable a non-empty default', () => {
    expect(COMPOSE_FILES).toContain('compose.hostinger.yaml')
    for (const f of COMPOSE_FILES) {
      const bad = findSecretFallbacks(readFileSync(path.join(REPO_ROOT, f), 'utf8'))
      expect(bad, `${f}: secret with a non-empty fallback default (use \${KEY:-} or \${KEY:?msg}): ${bad.join(', ')}`).toEqual([])
    }
  })

  it('NEXTAUTH_SECRET is required (:?) in the deployed compose file', () => {
    const line = readFileSync(COMPOSE, 'utf8')
      .split(/\r?\n/)
      .find((l) => /NEXTAUTH_SECRET=/.test(l) && !l.trim().startsWith('#'))
    expect(line).toMatch(/\$\{NEXTAUTH_SECRET:\?/)
  })

  it('validate-secrets.sh placeholder list covers every placeholder the repo ships', () => {
    const list = parsePlaceholders(START_SH)
    const dockerfile = readFileSync(path.join(REPO_ROOT, 'Dockerfile'), 'utf8')
    const build = /^ENV NEXTAUTH_SECRET=(\S+)/m.exec(dockerfile)?.[1]
    expect(build, 'Dockerfile build-time NEXTAUTH_SECRET').toBeTruthy()
    for (const v of [build!, 'change-me', 'ledgerium-dev-secret-change-in-production']) {
      expect(list.some((p) => v.toLowerCase().includes(p)), `placeholder "${v}" not rejected by validate-secrets.sh`).toBe(true)
    }
  })

  describe('checker self-test (mutation cases as fixtures)', () => {
    it('fails on the exact pre-fix line', () => {
      expect(findSecretFallbacks('      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-change-me}')).toHaveLength(1)
      expect(findSecretFallbacks('      NEXTAUTH_SECRET: "${NEXTAUTH_SECRET:-x}"')).toHaveLength(1)
      expect(findSecretFallbacks('      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-sk_live}')).toHaveLength(1)
    })
    it('accepts empty defaults, required form, and non-secrets', () => {
      expect(findSecretFallbacks('      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}')).toEqual([])
      expect(findSecretFallbacks('      - "NEXTAUTH_SECRET=${NEXTAUTH_SECRET:?must be set}"')).toEqual([])
      expect(findSecretFallbacks('      - SMTP_HOST=${SMTP_HOST:-smtp.hostinger.com}')).toEqual([])
    })
  })

  it('docker-start.sh and the image use the shared script, with no inline copy of the rules', () => {
    const start = readFileSync(path.join(REPO_ROOT, 'scripts/docker-start.sh'), 'utf8')
    expect(start).toMatch(/^sh "\$\(dirname "\$0"\)\/validate-secrets\.sh"$/m)
    expect(start).not.toContain('PLACEHOLDER_SECRETS')
    const dockerfile = readFileSync(path.join(REPO_ROOT, 'Dockerfile'), 'utf8')
    expect(dockerfile).toMatch(/^COPY scripts\/validate-secrets\.sh \/app\/validate-secrets\.sh$/m)
  })

  it('deploy.yml validates NEXTAUTH_SECRET before the deploy step (row #284)', () => {
    const lines = readFileSync(DEPLOY_YML, 'utf8').split(/\r?\n/)
    const deployJob = lines.findIndex((l) => /^  deploy:\s*$/.test(l))
    expect(deployJob).toBeGreaterThan(-1)
    const stepStarts: number[] = []
    for (let i = deployJob; i < lines.length; i++) if (/^      - (name|uses):/.test(lines[i]!)) stepStarts.push(i)
    const stepText = (n: number) => lines.slice(stepStarts[n]!, stepStarts[n + 1] ?? lines.length)
    const deployIdx = stepStarts.findIndex((_, n) => stepText(n).some((l) => /uses:\s*hostinger\/deploy-on-vps/.test(l)))
    const validateIdx = stepStarts.findIndex((_, n) => stepText(n).some((l) => /run:\s*sh scripts\/validate-secrets\.sh\s*$/.test(l)))
    expect(deployIdx, 'deploy step').toBeGreaterThan(-1)
    expect(validateIdx, 'validation step').toBeGreaterThan(-1)
    expect(validateIdx).toBeLessThan(deployIdx)
    const v = stepText(validateIdx).filter((l) => !l.trim().startsWith('#'))
    // secret arrives via env:, never on the command line
    expect(v.some((l) => /^\s*NEXTAUTH_SECRET:\s*\$\{\{\s*secrets\.NEXTAUTH_SECRET\s*\}\}\s*$/.test(l))).toBe(true)
    expect(v.filter((l) => /run:/.test(l)).join('')).not.toContain('${{')
    // default failure semantics: a failure must stop the job before the deploy step
    expect(v.some((l) => /^\s*(if|continue-on-error):/.test(l))).toBe(false)
  })

  const shAvailable = spawnSync('sh', ['-c', 'true']).status === 0
  describe.skipIf(!shAvailable)('validate-secrets.sh NEXTAUTH_SECRET validation (executed)', () => {
    const block = /^# BEGIN NEXTAUTH_SECRET[^\n]*\n[\s\S]*?^# END NEXTAUTH_SECRET[^\n]*$/m.exec(START_SH)?.[0]
    const run = (secret: string | undefined) => {
      const env: NodeJS.ProcessEnv = { NODE_ENV: 'test', PATH: process.env['PATH'] ?? '' }
      if (secret !== undefined) env['NEXTAUTH_SECRET'] = secret
      const r = spawnSync('sh', ['-c', block + '\necho VALID'], { env, encoding: 'utf8' })
      return { ok: r.status === 0 && r.stdout.includes('VALID'), out: r.stdout + r.stderr }
    }
    const good = 'Zk3p9Qw1Lx0vB7nM2aT5yHc8RdE4uJfGgSi6oVq1AaA='
    it('block is extractable', () => expect(block).toBeTruthy())
    it('rejects unset, empty, and every listed placeholder', () => {
      expect(run(undefined).ok).toBe(false)
      expect(run('').ok).toBe(false)
      for (const p of parsePlaceholders(START_SH)) expect(run(p).ok, p).toBe(false)
      expect(run('Change-Me').ok).toBe(false)
    })
    it('rejects short secrets, accepts 32+ chars, never prints the secret', () => {
      expect(run('abcdefghijklmnop').ok).toBe(false)
      expect(run('a'.repeat(31)).ok).toBe(false)
      expect(run(good).ok).toBe(true)
      expect(run('abcdefghijklmnop').out).not.toContain('abcdefghijklmnop')
    })
  })
})
