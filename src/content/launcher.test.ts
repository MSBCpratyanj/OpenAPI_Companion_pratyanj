import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountLauncher } from './launcher'
import { OPEN_PANEL_REQUEST } from './sidepanel-protocol'

describe('mountLauncher', () => {
  const sendMessage = vi.fn(() => Promise.resolve())

  beforeEach(() => {
    sendMessage.mockClear()
    vi.stubGlobal('chrome', {
      runtime: { sendMessage, getURL: (p: string) => `chrome-extension://test/${p}` },
    })
    document.body.innerHTML = ''
  })
  afterEach(() => vi.unstubAllGlobals())

  const button = () =>
    document.getElementById('oac-launcher-host')?.shadowRoot?.querySelector('button') ?? null

  it('injects a shadow-isolated launcher button showing the app icon', () => {
    mountLauncher()
    const host = document.getElementById('oac-launcher-host')
    expect(host).not.toBeNull()
    expect(host?.shadowRoot).not.toBeNull() // styles/markup are isolated
    expect(button()?.getAttribute('aria-label')).toBe('Toggle OpenAPI Companion')
    const img = host?.shadowRoot?.querySelector('img')
    expect(img?.getAttribute('src')).toContain('icons/icon-128.png')
  })

  it('asks the background to open the panel when clicked', () => {
    mountLauncher()
    button()?.click()
    expect(sendMessage).toHaveBeenCalledWith({ type: OPEN_PANEL_REQUEST })
  })

  it('is idempotent — a second mount does not add a second button', () => {
    mountLauncher()
    mountLauncher()
    expect(document.querySelectorAll('#oac-launcher-host')).toHaveLength(1)
  })

  it('removes the launcher when the returned disposer runs', () => {
    const remove = mountLauncher()
    remove()
    expect(document.getElementById('oac-launcher-host')).toBeNull()
  })
})
