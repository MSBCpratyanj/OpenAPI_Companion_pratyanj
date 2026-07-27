import { describe, it, expect, afterEach } from 'vitest'
import { listEndpoints, openEndpoint } from './swagger-endpoint-dom'

function section(tag: string, blocks: string): string {
  return `<div class="opblock-tag-section"><h4 class="opblock-tag" data-tag="${tag}"></h4>${blocks}</div>`
}
function block(method: string, path: string, summary = '', open = false): string {
  return `
    <div class="opblock ${open ? 'is-open' : ''}">
      <button class="opblock-summary opblock-summary-control">
        <span class="opblock-summary-method">${method}</span>
        <span class="opblock-summary-path" data-path="${path}">${path}</span>
        <div class="opblock-summary-description">${summary}</div>
      </button>
    </div>`
}

describe('swagger-endpoint-dom', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('lists every operation with method, path, summary, and tag', () => {
    document.body.innerHTML = section(
      'Users',
      block('GET', '/users', 'List users') + block('POST', '/users', 'Create user'),
    )
    const endpoints = listEndpoints(document)
    expect(endpoints).toEqual([
      {
        endpointId: 'get /users',
        method: 'get',
        path: '/users',
        summary: 'List users',
        tag: 'Users',
      },
      {
        endpointId: 'post /users',
        method: 'post',
        path: '/users',
        summary: 'Create user',
        tag: 'Users',
      },
    ])
  })

  it('de-duplicates repeated endpoint ids', () => {
    document.body.innerHTML = block('GET', '/ping') + block('GET', '/ping')
    expect(listEndpoints(document)).toHaveLength(1)
  })

  it('openEndpoint clicks to expand a collapsed operation and returns true', () => {
    document.body.innerHTML = block('GET', '/users')
    const summary = document.querySelector('.opblock-summary-control')!
    let clicks = 0
    summary.addEventListener('click', () => (clicks += 1))
    // No-op scheduler: assert only the synchronous first click.
    expect(openEndpoint(document, 'get /users', { setTimeoutFn: () => 0 })).toBe(true)
    expect(clicks).toBe(1)
  })

  it('openEndpoint polls until the block reports open, without re-clicking', () => {
    document.body.innerHTML = block('GET', '/users')
    const el = document.querySelector('.opblock')!
    let clicks = 0
    el.querySelector('.opblock-summary-control')!.addEventListener('click', () => (clicks += 1))
    // Emulate Swagger's async re-render: the block opens only on the next poll.
    const setTimeoutFn = (fn: () => void) => {
      el.classList.add('is-open')
      fn()
      return 0
    }
    expect(openEndpoint(document, 'get /users', { setTimeoutFn })).toBe(true)
    expect(clicks).toBe(1) // clicked once; next poll saw is-open → no re-click
    expect(el.classList.contains('is-open')).toBe(true)
  })

  it('openEndpoint does not click an already-open operation', () => {
    document.body.innerHTML = block('GET', '/users', '', true)
    const summary = document.querySelector('.opblock-summary-control')!
    let clicks = 0
    summary.addEventListener('click', () => (clicks += 1))
    expect(openEndpoint(document, 'get /users', { setTimeoutFn: () => 0 })).toBe(true)
    expect(clicks).toBe(0)
  })

  it('openEndpoint returns false for a missing endpoint', () => {
    document.body.innerHTML = block('GET', '/users')
    expect(openEndpoint(document, 'get /missing')).toBe(false)
  })
})
