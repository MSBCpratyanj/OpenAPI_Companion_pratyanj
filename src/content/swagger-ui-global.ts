/**
 * Finding Swagger's system object in the page.
 *
 * Templates disagree on how they expose it:
 *  - swagger-ui-dist's own `index.html`, DRF's templates, and most hand-rolled
 *    pages do `window.ui = SwaggerUIBundle(...)` — a plain window property.
 *  - **FastAPI's `/docs`** does `const ui = SwaggerUIBundle(...)`. A top-level
 *    `const` in a classic script goes into the global *lexical* environment, so
 *    it is **not** a property of `window` — `window.ui` is `undefined` there.
 *
 * A free identifier reference still finds the second case, because a module's
 * scope chain ends at that same global environment (whose declarative record
 * holds the `const`). `typeof` guards it so a page with no `ui` at all can't
 * throw a ReferenceError.
 */

export interface SwaggerUiGlobal {
  getConfigs?: () => { url?: string; urls?: Array<{ url: string }> } | undefined
  getState?: () => { toJS?: () => unknown } | undefined
  authActions?: {
    authorize?: (payload: Record<string, unknown>) => void
    logout?: (schemeNames: string[]) => void
  }
  preauthorizeApiKey?: (name: string, value: string) => void
}

/**
 * Does this look like Swagger's system object? Checked because `ui` is a common
 * variable name — an unrelated page global must not be mistaken for Swagger.
 */
export function isSwaggerUi(value: unknown): value is SwaggerUiGlobal {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as SwaggerUiGlobal
  return (
    typeof candidate.getConfigs === 'function' ||
    typeof candidate.getState === 'function' ||
    typeof candidate.preauthorizeApiKey === 'function' ||
    (typeof candidate.authActions === 'object' && candidate.authActions !== null)
  )
}

// Ambient: may exist as a page-level `const ui` (FastAPI). Emits nothing, so the
// reference below stays a free identifier and resolves against the page's global
// lexical environment at runtime.
declare const ui: unknown

/** Swagger's system object, however the page exposed it. */
export function resolveSwaggerUi(): SwaggerUiGlobal | undefined {
  const fromWindow = (window as unknown as { ui?: unknown }).ui
  if (isSwaggerUi(fromWindow)) return fromWindow

  const fromLexical: unknown = typeof ui !== 'undefined' ? ui : undefined
  return isSwaggerUi(fromLexical) ? fromLexical : undefined
}
