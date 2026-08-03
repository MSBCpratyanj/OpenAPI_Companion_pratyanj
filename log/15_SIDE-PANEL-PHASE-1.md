# Native Side Panel — Phase 1 (read-only)

**Status:** 🟢 Phase 1 delivered (needs real-browser verification) · **Source:** PO request — "make this a sidebar extension" → chose Chrome's native Side Panel

## Background / why phased
The current sidebar is **injected into the Swagger page** (content script, Shadow DOM), so it can touch the DOM directly. Chrome's **native Side Panel** is a separate extension page docked in the browser edge — it **cannot** touch the page DOM, so every Swagger interaction must go through a **message bridge to the content script**. (The PO's "backup folder" turned out to be an older copy of this same project — no different sidebar to reuse.) So this is built in phases, keeping the injected sidebar fully working throughout.

## Phase 1 — what shipped (read-only companion)
- **Native side panel enabled.** Manifest gains the `sidePanel` permission + `side_panel.default_path`; `minimum_chrome_version` bumped to 114 (Side Panel API). The background worker calls `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`, so **clicking the toolbar icon opens the panel** (the old version-only popup was removed).
- **Side panel app** (`src/sidepanel/`): a normal React page (Tailwind, themed by toggling `.dark` on the page root via the existing `ThemeManager`). On open — and on tab-switch / page-load — it asks the active tab's content script for a snapshot and renders **project name + id, auth status, and the History list** (method/status badges + full path). Friendly "Open a Swagger page" state when the tab has no OpenAPI Companion.
- **Message bridge** (`src/content/sidepanel-protocol.ts` + a listener in the content script): the panel sends `oac:getSnapshot`; the content script replies with a serializable snapshot built from its live services (`auth.current`, `history.list`, project meta). Read-only for now — no page mutation.

The injected in-page sidebar is unchanged and remains the interactive surface; the two coexist.

## Validation
| Gate | Result |
|---|---|
| Type-check / Lint / Format | ✅ |
| Unit tests | ✅ **337 passing** (44 files; +3 SidePanelApp) |
| Build | ✅ `dist/src/sidepanel/index.html` emitted; manifest has `side_panel` + `sidePanel` perm; toolbar opens the panel |

## Design notes
- Snapshot reads are pushed on request (pull model) and refreshed on `chrome.tabs.onActivated` / `onUpdated` — so the panel follows the active tab (the native panel is one instance per window, unlike the per-page injected sidebar).
- The bridge kept the message shape decoupled from internal types (`SnapshotHistoryItem`), so the protocol stays stable.
- `SidePanelApp` takes an injectable `fetchSnapshot`, so it's testable without mocking `chrome`.

## ⚠️ Needs real-browser verification
Reload the unpacked extension → click the toolbar icon → the **native side panel** opens on the right edge. On a Swagger tab it shows the project + auth + history; switching tabs updates it; a non-Swagger tab shows the connect prompt.

## Phase 2 — interactive bridge (in progress)

PO chose: make it interactive **and replace the injected sidebar**. Because the
extension's automatic behaviors (auth restore, autosave, history capture, token
refresh) must run even when the panel is closed, the **services stay in the
content script**; the panel is a **remote UI**. So the replace happens *after*
every panel reaches parity — never shipping a half-working replace.

**Foundation shipped (this step):**
- **Generic RPC** (`RPC_REQUEST`): the panel calls `"<service>.<method>"` on the
  active tab's content script; the content script dispatches to the real service
  and returns its `Result`. `bridge.ts#rpcResult` turns transport failures into
  an err Result so the UI never crashes.
- **Event forwarding** (`EVENT_PUSH` + `FORWARDED_EVENTS`): the content script
  mirrors bus events (HISTORY_RECORDED, AUTH_*, NOTIFY, …) to the panel's local
  bus, so `useEventBus`-driven refreshes and toasts work across the boundary.
- **History is fully interactive in the panel**: the real `HistoryPanel`
  component (unchanged) runs against a **remote** `HistoryPanelService` proxy —
  search, detail modal, ⋮ menu (Replay / Locate / Delete), Clear — all over the
  bridge, with a `ToastLayer` for errors. This proves the whole architecture
  end-to-end. A test drives Replay through the remote service.

## Phase 2 — COMPLETE (injected sidebar removed)

Every panel now runs in the native side panel, and the in-page injected sidebar
is gone. The content script is a **headless agent**; the panel is the whole UI.

