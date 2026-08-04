import type { ExecutedResponse } from '../types'
import { endpointIdOf } from './swagger-request-dom'

/**
 * Reads executed responses from Swagger UI's rendered "live response" DOM
 * (DD-033: capture from the DOM, never intercept the network). Selectors match
 * standard Swagger UI markup and are the part most likely to need per-version
 * tuning (risk R-01) — isolated here and unit-tested against a synthetic block.
 */

const OPEN_BLOCK = '.opblock.is-open'
const LIVE_RESPONSE = '.live-responses-table, .responses-table.live-responses-table'
// Swagger's live-response table has a HEADER row whose cells also carry
// `.response-col_status` ("Code") / `.response-col_description` ("Details") —
// exclude it with `:not(.col_header)` so we read the actual data row.
const STATUS = '.response-col_status:not(.col_header)'
// `pre` first: Swagger nests the Download / Copy buttons INSIDE the highlight
// wrapper, so reading the wrapper's textContent prefixes the body with their
// labels ("Download{\"success\":…") — which is not parseable JSON. The <pre>
// holds just the code; the button-stripping below covers versions that differ.
const BODY =
  '.response-col_description:not(.col_header) pre, .response-col_description:not(.col_header) .microlight, .response-col_description:not(.col_header) .highlight-code'
/** Controls Swagger renders next to the body, whose text is not part of it. */
const NON_BODY = 'button, .copy-to-clipboard, .download-contents, svg'

/**
 * The response body as text, with Swagger's own controls stripped. Read from a
 * clone so the page's DOM is never mutated.
 */
function bodyTextOf(scope: Element): string | undefined {
  const node = scope.querySelector(BODY)
  if (!node) return undefined
  const clone = node.cloneNode(true) as Element
  for (const control of Array.from(clone.querySelectorAll(NON_BODY))) control.remove()
  return clone.textContent?.trim() || undefined
}

function parseStatus(text: string | null | undefined): number | null {
  const match = (text ?? '').match(/\d{3}/)
  return match ? Number(match[0]) : null
}

export function readExecutedResponses(doc: Document = document): ExecutedResponse[] {
  const results: ExecutedResponse[] = []
  for (const block of Array.from(doc.querySelectorAll(OPEN_BLOCK))) {
    const live = block.querySelector(LIVE_RESPONSE)
    if (!live) continue // not executed yet

    const endpointId = endpointIdOf(block)
    if (!endpointId) continue
    const status = parseStatus(live.querySelector(STATUS)?.textContent)
    if (status == null) continue

    const method = endpointId.split(' ')[0] ?? 'unknown'
    const endpoint = endpointId.slice(method.length + 1)
    const responseBody = bodyTextOf(live)
    const requestBody = block.querySelector<HTMLTextAreaElement>('textarea.body-param__text')?.value

    results.push({
      endpointId,
      method,
      endpoint,
      requestBody: requestBody || undefined,
      status,
      responseBody: responseBody || undefined,
    })
  }
  return results
}
