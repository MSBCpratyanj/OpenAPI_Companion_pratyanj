/**
 * Content-script agent.
 *
 * The UI now lives in the native Side Panel (a separate page). This script is
 * the headless "agent" in the Swagger page: it detects the doc, identifies the
 * project, runs all the ALWAYS-ON behaviors (auth restore + watch, request
 * autosave, history capture, token auto-refresh) so they work whether or not the
 * panel is open, and exposes the page to the panel over messaging — RPC for
 * service/adapter calls, a pushed read-state mirror, and forwarded bus events.
 * It never renders UI into the page.
 */
import { ok } from '@/types'
import { bus } from '@/core/events'
import { StorageService, chromeLocalArea } from '@/core/storage'
import { ProjectService, type ProjectMeta } from '@/core/project'
import { docIdentityUrl } from '@/utils'
import { SwaggerUiAdapter, type AuthSnapshot, type RequestSnapshot } from '@/adapters'
import { ThemeManager, TokenRefreshService } from '@/services'
import { AuthenticationService } from '@/modules/authentication'
import { RequestService } from '@/modules/request'
import { EnvironmentService, type EnvironmentInput } from '@/modules/environment'
import { HistoryService } from '@/modules/history'
import { ProductivityService } from '@/modules/productivity'
import { SwaggerBridge } from './swagger-bridge'
import { mountLauncher } from './launcher'
import type { PaletteHandle } from './palette' // type-only: the module loads lazily
import {
  RPC_REQUEST,
  STATE_PUSH,
  EVENT_PUSH,
  FORWARDED_EVENTS,
  type AdapterReadState,
  type PanelContext,
  type PanelState,
  type RpcResponse,
} from './sidepanel-protocol'

const AGENT_FLAG = 'oacAgent'
const LOG = '[OpenAPI Companion]'

