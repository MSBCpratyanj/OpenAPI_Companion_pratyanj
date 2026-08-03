import { describe, it, expect, vi, afterEach } from 'vitest'
import { act } from '@testing-library/react'
import { ok } from '@/types'
import type { ProductivityPanelService } from '@/modules/productivity'
import { mountPalette } from './palette'

/* eslint-disable @typescript-eslint/no-explicit-any -- terse test double */
function service(): ProductivityPanelService {
  return {
    search: vi.fn(() => [
      { endpointId: 'post:/auth/login', method: 'post', path: '/auth/login', favorite: false },
    ]),
    getFavorites: vi.fn(() => []),
    getRecents: vi.fn(() => []),
    toggleFavorite: vi.fn(async () => ok(false)),
    open: vi.fn(async () => ok(undefined)),
    generateCode: vi.fn(() => ok('')),
  } as any
}
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('mountPalette (in-page command palette)', () => {
  afterEach(() => {
    document.getElementById('oac-palette-host')?.remove()
  })

  const shadow = () => document.getElementById('oac-palette-host')?.shadowRoot ?? null
  const dialog = () => shadow()?.querySelector('[role="dialog"]') ?? null

  it('injects a shadow host but renders nothing until opened', () => {
    const palette = mountPalette(service())
    expect(shadow()).not.toBeNull()
    expect(palette.isOpen()).toBe(false)
    expect(dialog()).toBeNull()
    palette.destroy()
  })

  it('opens the palette overlay in the page, top-aligned', () => {
    const palette = mountPalette(service())
    act(() => palette.open())

    const overlay = dialog()
    expect(overlay).not.toBeNull()
    expect(overlay?.getAttribute('aria-label')).toBe('Search endpoints')
    // Top-centered over the doc (not vertically centered like a detail modal).
    expect(overlay?.className).toContain('items-start')
    expect(overlay?.className).toContain('justify-center')
    // `fixed` is what lets it escape the shadow host and cover the viewport.
    expect(overlay?.className).toContain('fixed')
    palette.destroy()
  })

  it('toggles closed again', () => {
    const palette = mountPalette(service())
    act(() => palette.toggle())
    expect(palette.isOpen()).toBe(true)
    act(() => palette.toggle())
    expect(palette.isOpen()).toBe(false)
    expect(dialog()).toBeNull()
    palette.destroy()
  })

  it('exposes the inner mount as the theme root (a class cannot match the host)', () => {
    const palette = mountPalette(service())
    expect(palette.themeRoot.getRootNode()).toBe(shadow())
    expect(palette.themeRoot).not.toBe(document.getElementById('oac-palette-host'))
    palette.destroy()
  })

  it('replaces a stale host instead of stacking overlays', () => {
    const first = mountPalette(service())
    const second = mountPalette(service())
    expect(document.querySelectorAll('#oac-palette-host')).toHaveLength(1)
    first.destroy()
    second.destroy()
  })
})