**Content script → headless agent (`src/content/index.tsx`)**
- No longer imports React / `App` / `ThemeManager` / `shadowCss`, and never
  mounts a shadow root. Guards double-injection via
  `documentElement.dataset.oacAgent`.
- Owns every **always-on** behavior so they run whether or not the panel is
  open: auth `restore` + `watch`, request `autosaveOpen` / `autoRestoreOpen`,
  history `scheduleCapture`, and token `noticeResponses` (401/403 auto-refresh)
  — all driven off a single `adapter.observe(...)`.
- Publishes a `buildState()` mirror (context + adapter read-state) with a
  debounced (250 ms) `pushState()`, answers `RPC_REQUEST` from a dispatch table
  covering history / auth / requests / environments / adapter methods, and
  forwards `FORWARDED_EVENTS` to the panel's bus.

**Panel = remote UI (`src/sidepanel/*`)**
- `PanelShell.tsx` hosts the full experience by reusing the **unchanged**
  `PanelOutlet`, `Tabs`, `CommandPalette` and `ToastLayer` — same components the
  injected sidebar used. Header carries the ⌘K search + theme cycle; ⌘K/Ctrl-K
  opens the palette.
- `main.tsx`: `fetchState()` → if no Swagger context, an EmptyState connect
  prompt; otherwise it builds the storage/bus/theme, starts the bridge, and
  renders `PanelShell` with **remote service proxies** (Auth, Requests,
  Environments, History) plus the **real** Fake Data / Productivity services
  running against a `RemoteSwaggerAdapter`, and local Settings / Import-Export
  (storage is shared). Reloads itself when the active tab's project changes.
- `bridge.ts`: `RemoteSwaggerAdapter` (sync reads from the mirrored state cache;
  writes are fire-and-forget commands), the RPC helpers (`rpc` / `rpcResult` /
  `rpcValue`), and `startBridge` (STATE_PUSH → cache + notify, EVENT_PUSH →
  local bus). **Multi-tab safety:** the panel binds to the active tab and
  ignores state pushes whose `sender.tab.id` is a *different* Swagger tab.
- `SidePanelApp` (the Phase-1 read-only view) and its test were deleted;
  `PanelShell.test.tsx` replaces them (header/tabs/dashboard, interactive
  History tab, ⌘K palette).

| Gate | Result |
|---|---|
| Type-check / Lint / Format | ✅ (0 warnings) |
| Unit tests | ✅ **337 passing** (44 files) |
| Build | ✅ `dist/src/sidepanel/index.html` emitted; content script is headless (no injected mount); manifest has `side_panel`, no `action.default_popup` |

### Post-migration fix — `host_permissions` (panel couldn't talk to the page)
First real-browser check surfaced a regression: the panel showed **"No OpenAPI
page connected"** on a valid Swagger tab. Root cause: the panel is a separate
extension page that reaches the agent via `chrome.tabs.sendMessage`, which needs
**host permission** for the target tab. `activeTab` only grants that transiently
for the just-invoked tab and doesn't survive tab switches, so the persistent
panel's RPCs failed → `fetchState` fell back to `context: null`. Fixes:
- Added standing `host_permissions: ['http://*/*', 'https://*/*']` (mirrors the
  content-script match patterns, so no new install warning). This is the
  substantive fix — RPC now works on every tab, including after switches.
- **Self-heal in `main.tsx`:** the content script boots async (`document_idle` +
  async `identify`), so opening the panel on an already-loaded tab could lose the
  boot race and stick on the empty state. The empty state now re-checks on tab
  activate/update **and on the agent's first `STATE_PUSH`**, reloading once the
  active tab reports a context.

### Two more ways to open the panel (toolbar click was the only one)
Users shouldn't have to hunt for the toolbar icon, so alongside it:
- **Keyboard shortcut** — manifest `commands: open-side-panel`
  (`⌘⇧O` / `Ctrl+Shift+O`, rebindable at `chrome://extensions/shortcuts`). The
  background's `commands.onCommand` calls `chrome.sidePanel.open()` for the
  active tab (the command invocation is a user gesture, so `open()` is allowed).