async function boot(): Promise<void> {
  console.info(`${LOG} content agent loaded:`, location.href)
  const bridge = new SwaggerBridge()
  const adapter = new SwaggerUiAdapter(bridge)
  if (!adapter.detect()) {
    console.info(`${LOG} no Swagger UI detected on this page — staying dormant.`)
    return // not an OpenAPI page — stay dormant (EC-005)
  }
  if (document.documentElement.dataset[AGENT_FLAG]) {
    console.info(`${LOG} agent already running in this tab — skipping.`)
    return // avoid double-injection (EC-043)
  }
  document.documentElement.dataset[AGENT_FLAG] = '1'

  const storage = new StorageService({ area: chromeLocalArea(), bus })
  const project = new ProjectService({ storage, bus })
  const identified = await project.identify({
    origin: location.origin,
    openApiUrl: docIdentityUrl(location.href), // stable across Swagger's hash routing
    docType: 'swagger-ui',
  })
  const meta: ProjectMeta | null = identified.ok ? identified.value : null
  if (!meta) {
    console.warn(
      `${LOG} could not identify the project:`,
      identified.ok ? 'no meta' : identified.error,
    )
    return
  }
  console.info(`${LOG} agent ready — project "${meta.name}" (${meta.id}). Open the side panel.`)

  mountLauncher() // floating button to open the panel from the page

  // Endpoint search runs IN THE PAGE (top-centered overlay) — the panel is too
  // narrow for it and can't draw over the doc. Triggered by ⌘K here, or by the
  // panel's search button over RPC.
  const productivity = new ProductivityService({
    adapter,
    storage,
    projectId: meta.id,
    bus,
    baseUrl: location.origin,
  })
  await productivity.init()

  // The palette is the only thing in the page that needs React, so it's loaded on
  // FIRST USE — a static import would make every page in the browser pay ~170 kB
  // of React up front just in case the user hits ⌘K.
  let palette: PaletteHandle | null = null
  const withPalette = async (): Promise<PaletteHandle> => {
    if (palette) return palette
    const { mountPalette } = await import('./palette')
    palette = mountPalette(productivity)
    // Theme it from the shared preference, and re-read when the panel changes it
    // (separate contexts, so the bus doesn't cross the boundary — storage does).
    const paletteTheme = new ThemeManager({ storage, root: palette.themeRoot, bus })
    await paletteTheme.init()
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && Object.keys(changes).some((k) => k.includes('theme'))) {
        void paletteTheme.init()
      }
    })
    return palette
  }

  // Capture phase so Swagger's own inputs can't swallow the shortcut.
  document.addEventListener(
    'keydown',
    (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        void withPalette().then((p) => p.toggle())
      }
    },
    true,
  )

  const auth = new AuthenticationService({ storage, adapter, projectId: meta.id, bus })
  const requests = new RequestService({ storage, adapter, projectId: meta.id, bus })
  const environments = new EnvironmentService({ storage, projectId: meta.id, bus })
  const history = new HistoryService({ storage, adapter, projectId: meta.id, bus })

  let currentEnv = meta.lastActiveEnvId

  // Token auto-refresh (opt-in; toggled from the Auth panel via RPC → runs here).
  let autoRefreshEnabled = await auth.isAutoRefreshEnabled()
  const tokenRefresh = new TokenRefreshService({
    adapter,
    auth,
    templates: requests,
    bus,
    enabled: () => autoRefreshEnabled,
  })
  bus.subscribe(
    'AUTH_EXPIRED',
    (payload) => void tokenRefresh.refreshIfExpired(payload.environmentId),
  )
  bus.subscribe('SETTINGS_UPDATED', (payload) => {
    if (payload.keys.includes('auto-refresh-token')) {
      void auth.isAutoRefreshEnabled().then((on) => (autoRefreshEnabled = on))
    }
  })

  // Always-on: restore auth, auto-restore drafts, watch, and react to DOM changes.
  await auth.restore(currentEnv)
  await requests.autoRestoreOpen(currentEnv)
  let stopAuthWatch = auth.watch(currentEnv)

  // --- Side Panel bridge ----------------------------------------------------

  const buildState = (): PanelState => {
    const context: PanelContext = {
      projectId: meta.id,
      projectName: meta.name,
      docType: meta.docType,
      environmentId: currentEnv,
      pageOrigin: location.origin,
    }
    const adapterState: AdapterReadState = {
      detect: adapter.detect(),
      version: adapter.version(),
      specUrl: adapter.specUrl(),
      auth: adapter.readAuth(),
      openRequests: adapter.readOpenRequests(),
      executedResponses: adapter.readExecutedResponses(),
      endpoints: adapter.listEndpoints(),
    }
    return { context, adapter: adapterState }
  }

  let pushTimer: ReturnType<typeof setTimeout> | null = null
  const pushState = (): void => {
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      void chrome.runtime.sendMessage({ type: STATE_PUSH, state: buildState() }).catch(() => {})
    }, 250)
  }

  adapter.observe(() => {
    requests.autosaveOpen(currentEnv)
    history.scheduleCapture(currentEnv)
    void tokenRefresh.noticeResponses(currentEnv) // 401/403 → auto-refresh (if enabled)
    pushState() // keep the panel's read-mirror fresh
  })

  // Environment switch re-scopes auth + requests (switch runs here via RPC, so
  // its ENVIRONMENT_CHANGED fires on this bus).
  bus.subscribe('ENVIRONMENT_CHANGED', (payload) => {
    void (async () => {
      currentEnv = payload.environmentId
      stopAuthWatch()
      const restored = await auth.restore(currentEnv)
      if (restored.ok && restored.value == null) adapter.clearAuth()
      await requests.autoRestoreOpen(currentEnv)
      stopAuthWatch = auth.watch(currentEnv)
      pushState()
    })()
  })

  // RPC dispatch: "<service|adapter>.<method>" → the real call.
  const rpc: Record<string, (args: unknown[]) => unknown> = {
    'state.get': () => buildState(),
    // Panel's search button → open the in-page palette (top-centered on the doc).
    'palette.open': () => {
      void withPalette().then((p) => p.open())
      return ok(undefined)
    },
    'history.list': ([q]) => history.list((q as Parameters<typeof history.list>[0]) ?? {}),
    'history.get': ([id]) => history.get(id as string),
    'history.replay': ([id]) => history.replay(id as string),
    'history.locate': ([id]) => history.locate(id as string),
    'history.deleteEntry': ([id]) => history.deleteEntry(id as string),
    'history.clearProject': () => history.clearProject(),
    'auth.current': ([env]) => auth.current(env as string),
    'auth.clear': ([env]) => auth.clear(env as string),
    'auth.isAutoRefreshEnabled': () => auth.isAutoRefreshEnabled(),
    'auth.setAutoRefreshEnabled': ([on]) => auth.setAutoRefreshEnabled(on as boolean),
    'requests.listTemplates': () => requests.listTemplates(),
    'requests.saveOpenAsTemplate': ([name, env]) =>
      requests.saveOpenAsTemplate(name as string, env as string),
    'requests.applyTemplate': ([id]) => requests.applyTemplate(id as string),
    'requests.deleteTemplate': ([id]) => requests.deleteTemplate(id as string),
    'environments.list': () => environments.list(),
    'environments.getActiveId': () => environments.getActiveId(),
    'environments.switch': ([id]) => environments.switch(id as string),
    'environments.create': ([input]) => environments.create(input as EnvironmentInput),
    'environments.update': ([id, patch]) =>
      environments.update(id as string, patch as Partial<EnvironmentInput>),
    'environments.delete': ([id]) => environments.delete(id as string),
    'adapter.writeRequest': ([id, data]) =>
      adapter.writeRequest(id as string, data as RequestSnapshot),
    'adapter.replay': ([id, body]) => adapter.replay(id as string, body as string | undefined),
    'adapter.openEndpoint': ([id]) => adapter.openEndpoint(id as string),
    'adapter.writeAuth': ([a]) => adapter.writeAuth(a as AuthSnapshot),
    'adapter.clearAuth': () => adapter.clearAuth(),
  }

  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    const msg = message as { type?: string; method?: string; args?: unknown[] } | null
    if (msg?.type !== RPC_REQUEST || typeof msg.method !== 'string') return false
    const handler = rpc[msg.method]
    if (!handler) {
      sendResponse({ ok: false, error: `Unknown method: ${msg.method}` } satisfies RpcResponse)
      return false
    }
    void (async () => {
      try {
        sendResponse({ ok: true, value: await handler(msg.args ?? []) } satisfies RpcResponse)
      } catch (cause) {
        sendResponse({
          ok: false,
          error: cause instanceof Error ? cause.message : String(cause),
        } satisfies RpcResponse)
      }
    })()
    return true
  })

  // Forward selected bus events to the panel (best-effort; ignored if closed).
  for (const name of FORWARDED_EVENTS) {
    ;(bus.subscribe as (n: string, h: (p: unknown) => void) => void)(name, (payload) => {
      void chrome.runtime.sendMessage({ type: EVENT_PUSH, name, payload }).catch(() => {})
    })
  }

  pushState() // initial mirror for any already-open panel
}

void boot()
