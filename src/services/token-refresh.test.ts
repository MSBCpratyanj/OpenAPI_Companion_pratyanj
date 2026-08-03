import { describe, it, expect, vi } from 'vitest'
import { ok, type Result } from '@/types'
import { EventBus } from '@/core/events'
import type { ExecutedResponse, SwaggerAdapter } from '@/adapters'
import {
  TokenRefreshService,
  extractToken,
  type RefreshAuthApi,
  type RefreshTemplateApi,
  type TemplateLike,
} from './token-refresh'

const NOW = 1_000_000

function mockAdapter(responses: () => ExecutedResponse[]): SwaggerAdapter {
  return {
    detect: () => true,
    version: () => null,
    specUrl: () => null,
    readAuth: () => null,
    writeAuth: (): Result<void> => ok(undefined),
    clearAuth: (): Result<void> => ok(undefined),
    readOpenRequests: () => [],
    writeRequest: (): Result<void> => ok(undefined),
    replay: (): Result<void> => ok(undefined),
    isRequestBodyEmpty: () => true,
    readExecutedResponses: responses,
    listEndpoints: () => [],
    openEndpoint: (): Result<void> => ok(undefined),
    observe: () => () => {},
  }
}

const loginTemplate: TemplateLike = {
  templateId: 'tpl1',
  name: 'QA login',
  endpointId: 'post /auth/login',
  environmentId: 'qa',
}

function mockAuth(
  expiresAt: number | undefined,
  applyToken = vi.fn(async () => ok({})),
): RefreshAuthApi & { applyToken: ReturnType<typeof vi.fn> } {
  return {
    current: vi.fn(async () =>
      ok(expiresAt === -1 ? null : { token: 'OLD', schemeName: 'bearerAuth', expiresAt }),
    ),
    applyToken,
  }
}

function mockTemplates(
  templates: TemplateLike[],
  applyTemplate = vi.fn(async (): Promise<Result<void>> => ok(undefined)),
): RefreshTemplateApi & { applyTemplate: ReturnType<typeof vi.fn> } {
  return {
    listTemplates: vi.fn(async () => ok(templates)),
    applyTemplate,
  }
}

function makeService(opts: {
  responses?: () => ExecutedResponse[]
  auth: RefreshAuthApi
  templates: RefreshTemplateApi
  bus?: EventBus
  enabled?: () => boolean
  cooldownMs?: number
}) {
  return new TokenRefreshService({
    adapter: mockAdapter(opts.responses ?? (() => [])),
    auth: opts.auth,
    templates: opts.templates,
    bus: opts.bus,
    enabled: opts.enabled,
    cooldownMs: opts.cooldownMs ?? 0,
    now: () => NOW,
    pollMs: 100,
    timeoutMs: 500,
    setTimeoutFn: (fn) => fn(),
  })
}

describe('extractToken', () => {
  it('finds tokens by common key names, preferring specific ones', () => {
    expect(extractToken({ access_token: 'A'.repeat(20), token: 'B'.repeat(20) })).toBe(
      'A'.repeat(20),
    )
    expect(extractToken({ token: 'T'.repeat(20) })).toBe('T'.repeat(20))
  })

  it('searches nested objects and arrays', () => {
    expect(extractToken({ data: { auth: { accessToken: 'N'.repeat(20) } } })).toBe('N'.repeat(20))
    expect(extractToken({ results: [{ jwt: 'J'.repeat(20) }] })).toBe('J'.repeat(20))
  })

  it('ignores short/non-string values and returns null when absent', () => {
    expect(extractToken({ token: 'short' })).toBeNull()
    expect(extractToken({ token: 12345 })).toBeNull()
    expect(extractToken({ user: 'x' })).toBeNull()
  })
})

