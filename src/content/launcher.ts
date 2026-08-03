/**
 * In-page launcher button.
 *
 * The UI lives in the native side panel, which the user normally opens from the
 * toolbar icon. To open it from where the developer actually is — on the Swagger
 * page — this injects a small floating button. Clicking it messages the
 * background worker, which calls `chrome.sidePanel.open()` (the click's user
 * gesture carries across so the call is allowed).
 *
 * It's rendered inside a shadow root so the page's CSS can't touch it and its
 * styles can't leak onto the page.
 */
import { OPEN_PANEL_REQUEST } from './sidepanel-protocol'

const HOST_ID = 'oac-launcher-host'

const STYLE = `
:host { all: initial; }
button {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 48px;
  height: 48px;
  padding: 0;
  border: none;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  display: block;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35));
  transition: transform 0.12s ease, filter 0.12s ease;
}
button:hover { transform: translateY(-1px) scale(1.06); filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.45)); }
button:active { transform: scale(0.96); }
button:focus-visible { outline: 2px solid #86efac; outline-offset: 3px; }
img { width: 48px; height: 48px; display: block; border-radius: 12px; }
@media (prefers-reduced-motion: reduce) { button { transition: none; } }
`

/** Inject the floating launcher (shows the app icon). Idempotent. Returns a remover. */
export function mountLauncher(doc: Document = document): () => void {
  if (doc.getElementById(HOST_ID)) return () => {}

  const host = doc.createElement('div')
  host.id = HOST_ID
  const shadow = host.attachShadow({ mode: 'open' })

  const style = doc.createElement('style')
  style.textContent = STYLE

  const icon = doc.createElement('img')
  icon.src = chrome.runtime.getURL('icons/icon-128.png')
  icon.alt = ''

  const button = doc.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-label', 'Toggle OpenAPI Companion')
  button.title = 'OpenAPI Companion'
  button.append(icon)
  button.addEventListener('click', () => {
    // Background decides open vs close (toggle) based on panel state.
    void chrome.runtime.sendMessage({ type: OPEN_PANEL_REQUEST }).catch(() => {})
  })

  shadow.append(style, button)
  ;(doc.body ?? doc.documentElement).append(host)

  return () => host.remove()
}
