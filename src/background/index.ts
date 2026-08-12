/**
 * Background service worker (MV3).
 *
 * Runs the storage migration pipeline on install/update, then stays lightweight.
 * It must remain STATELESS — MV3 terminates the worker aggressively, so durable
 * state is rehydrated from storage on wake (planning/07 §9, risk R-03).
 */
import { APP_NAME } from '@/constants'
import { bus } from '@/core/events'
import { MigrationService, chromeLocalArea } from '@/core/storage'
import { OPEN_PANEL_REQUEST, PANEL_PORT, type PanelPortMessage } from '@/content/sidepanel-protocol'

async function runMigrations(reason: string): Promise<void> {
  const migrations = new MigrationService({ area: chromeLocalArea(), bus })
  // Register schema migrations here as SCHEMA_VERSION increases, e.g.:
  //   migrations.register({ from: 1, to: 2, migrate: async (store) => { ... } })
  const result = await migrations.migrateIfNeeded()
  if (result.ok) {
    console.info(
      `[${APP_NAME}] onInstalled (${reason}); schema ${result.value.from} → ${result.value.to}`,
    )
  } else {
    console.error(`[${APP_NAME}] migration failed (${reason}):`, result.error)
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  void runMigrations(details.reason)
})

// Clicking the toolbar icon opens the native side panel (Chrome 114+).
chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
  console.error(`[${APP_NAME}] could not set side-panel behavior:`, error)
})

// Windows whose side panel is currently open → the panel's port, so we can ask
// it to close itself. Populated while a panel holds a PANEL_PORT connection.
const openPanels = new Map<number, chrome.runtime.Port>()

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PANEL_PORT) return
  let windowId: number | null = null
  port.onMessage.addListener((message: PanelPortMessage) => {
    if (message.type === 'hello') {
      windowId = message.windowId
      openPanels.set(windowId, port)
    }
  })
  port.onDisconnect.addListener(() => {
    if (windowId != null) openPanels.delete(windowId)
  })
})

/**
 * Open the side panel for the given tab. Must be called synchronously within a
 * user gesture (toolbar handles its own; here it's the keyboard command or the
 * in-page launcher click, whose gesture carries into this worker).
 */
function openSidePanel(tab?: chrome.tabs.Tab): void {
  const options =
    tab?.id != null ? { tabId: tab.id } : tab?.windowId != null ? { windowId: tab.windowId } : null
  if (!options) return
  chrome.sidePanel?.open(options).catch((error) => {
    console.error(`[${APP_NAME}] could not open side panel:`, error)
  })
}

/** Toggle: close the panel if this window already has one open, else open it. */
function toggleSidePanel(tab?: chrome.tabs.Tab): void {
  const wid = tab?.windowId
  const open = wid != null ? openPanels.get(wid) : undefined
  if (open) {
    open.postMessage({ type: 'close' } satisfies PanelPortMessage)
    return
  }
  openSidePanel(tab)
}

// Keyboard shortcut (manifest `commands`) → toggle the panel for the active tab.
chrome.commands?.onCommand.addListener((command, tab) => {
  if (command === 'open-side-panel') toggleSidePanel(tab)
})

// Close the side panel whenever the user switches to a different browser tab.
// The panel re-opens automatically if the user navigates back to an OpenAPI page
// via the toolbar icon or keyboard shortcut.
chrome.tabs.onActivated.addListener((activeInfo) => {
  const panel = openPanels.get(activeInfo.windowId)
  if (panel) {
    panel.postMessage({ type: 'close' } satisfies PanelPortMessage)
  }
})

chrome.runtime.onStartup?.addListener(() => {
  console.info(`[${APP_NAME}] service worker started`)
})

// Message bridge (content <-> background).
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'PING') {
    sendResponse({ type: 'PONG', app: APP_NAME })
    return false
  }
  // In-page launcher button → toggle the panel for the sender's tab.
  if (message?.type === OPEN_PANEL_REQUEST) {
    toggleSidePanel(sender.tab)
    return false
  }
  return false
})

export {}
