import { ok, type Result } from '@/types'
import type { EventBus } from '@/core/events'
import type { SwaggerAdapter } from '@/adapters'

/**
 * Auto token refresh: when the stored credential is EXPIRED and the user has a
 * saved login request template, run that login request and capture the fresh
 * token from its response — so an expired token heals itself without the
 * developer re-authenticating by hand.
 *
 * Lives in the shared services layer and depends only on NARROW structural
 * interfaces of the auth/request services (modules stay decoupled). Triggered
 * from the content script on AUTH_EXPIRED / after restore. Never runs
 * concurrently with itself, and does nothing unless BOTH conditions hold
 * (expired credential + a recognizable login template).
 */

/** What we need from AuthenticationService. */
export interface RefreshAuthApi {
  current(environmentId: string): Promise<Result<AuthRecordLike | null>>
  applyToken(environmentId: string, token: string, schemeName?: string): Promise<Result<unknown>>
}

/** What we need from RequestService. */
export interface RefreshTemplateApi {
  listTemplates(): Promise<Result<TemplateLike[]>>
  applyTemplate(templateId: string): Promise<Result<void>>
}

export interface AuthRecordLike {
  token: string
  schemeName?: string
  expiresAt?: number
}

export interface TemplateLike {
  templateId: string
  name: string
  endpointId: string
  environmentId: string
}

export interface TokenRefreshOptions {
  adapter: SwaggerAdapter
  auth: RefreshAuthApi
  templates: RefreshTemplateApi
  bus?: EventBus
  now?: () => number
  /** Feature gate — refresh only runs when this returns true (default: always). */
  enabled?: () => boolean
  /** Minimum gap between refresh attempts, to break login-failure loops (ms). */
  cooldownMs?: number
  /** Poll interval while waiting for the login response (ms). */
  pollMs?: number
  /** Give up waiting for the login response after this long (ms). */
  timeoutMs?: number
  /** Injectable for tests. */
  setTimeoutFn?: (fn: () => void, ms: number) => unknown
}

/** Template names/endpoints that identify a login request. */
const LOGIN_RE = /log[-_ ]?in|sign[-_ ]?in|authenticate|auth\b|token/i

/** Response fields commonly carrying the fresh token, most-specific first. */
const TOKEN_KEYS = [
  'access_token',
  'accessToken',
  'id_token',
  'idToken',
  'auth_token',
  'authToken',
  'jwt',
  'token',
  'bearer',
]

/** Depth-first search a parsed JSON response for a token-looking string. */
export function extractToken(value: unknown, depth = 0): string | null {
  if (depth > 6 || value == null) return null
  if (typeof value !== 'object') return null
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractToken(item, depth + 1)
      if (found) return found
    }
    return null
  }
  const record = value as Record<string, unknown>
  for (const key of TOKEN_KEYS) {
    const candidate = record[key]
    if (typeof candidate === 'string' && candidate.length > 8) return candidate
  }
  for (const nested of Object.values(record)) {
    const found = extractToken(nested, depth + 1)
    if (found) return found
  }
  return null
}

export class TokenRefreshService {
  private readonly adapter: SwaggerAdapter
  private readonly auth: RefreshAuthApi
  private readonly templates: RefreshTemplateApi
  private readonly bus: EventBus | undefined
  private readonly now: () => number
  private readonly pollMs: number
  private readonly timeoutMs: number
  private readonly schedule: (fn: () => void, ms: number) => unknown
  private readonly enabled: () => boolean
  private readonly cooldownMs: number
  private running = false
  private lastAttempt = 0
  /** Signatures of already-handled auth-failure responses (dedup across mutations). */
  private readonly seenFailures = new Set<string>()

  constructor(options: TokenRefreshOptions) {
    this.adapter = options.adapter
    this.auth = options.auth
    this.templates = options.templates
    this.bus = options.bus
    this.now = options.now ?? (() => Date.now())
    this.enabled = options.enabled ?? (() => true)
    this.cooldownMs = options.cooldownMs ?? 15_000
    this.pollMs = options.pollMs ?? 400
    this.timeoutMs = options.timeoutMs ?? 12_000
    this.schedule = options.setTimeoutFn ?? ((fn, ms) => setTimeout(fn, ms))
  }

