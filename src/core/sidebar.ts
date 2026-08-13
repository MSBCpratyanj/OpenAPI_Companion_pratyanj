/**
 * Cross-browser control of the extension's docked panel.
 *
 * Chrome exposes `chrome.sidePanel`; Firefox exposes `browser.sidebarAction`.
 * They differ enough — how the toolbar click maps to the panel, and how the
 * panel is opened/closed — that the background worker and the panel page talk to
 * this shim instead of an API directly. Chrome behaviour is unchanged; on
 * Firefox the same intents route to `sidebarAction`.
 *
 * ⚠️ The Firefox paths need real-browser verification (no Firefox in CI). See
 * FIREFOX.md.
 */

interface SidebarActionApi {
  open: () => Promise<void>
  close: () => Promise<void>
  toggle: () => Promise<void>
}

/** Firefox's `browser.sidebarAction`, if present. */
function sidebarAction(): SidebarActionApi | undefined {
  const b = (globalThis as { browser?: { sidebarAction?: SidebarActionApi } }).browser
  return b?.sidebarAction
}

/** True when running on Firefox (sidebar_action) rather than Chrome (sidePanel). */
export function usesSidebarAction(): boolean {
  return typeof chrome === 'undefined' || chrome.sidePanel == null
}

/**
 * Wire "clicking the toolbar icon opens the panel". Call once from the
 * background. Chrome does this natively via `openPanelOnActionClick`; Firefox
 * has no such flag, so the action click toggles the sidebar instead.
 */
export function bindActionToPanel(onError: (e: unknown) => void = () => {}): void {
  if (chrome.sidePanel) {
    void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(onError)
    return
  }
  const sa = sidebarAction()
  if (sa) chrome.action?.onClicked?.addListener(() => void sa.toggle().catch(onError))
}

/**
 * Open the panel for a tab/window. Must be called inside a user gesture. On
 * Chrome this targets the tab/window; on Firefox `sidebarAction.open()` opens it
 * for the current window.
 */
export function openPanelFor(
  tab: chrome.tabs.Tab | undefined,
  onError: (e: unknown) => void,
): void {
  if (chrome.sidePanel) {
    const options =
      tab?.id != null
        ? { tabId: tab.id }
        : tab?.windowId != null
          ? { windowId: tab.windowId }
          : null
    if (options) void chrome.sidePanel.open(options).catch(onError)
    return
  }
  const sa = sidebarAction()
  if (sa) void sa.open().catch(onError)
}

/**
 * Close THIS panel page. Called from inside the panel. Chrome's side panel
 * closes with `window.close()`; Firefox's sidebar needs `sidebarAction.close()`.
 */
export function closeSelf(): void {
  const sa = sidebarAction()
  if (sa) void sa.close().catch(() => {})
  else window.close()
}