describe('TokenRefreshService.findLoginTemplate', () => {
  it('matches login-like names/endpoints, preferring the current environment', async () => {
    const devLogin: TemplateLike = {
      ...loginTemplate,
      templateId: 'tpl2',
      name: 'DEV login',
      environmentId: 'dev',
    }
    const other: TemplateLike = {
      templateId: 'x',
      name: 'Create user',
      endpointId: 'post /users',
      environmentId: 'qa',
    }
    const service = makeService({
      auth: mockAuth(0),
      templates: mockTemplates([other, devLogin, loginTemplate]),
    })
    expect((await service.findLoginTemplate('qa'))?.templateId).toBe('tpl1')
    expect((await service.findLoginTemplate('dev'))?.templateId).toBe('tpl2')
    // No env match → falls back to the first login-like template.
    expect((await service.findLoginTemplate('prod'))?.templateId).toBe('tpl2')
  })

  it('returns null when nothing looks like a login request', async () => {
    const service = makeService({
      auth: mockAuth(0),
      templates: mockTemplates([
        { templateId: 'x', name: 'Create user', endpointId: 'post /users', environmentId: 'qa' },
      ]),
    })
    expect(await service.findLoginTemplate('qa')).toBeNull()
  })
})

describe('TokenRefreshService.refreshIfExpired', () => {
  const FRESH = 'FRESH_TOKEN_VALUE_123'

  it('runs the login template, extracts the token, and applies it', async () => {
    // The login response "renders" only after applyTemplate ran.
    let executed = false
    const responses = (): ExecutedResponse[] =>
      executed
        ? [
            {
              endpointId: 'post /auth/login',
              method: 'post',
              endpoint: '/auth/login',
              status: 200,
              responseBody: JSON.stringify({ data: { access_token: FRESH } }),
            },
          ]
        : []
    const applyTemplate = vi.fn(async (): Promise<Result<void>> => {
      executed = true
      return ok(undefined)
    })
    const auth = mockAuth(NOW - 1) // expired
    const bus = new EventBus()
    const toast = vi.fn()
    bus.subscribe('NOTIFY', toast)
    const service = makeService({
      responses,
      auth,
      templates: mockTemplates([loginTemplate], applyTemplate),
      bus,
    })

    const result = await service.refreshIfExpired('qa')
    expect(result).toEqual({ ok: true, value: true })
    expect(applyTemplate).toHaveBeenCalledWith('tpl1')
    expect(auth.applyToken).toHaveBeenCalledWith('qa', FRESH, 'bearerAuth')
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }))
  })

  it('ignores a stale login response already rendered before the refresh', async () => {
    // The same response exists before AND after — must not be treated as new.
    const stale: ExecutedResponse = {
      endpointId: 'post /auth/login',
      method: 'post',
      endpoint: '/auth/login',
      status: 200,
      responseBody: JSON.stringify({ access_token: 'STALE_TOKEN_VALUE_1' }),
    }
    const auth = mockAuth(NOW - 1)
    const service = makeService({
      responses: () => [stale],
      auth,
      templates: mockTemplates([loginTemplate]),
    })

    const result = await service.refreshIfExpired('qa')
    expect(result).toEqual({ ok: true, value: false })
    expect(auth.applyToken).not.toHaveBeenCalled()
  })

  it('does nothing when the token is still valid', async () => {
    const auth = mockAuth(NOW + 60_000)
    const templates = mockTemplates([loginTemplate])
    const service = makeService({ auth, templates })

    expect(await service.refreshIfExpired('qa')).toEqual({ ok: true, value: false })
    expect(templates.applyTemplate).not.toHaveBeenCalled()
  })

  it('does nothing without a stored credential or without a login template', async () => {
    const noCred = makeService({ auth: mockAuth(-1), templates: mockTemplates([loginTemplate]) })
    expect(await noCred.refreshIfExpired('qa')).toEqual({ ok: true, value: false })

    const noTemplate = makeService({ auth: mockAuth(NOW - 1), templates: mockTemplates([]) })
    expect(await noTemplate.refreshIfExpired('qa')).toEqual({ ok: true, value: false })
  })

  it('warns when the login response carries no token', async () => {
    let executed = false
    const responses = (): ExecutedResponse[] =>
      executed
        ? [
            {
              endpointId: 'post /auth/login',
              method: 'post',
              endpoint: '/auth/login',
              status: 200,
              responseBody: '{"message":"ok"}',
            },
          ]
        : []
    const applyTemplate = vi.fn(async (): Promise<Result<void>> => {
      executed = true
      return ok(undefined)
    })
    const bus = new EventBus()
    const toast = vi.fn()
    bus.subscribe('NOTIFY', toast)
    const auth = mockAuth(NOW - 1)
    const service = makeService({
      responses,
      auth,
      templates: mockTemplates([loginTemplate], applyTemplate),
      bus,
    })

    const result = await service.refreshIfExpired('qa')
    expect(result).toEqual({ ok: true, value: false })
    expect(auth.applyToken).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ kind: 'warning' }))
  })

  it('does nothing when the feature is disabled', async () => {
    const auth = mockAuth(NOW - 1) // expired
    const templates = mockTemplates([loginTemplate])
    const service = makeService({ auth, templates, enabled: () => false })
    expect(await service.refreshIfExpired('qa')).toEqual({ ok: true, value: false })
    expect(templates.applyTemplate).not.toHaveBeenCalled()
  })
})

