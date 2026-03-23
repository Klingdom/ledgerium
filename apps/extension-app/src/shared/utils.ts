export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

const STRIP_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', '_ga', 'ref', 'source',
])

export function normalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl)
    for (const key of [...u.searchParams.keys()]) {
      if (STRIP_PARAMS.has(key)) u.searchParams.delete(key)
    }
    return u.toString()
  } catch {
    return rawUrl
  }
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

export function deriveRouteTemplate(pathname: string): string {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const INT_RE = /^\d+$/
  const HEX_LONG_RE = /^[0-9a-f]{10,}$/
  return pathname
    .split('/')
    .map(seg => {
      if (!seg) return seg
      if (INT_RE.test(seg) || UUID_RE.test(seg) || HEX_LONG_RE.test(seg)) return ':id'
      return seg
    })
    .join('/')
}

const KNOWN_APP_LABELS: Record<string, string> = {
  netsuite: 'NetSuite', salesforce: 'Salesforce', workday: 'Workday',
  servicenow: 'ServiceNow', sap: 'SAP', hubspot: 'HubSpot',
  zendesk: 'Zendesk', jira: 'Jira', confluence: 'Confluence',
  github: 'GitHub', gitlab: 'GitLab', notion: 'Notion',
  slack: 'Slack', asana: 'Asana', monday: 'Monday',
}

export function deriveAppLabel(hostname: string): string {
  if (!hostname || hostname === 'localhost' || /^[\d.]+$/.test(hostname)) return 'Local Dev'
  const parts = hostname.split('.')
  for (const part of parts) {
    const label = KNOWN_APP_LABELS[part.toLowerCase()]
    if (label) return label
  }
  const first = parts[0] ?? hostname
  return first.charAt(0).toUpperCase() + first.slice(1)
}

export async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  // Fallback: djb2 checksum
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h) ^ text.charCodeAt(i)
  return (h >>> 0).toString(16).padStart(8, '0')
}
