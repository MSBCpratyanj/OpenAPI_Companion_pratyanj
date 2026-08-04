import { describe, it, expect, afterEach, vi } from 'vitest'
import { isSwaggerUi, resolveSwaggerUi } from './swagger-ui-global'

const systemObject = {
  getConfigs: () => ({ url: '/openapi.json' }),
  getState: () => ({ toJS: () => ({}) }),
  authActions: { authorize: () => {}, logout: () => {} },
}

describe('isSwaggerUi', () => {
  it('accepts an object exposing any of Swagger’s system methods', () => {
    expect(isSwaggerUi(systemObject)).toBe(true)
    expect(isSwaggerUi({ getConfigs: () => undefined })).toBe(true)
    expect(isSwaggerUi({ getState: () => undefined })).toBe(true)
    expect(isSwaggerUi({ preauthorizeApiKey: () => {} })).toBe(true)
    expect(isSwaggerUi({ authActions: {} })).toBe(true)
  })

  // `ui` is a common variable name; a page global that isn't Swagger must not be
  // mistaken for it, or we'd send authorize calls into someone else's object.
  it('rejects values that are not a Swagger system object', () => {
    expect(isSwaggerUi(undefined)).toBe(false)
    expect(isSwaggerUi(null)).toBe(false)
    expect(isSwaggerUi('ui')).toBe(false)
    expect(isSwaggerUi(42)).toBe(false)
    expect(isSwaggerUi({})).toBe(false)
    expect(isSwaggerUi({ someWidget: true })).toBe(false)
    expect(isSwaggerUi({ authActions: null })).toBe(false)
  })
})

describe('resolveSwaggerUi', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('finds the object on window (swagger-ui-dist / DRF templates)', () => {
    vi.stubGlobal('ui', systemObject)
    expect(resolveSwaggerUi()).toBe(systemObject)
  })

  it('returns undefined when the page has no Swagger object', () => {
    expect(resolveSwaggerUi()).toBeUndefined()
  })

  it('ignores an unrelated global named ui', () => {
    vi.stubGlobal('ui', { render: () => {} })
    expect(resolveSwaggerUi()).toBeUndefined()
  })

  // NOTE: the FastAPI case — a top-level `const ui` in a classic script — lives in
  // the global *lexical* environment, which cannot be created from a test (jsdom
  // won't run page scripts, and `stubGlobal` writes the window property instead).
  // The free-identifier lookup that handles it is verified two ways: `typeof`
  // guards it from throwing here (the "no Swagger object" case above passes even
  // though `ui` is undeclared), and a build assertion checks the identifier is
  // not renamed by the minifier (see the bundle check in the build step).
})