const NEW_TOKEN = 'NEW_TOKEN_VALUE_456'

/** Login response that renders only after applyTemplate ran. */
function loginResponses(executedRef: { done: boolean }, before: ExecutedResponse[] = []) {
  return (): ExecutedResponse[] =>
    executedRef.done
      ? [
          ...before,
          {
            endpointId: 'post /auth/login',
            method: 'post',
            endpoint: '/auth/login',
            status: 200,
            responseBody: JSON.stringify({ access_token: NEW_TOKEN }),
          },
        ]
      : before
}

describe('TokenRefreshService — 401/403 response trigger', () => {
  const unauthorized: ExecutedResponse = {
    endpointId: 'get /site-surveys',
    method: 'get',
    endpoint: '/site-surveys',
    status: 401,
    responseBody: '{"detail":"token expired"}',
  }

  it('refreshes on a new 401 even for an opaque token (no exp)', async () => {
    const ref = { done: false }
    const applyTemplate = vi.fn(async (): Promise<Result<void>> => {
      ref.done = true
      return ok(undefined)
    })
    const auth = mockAuth(undefined) // opaque token: no expiresAt at all
    const service = makeService({
      responses: loginResponses(ref, [unauthorized]),
      auth,
      templates: mockTemplates([loginTemplate], applyTemplate),
    })

    const result = await service.noticeResponses('qa')
    expect(result).toEqual({ ok: true, value: true })
    expect(applyTemplate).toHaveBeenCalledWith('tpl1')
    expect(auth.applyToken).toHaveBeenCalledWith('qa', NEW_TOKEN, 'bearerAuth')
  })

  it('ignores non-4xx responses and does not double-fire on the same 401', async () => {
    const ref = { done: false }
    const auth = mockAuth(undefined)
    const service = makeService({
      responses: loginResponses(ref, [unauthorized]),
      auth,
      templates: mockTemplates([loginTemplate]),
    })
    await service.noticeResponses('qa') // handles the 401 once
    const second = service.noticeResponses('qa') // same signature → ignored
    expect(second).toBeUndefined()
  })

  it('does nothing on 401 when disabled', () => {
    const service = makeService({
      responses: () => [unauthorized],
      auth: mockAuth(undefined),
      templates: mockTemplates([loginTemplate]),
      enabled: () => false,
    })
    expect(service.noticeResponses('qa')).toBeUndefined()
  })

  it('honors the cooldown between attempts (breaks login-failure loops)', async () => {
    const auth = mockAuth(NOW - 1)
    const templates = mockTemplates([loginTemplate])
    // Large cooldown + constant clock → the second attempt is always within it.
    const service = makeService({ auth, templates, cooldownMs: 60_000 })

    await service.refreshIfExpired('qa') // first attempt runs (finds no token → ok(false))
    templates.applyTemplate.mockClear()
    await service.refreshIfExpired('qa') // within cooldown → skipped
    expect(templates.applyTemplate).not.toHaveBeenCalled()
  })
})
