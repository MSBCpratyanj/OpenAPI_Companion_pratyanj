/**
 * In-page launcher button.
 *
 * The UI lives in the native side panel, which the user normally opens from the
 * toolbar icon. To open it from where the developer actually is — on the Swagger
 * page — this injects a small floating button. Clicking it messages the
 * background worker, which calls `chrome.sidePanel.open()` (the click's user
 * gesture carries across so the call is allowed).
 *
 * Firefox is different: `sidebarAction.open()` may only be called from inside a
 * direct user-input handler, and a message received in the background doesn't
 * qualify — content scripts also can't call `sidebarAction` themselves. So the
 * page genuinely cannot open Firefox's sidebar; there the button shows a short
 * hint pointing to the toolbar icon / keyboard shortcut instead.
 *
 * It's rendered inside a shadow root so the page's CSS can't touch it and its
 * styles can't leak onto the page.
 */
import { OPEN_PANEL_REQUEST } from './sidepanel-protocol'

const HOST_ID = 'oac-launcher-host'

/** Firefox can't open its sidebar from a page click — evaluated at mount. */
function isFirefox(): boolean {
  return typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent)
}

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
.hint {
  position: fixed;
  right: 20px;
  bottom: 76px;
  max-width: 220px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #1f2937;
  color: #e5e7eb;
  font: 12px/1.4 system-ui, sans-serif;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease;
}
.hint.show { opacity: 1; visibility: visible; }
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
  const firefox = isFirefox()
  button.title = firefox ? 'OpenAPI Companion (open from the toolbar)' : 'OpenAPI Companion'
  button.append(icon)

  // Firefox can't open its sidebar from a page click (see file header) — guide
  // the user to the toolbar icon / shortcut instead of failing silently.
  const hint = doc.createElement('span')
  hint.className = 'hint'
  hint.setAttribute('role', 'status')
  hint.textContent = 'Firefox opens the panel from the toolbar icon, or press Ctrl+Shift+O.'
  let hintTimer: ReturnType<typeof setTimeout> | null = null

  button.addEventListener('click', () => {
    if (firefox) {
      hint.classList.add('show')
      if (hintTimer) clearTimeout(hintTimer)
      hintTimer = setTimeout(() => hint.classList.remove('show'), 4500)
      return
    }
    // Chrome: background decides open vs close (toggle) based on panel state.
    void chrome.runtime.sendMessage({ type: OPEN_PANEL_REQUEST }).catch(() => {})
  })

  shadow.append(style, hint, button)
  ;(doc.body ?? doc.documentElement).append(host)

  return () => host.remove()
}
