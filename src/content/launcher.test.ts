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

  // Firefox can't open its sidebar from a page click, so the button shows a hint
  // pointing to the toolbar / shortcut instead of messaging the background.
  it('shows a hint (and does not message) on Firefox', () => {
    const original = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh) Gecko/20100101 Firefox/128.0',
      configurable: true,
    })
    try {
      mountLauncher()
      const hint = document.getElementById('oac-launcher-host')?.shadowRoot?.querySelector('.hint')
      expect(hint?.classList.contains('show')).toBe(false)

      button()?.click()
      expect(sendMessage).not.toHaveBeenCalled()
      expect(hint?.classList.contains('show')).toBe(true)
    } finally {
      Object.defineProperty(navigator, 'userAgent', { value: original, configurable: true })
    }
  })
})
