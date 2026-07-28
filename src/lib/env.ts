import 'server-only'

/**
 * Canon of server environment variables.
 *
 * Single source: no other module reads `process.env` for these keys.
 * Validation is explicit and fail-closed — a missing or invalid
 * configuration produces a named state, never a fallback value or simulated
 * data.
 *
 * `import 'server-only'` fails the build if this module reaches a client
 * bundle. None of these variables is prefixed `NEXT_PUBLIC_`: secrets never
 * leave the server.
 *
 * ABSOLUTE RULE: this module NEVER logs a value. Diagnostics expose the NAME
 * of a variable and its state (present / missing / invalid), never its
 * content.
 */

export type EnvVarStatus = 'ok' | 'missing' | 'invalid'

export type EnvVarReport = {
  name: string
  status: EnvVarStatus
  /** Role of the variable, displayable in the UI. */
  purpose: string
  /** What's missing or wrong — without ever citing the value. */
  detail: string | null
}

/** Minimum length of a signing secret, in characters. */
const MIN_SECRET_LENGTH = 32

function readSecret(name: string, purpose: string): EnvVarReport {
  const raw = process.env[name]
  if (!raw || raw.trim().length === 0) {
    return { name, status: 'missing', purpose, detail: 'Variable missing.' }
  }
  if (raw.trim().length < MIN_SECRET_LENGTH) {
    return {
      name,
      status: 'invalid',
      purpose,
      detail: `Too short: ${MIN_SECRET_LENGTH} characters minimum expected.`,
    }
  }
  return { name, status: 'ok', purpose, detail: null }
}

function readUrl(name: string, purpose: string): EnvVarReport {
  const raw = process.env[name]?.trim()
  if (!raw) {
    return { name, status: 'missing', purpose, detail: 'Variable missing.' }
  }
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return { name, status: 'invalid', purpose, detail: 'HTTPS required outside local development.' }
    }
  } catch {
    return { name, status: 'invalid', purpose, detail: 'Not a valid absolute URL.' }
  }
  return { name, status: 'ok', purpose, detail: null }
}

/** Backend URL, without a trailing slash. `null` if not configured. */
export function backendUrl(): string | null {
  const raw = process.env.HEARST_API_URL?.trim()
  if (!raw) return null
  try {
    new URL(raw)
  } catch {
    return null
  }
  let end = raw.length
  while (end > 0 && raw[end - 1] === '/') end -= 1
  return raw.slice(0, end)
}

/**
 * Secret protecting the frontend session cookie.
 *
 * It is NEVER used to talk to the backend: since the switch to backend
 * authentication, this frontend no longer signs any API token.
 */
export function authSecret(): string | null {
  const raw = process.env.AUTH_SECRET?.trim()
  return raw && raw.length >= MIN_SECRET_LENGTH ? raw : null
}

/**
 * Full server configuration state, meant for display.
 * No value appears here — only names and statuses.
 *
 * Internal to the canon: the outside goes through `checkConfiguration()`,
 * which exposes this report in `ConfigHealth.report`. Keeping a single entry
 * point stops a caller from building a parallel judgment on `publicReady` /
 * `loginReady`.
 */
function environmentReport(): EnvVarReport[] {
  return [
    readUrl('HEARST_API_URL', 'Hearst Connect backend base — authentication authority.'),
    readSecret('AUTH_SECRET', 'Frontend session cookie protection, only.'),
  ]
}

export type ConfigHealth = {
  /** Public probes are callable. */
  publicReady: boolean
  /**
   * Login is possible: the backend, authentication authority, is
   * addressable, and the session cookie can be sealed.
   *
   * This is NOT "a session exists": the presence of a session is read from
   * the session itself, not from the configuration.
   */
  loginReady: boolean
  report: EnvVarReport[]
}

/**
 * Validation at the start of a server render.
 *
 * Does not throw: a crashing console doesn't help anyone diagnose a missing
 * variable. It returns a state that the interface renders honestly.
 */
export function checkConfiguration(): ConfigHealth {
  const report = environmentReport()
  const ok = (name: string) => report.find((entry) => entry.name === name)?.status === 'ok'

  return {
    publicReady: ok('HEARST_API_URL'),
    loginReady: ok('HEARST_API_URL') && ok('AUTH_SECRET'),
    report,
  }
}

/**
 * Startup guard: reports gaps once, by their NAME.
 * No value, no fragment of a secret is ever written to the logs.
 *
 * Called from `RootLayout`: every server render goes through it. The
 * `announced` lock is module-scoped — a worker logs once, not on every
 * request.
 *
 * Never throws: a guard that breaks rendering turns a forgotten variable
 * into a total outage. On the unexpected, it stays silent rather than fail.
 */
let announced = false
export function announceConfigurationOnce(): void {
  if (announced) return
  announced = true

  try {
    const failing = environmentReport().filter((entry) => entry.status !== 'ok')
    if (failing.length === 0) return

    // `name`, `detail` and `purpose` are literals from this module: they are
    // never built from `process.env`. So nothing that follows can contain a
    // fragment of a value.
    const lines = failing.map(
      (entry) => `  - ${entry.name}: ${entry.detail ?? entry.status} (${entry.purpose})`,
    )
    console.warn(
      `[hearst-connect] Incomplete configuration — affected surfaces will show "not configured":\n${lines.join('\n')}`,
    )
  } catch {
    // A diagnostic has no right to bring a page down.
  }
}