  /** The saved login template for this environment (same-env first, else any). */
  async findLoginTemplate(environmentId: string): Promise<TemplateLike | null> {
    const listed = await this.templates.listTemplates()
    if (!listed.ok) return null
    const logins = listed.value.filter((t) => LOGIN_RE.test(t.name) || LOGIN_RE.test(t.endpointId))
    return logins.find((t) => t.environmentId === environmentId) ?? logins[0] ?? null
  }

  /**
   * On-load / env-switch trigger: refresh only when the stored JWT is expired.
   * (Opaque tokens have no expiry to read — those are caught by the 401 path.)
   */
  refreshIfExpired(environmentId: string): Promise<Result<boolean>> {
    return this.maybeRefresh(environmentId, false)
  }

  /**
   * Response-watch trigger: call whenever executed responses change. A NEW
   * 401/403 is the real-world "token died" signal (works for JWT AND opaque
   * tokens), so it force-refreshes regardless of any `exp`. Deduped per response
   * and rate-limited by the cooldown so a failing login can't loop.
   */
  noticeResponses(environmentId: string): Promise<Result<boolean>> | undefined {
    if (!this.enabled()) return undefined
    for (const res of this.adapter.readExecutedResponses()) {
      if (res.status !== 401 && res.status !== 403) continue
      const sig = `${res.endpointId}:${res.status}:${res.responseBody ?? ''}`
      if (this.seenFailures.has(sig)) continue
      if (this.seenFailures.size > 50) this.seenFailures.clear()
      this.seenFailures.add(sig)
      return this.maybeRefresh(environmentId, true)
    }
    return undefined
  }

  /**
   * Run the saved login request, read the fresh token from its response, and
   * apply + persist it. `force` skips the `exp` check (used by the 401 path,
   * where the server already told us the token is dead). Resolves true when a
   * fresh token was stored. Guarded by: enabled, not-running, cooldown, a stored
   * credential, and a recognizable login template.
   */
  private async maybeRefresh(environmentId: string, force: boolean): Promise<Result<boolean>> {
    if (!this.enabled()) return ok(false)
    if (this.running) return ok(false)
    if (this.now() - this.lastAttempt < this.cooldownMs) return ok(false)

    const got = await this.auth.current(environmentId)
    if (!got.ok || !got.value) return ok(false)
    const record = got.value
    if (!force && (record.expiresAt == null || record.expiresAt > this.now())) return ok(false)

    const login = await this.findLoginTemplate(environmentId)
    if (!login) return ok(false) // nothing saved to log in with

    this.running = true
    this.lastAttempt = this.now()
    try {
      // Signatures of already-rendered responses, so we only accept a NEW one.
      const before = new Map(
        this.adapter
          .readExecutedResponses()
          .map((r) => [r.endpointId, `${r.status}:${r.responseBody ?? ''}`]),
      )

      const applied = await this.templates.applyTemplate(login.templateId)
      if (!applied.ok) return applied

      const token = await this.awaitLoginToken(login.endpointId, before)
      if (!token) {
        this.bus?.publish('NOTIFY', {
          kind: 'warning',
          message:
            'Token expired — ran the saved login request but found no token in its response.',
        })
        return ok(false)
      }

      const stored = await this.auth.applyToken(environmentId, token, record.schemeName)
      if (!stored.ok) return stored
      this.bus?.publish('NOTIFY', {
        kind: 'success',
        message: 'Token expired — refreshed automatically via your saved login request.',
      })
      return ok(true)
    } finally {
      this.running = false
    }
  }

  /** Poll the rendered responses until the login endpoint shows a NEW 2xx one. */
  private awaitLoginToken(endpointId: string, before: Map<string, string>): Promise<string | null> {
    return new Promise((resolve) => {
      let waited = 0
      const tick = (): void => {
        for (const res of this.adapter.readExecutedResponses()) {
          if (res.endpointId !== endpointId) continue
          const signature = `${res.status}:${res.responseBody ?? ''}`
          if (before.get(endpointId) === signature) continue // stale render
          if (res.status < 200 || res.status >= 300 || !res.responseBody) continue
          try {
            const token = extractToken(JSON.parse(res.responseBody))
            if (token) {
              resolve(token)
              return
            }
          } catch {
            // Non-JSON response — keep waiting.
          }
        }
        waited += this.pollMs
        if (waited > this.timeoutMs) resolve(null)
        else this.schedule(tick, this.pollMs)
      }
      tick()
    })
  }
}
