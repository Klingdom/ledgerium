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
import { readFileSync } from 'node:fs'
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
