import type { EndpointInfo } from '../types'
import { endpointIdOf } from './swagger-request-dom'

/**
 * DOM helpers for enumerating and navigating Swagger operations (for the
 * Productivity endpoint index). Reads the shared page DOM directly. Selectors
 * are the per-version-tunable part (risk R-01) and are unit-tested against a
 * synthetic structure.
 */

const ANY_BLOCK = '.opblock'
const TAG_SECTION = '.opblock-tag-section'
const SUMMARY_CONTROL = '.opblock-summary-control'
const SUMMARY = '.opblock-summary'
const SUMMARY_DESC = '.opblock-summary-description'

/** The tag/section name an operation block belongs to, if any. */
function tagOf(block: Element): string | undefined {
  const section = block.closest(TAG_SECTION)
  const tag =
    section?.querySelector('[data-tag]')?.getAttribute('data-tag') ??
    section?.querySelector('.opblock-tag')?.getAttribute('data-tag') ??
    section?.querySelector('.opblock-tag a, .opblock-tag span')?.textContent?.trim()
  return tag || undefined
}

/** All operations on the page, in document order. */
export function listEndpoints(doc: Document = document): EndpointInfo[] {
  const out: EndpointInfo[] = []
  const seen = new Set<string>()
  for (const block of Array.from(doc.querySelectorAll(ANY_BLOCK))) {
    const endpointId = endpointIdOf(block)
    if (!endpointId || seen.has(endpointId)) continue
    seen.add(endpointId)
    const [method = 'get', path = ''] = endpointId.split(' ')
    const summary = block.querySelector(SUMMARY_DESC)?.textContent?.trim() || undefined
    out.push({ endpointId, method, path, summary, tag: tagOf(block) })
  }
  return out
}

export interface OpenEndpointOptions {
  /** Poll interval while waiting for the expand to render (ms). */
  pollMs?: number
  /** Give up expanding after this long (ms). */
  timeoutMs?: number
  /** Injectable for tests. */
  setTimeoutFn?: (fn: () => void, ms: number) => unknown
}

function scrollTo(el: Element): void {
  ;(el as HTMLElement).scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

/**
 * Reveal an operation: scroll it into view and expand it (no execute) — the
 * "Locate" action. Returns false only if the endpoint isn't on the page.
 *
 * Swagger expands asynchronously (React re-render), and a single synchronous
 * click was unreliable across versions (the same issue `autoExecute` solved for
 * Replay). So this clicks the summary control ONCE, then polls until the block
 * reports `is-open` and re-scrolls (the expanded block is taller) — never
 * re-clicking, so it can't toggle the block shut.
 */
export function openEndpoint(
  doc: Document,
  endpointId: string,
  opts: OpenEndpointOptions = {},
): boolean {
  const pollMs = opts.pollMs ?? 120
  const timeoutMs = opts.timeoutMs ?? 3000
  const schedule = opts.setTimeoutFn ?? ((fn, ms) => setTimeout(fn, ms))

  const find = (): Element | null =>
    Array.from(doc.querySelectorAll(ANY_BLOCK)).find((b) => endpointIdOf(b) === endpointId) ?? null

  const initial = find()
  if (!initial) return false
  scrollTo(initial) // start moving toward it immediately

  let waited = 0
  let expandClicked = false
  const tick = (): void => {
    const block = find()
    if (!block) return // left the page — stop
    if (block.classList.contains('is-open')) {
      scrollTo(block) // re-centre now that it's expanded (taller)
      return
    }
    if (!expandClicked) {
      const control =
        block.querySelector<HTMLElement>(SUMMARY_CONTROL) ??
        block.querySelector<HTMLElement>(SUMMARY)
      control?.click()
      expandClicked = true
    }
    waited += pollMs
    if (waited <= timeoutMs) schedule(tick, pollMs)
  }
  tick()
  return true
}
