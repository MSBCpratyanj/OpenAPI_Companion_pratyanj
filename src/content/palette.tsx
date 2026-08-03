/**
 * In-page command palette.
 *
 * The side panel is a separate browser page, so it physically cannot draw over
 * the Swagger doc — a palette rendered there is stuck in a ~400px column. So the
 * content script renders it in the PAGE instead: a top-centered overlay with the
 * width a search UI deserves, inside a Shadow DOM so our styles and Swagger's
 * can't reach each other.
 *
 * Imperative handle (rather than React state) because the triggers live outside
 * React: a ⌘K keydown on the page and an RPC from the panel's search button.
 */
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import shadowCss from '@/styles/index.css?inline'
import { CommandPalette, type ProductivityPanelService } from '@/modules/productivity'

const HOST_ID = 'oac-palette-host'

export interface PaletteHandle {
  open(): void
  close(): void
  toggle(): void
  isOpen(): boolean
  /**
   * The inner mount node. ThemeManager must toggle `.dark` HERE, not on the
   * shadow host: a class selector can't match the host from inside the shadow
   * tree, but tokens set on this node cascade to the whole palette.
   */
  themeRoot: HTMLElement
  destroy(): void
}

/** Inject the palette overlay (closed). Renders nothing until opened. */
export function mountPalette(
  service: ProductivityPanelService,
  doc: Document = document,
): PaletteHandle {
  doc.getElementById(HOST_ID)?.remove() // drop a stale host from a prior injection

  const host = doc.createElement('div')
  host.id = HOST_ID
  const shadow = host.attachShadow({ mode: 'open' })

  const style = doc.createElement('style')
  style.textContent = shadowCss
  const mount = doc.createElement('div')
  shadow.append(style, mount)
  ;(doc.body ?? doc.documentElement).append(host)

  const root: Root = createRoot(mount)
  let open = false

  // Function declarations (hoisted) so paint/closePalette can reference each other.
  function paint(): void {
    root.render(
      open ? (
        <StrictMode>
          <CommandPalette service={service} onClose={closePalette} />
        </StrictMode>
      ) : null,
    )
  }

  function closePalette(): void {
    if (!open) return
    open = false
    paint()
  }

  return {
    open: () => {
      if (open) return
      open = true
      paint() // remounts fresh, so the query starts empty every time
    },
    close: closePalette,
    toggle: () => {
      open = !open
      paint()
    },
    isOpen: () => open,
    themeRoot: mount,
    destroy: () => {
      root.unmount()
      host.remove()
    },
  }
}