- **In-page launcher** — `src/content/launcher.ts` injects a small floating
  button showing the **app icon** (`icons/icon-128.png` via
  `chrome.runtime.getURL`; icons added to `web_accessible_resources`, merged with
  crxjs's JS-chunk entries) — shadow-isolated, bottom-right, on detected Swagger
  pages. Clicking it messages the background (`OPEN_PANEL_REQUEST`); mounted from
  the agent boot after project identification.
- **Toggle (open ⇄ close):** the launcher and the shortcut both *toggle*. While
  open, the panel holds a `PANEL_PORT` connection and announces its window
  (`{ hello, windowId }`); the background tracks `openPanels` by window. A
  trigger closes the panel (`postMessage({ close })` → `window.close()`) if that
  window already has one open, else opens it. Port disconnect (panel closed any
  way — our button, the native ✕, or the toolbar) clears the entry, so state
  stays correct. (The toolbar icon toggles natively via `openPanelOnActionClick`.)
- `minimum_chrome_version` bumped **114 → 116** (programmatic `sidePanel.open()`
  needs 116; the earlier toolbar-click-to-open worked from 114).

### Endpoint search moved OUT of the panel, into the page
PO feedback: the palette was cramped inside the ~400px panel column. A command
palette wants to be a wide, top-centered overlay — but the side panel is a
separate browser page and **cannot draw over the Swagger doc**, so the palette
had to move to where the doc is:
- `src/content/palette.tsx` mounts the **unchanged** `CommandPalette` into a
  Shadow DOM in the page via an imperative handle (`open/close/toggle`), since
  its triggers live outside React. `Dialog` gained `align="top"` (palettes are
  top-aligned; detail modals stay centered).
- Theming: `.dark` is toggled on the **inner mount node**, not the shadow host —
  a class selector can't match the host from inside the shadow tree. A
  `chrome.storage.onChanged` hook re-reads the preference when the panel changes
  it (the bus doesn't cross contexts; storage does).
- Triggers: ⌘K on the page (capture phase, so Swagger's inputs can't swallow it)
  and the panel's search button → `palette.open` RPC → same overlay. The panel no
  longer renders a palette or holds a ProductivityService.
- **Lazy-loaded:** the palette is the only in-page code needing React, so it's a
  dynamic `import()`. Verified in the build that the content chunk references
  React only inside `__vite__mapDeps` (the dynamic-import dep list) — so browsing
  any non-Swagger page no longer pays ~170 kB of React up front.

### Home tab is a real dashboard now
PO: *"this home page look too much empty"* — correct, and it was worse than empty:
the Dashboard was untouched Sprint-3 scaffolding still promising that modules
*"light up the tabs above as they ship"* (all 7 had shipped), and `PanelOutlet`
still carried a dead `PLACEHOLDERS` map advertising "Arrives in Sprint 4".

`src/sidebar/Dashboard.tsx` (extracted from `PanelOutlet`, now its own module):
- **Project + spec** — name, origin, Swagger version badge, endpoint count, and
  an inline **environment switcher** (no trip to the Env tab).
- **Auth card** — Active / Expired / Not signed in, credential type, a live
  expiry countdown, and the auto-refresh state.
- **Recent** — last 5 calls with method + status badges; click locates the
  endpoint in the doc; "View all" jumps to History.
- **Totals** — calls, failures (≥400), saved templates.
- **Quick actions** — Search (⌘K → the in-page palette), Templates, Fake data,
  and a one-click Backup.

It reads through the **same panel services** as the other tabs (already passed to
`PanelOutlet`, previously ignored), so it can't drift from them, and refreshes on
HISTORY_RECORDED / AUTH_* / TEMPLATE_SAVED / ENVIRONMENT_CHANGED. `statusOf` moved
out of `AuthPanel` into `authentication/status.ts` so the panel and the dashboard
can't disagree about what "authorized" means. `PanelOutlet`'s placeholder copy is
now an honest "not connected to the page yet" fallback.

### ⚠️ Needs real-browser verification
Reload the unpacked extension → open a Swagger tab → click the toolbar icon: the
native panel shows every tab (Dashboard, Auth, Requests, Environments, History,
Fake Data, Settings) and ⌘K endpoint search — all interactive over the bridge.
Confirm nothing renders *inside* the Swagger page anymore, **except** the small
floating launcher button (bottom-right, showing the app icon) and the ⌘K palette
overlay. Verify the launcher and the `⌘⇧O` shortcut both **toggle** the panel
(open when closed, close when open), and that **⌘K** opens a wide, top-centered
search overlay over the doc — in the right theme — from both the page and the
panel's search button.
