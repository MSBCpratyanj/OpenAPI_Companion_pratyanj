# Sprint 12 — Productivity Tools

**Status:** 🟢 Core delivered (needs real-page verification) · **Phase:** 7 · **Milestone:** M7 (Productivity) · **Epic:** EPIC-08

## Goal
Eliminate repetitive clicks with a fast, keyboard-driven layer over the API docs: global endpoint **search (⌘K)**, **favorites**, **recently-used**, one-click **jump-to-endpoint**, and **copy-as-code** (cURL / Fetch / Axios) — all offline, per-project, and never mutating requests (FDD-009, FR-PROD-001…008).

## What shipped

**Endpoint index (adapter)** — new `SwaggerAdapter.listEndpoints()` enumerates every operation on the page (method, path, summary, tag; de-duped) and `openEndpoint(id)` expands + scrolls an operation into view without executing it. DOM logic isolated in `swagger-endpoint-dom.ts` (risk R-01), unit-tested against synthetic markup.

**`ProductivityService`** (`src/modules/productivity/`)
- **Search** (T-08.2) — live index from the adapter, filtered across method/path/summary/tag, **favorites-first** ordering; synchronous and fast (< 50 ms) because favorites/recents are cached in memory (loaded once via `init()`). `search(query, method?)` also takes an optional **HTTP-method filter**.
- **Favorites** (T-08.3) — `toggleFavorite`, persisted to `productivity/favorites`, appear-first, emits `FAVORITE_TOGGLED`.
- **Recents** (T-08.4) — `recordRecent` with dedup + ring cap, persisted to `productivity/recents`, emits `RECENT_UPDATED`; `open()` records-then-navigates.
- **Code generators** (T-08.5, `codegen.ts`) — pure builders for **cURL / Fetch / Axios** (< 30 ms). Assembles URL (base + path), `Authorization` header from the active credential, and the open request body; JSON bodies are inlined as real objects (fetch/axios) or single-quoted payloads (cURL) so output runs with minimal edits.

**`CommandPalette`** (⌘K / Ctrl+K, plus a search button in the sidebar header) — a single dialog that covers search + favorites + recents + quick actions: empty query shows **Favorites** and **Recent** sections; typing searches live; **method filter chips** (All / GET / POST / PUT / PATCH / DELETE) narrow the list (they apply even with an empty query); each row jumps to the endpoint on click, has a **star** (favorite toggle) and a **code** button that reveals **Copy cURL / Fetch / Axios**. Enter opens the top result; no-match shows an empty state. Works whether the sidebar is expanded or collapsed.

**Events** — `FAVORITE_TOGGLED`, `RECENT_UPDATED` (already in the catalog). **Wiring** — service constructed + `init()`-ed in the content script and threaded through `App → SidebarShell`; the palette is shell-level so ⌘K works globally.

## Validation
| Gate | Result |
|---|---|
| Type-check / Lint / Format | ✅ |
| Unit tests | ✅ **257 passing** (36 files; +29: codegen 6, productivity-service 7, CommandPalette 7, endpoint-dom 5, +4 mock updates) |
| Build | ✅ valid MV3 `dist/` (main bundle 27.5 kB gzip) |
| Perf | ✅ search sync/O(n) filter; code-gen ≪ 30 ms (pure) |

## Design notes / scope
- **Command Palette is the single surface** for search/favorites/recents/quick-actions/copy — matches the "search dialog (Ctrl+K)" deliverable and keeps the 7-tab shell unchanged.
- **Base URL** for code-gen defaults to the page origin (Swagger is usually served from the API host); a per-environment base URL can feed in later.
- Copy-as-code includes the current `Authorization` header — copying is an explicit user action (business rule), so this is intentional; the value only appears when the user opens the code actions.
- Edge cases: no-results empty state, collapsed-sidebar (⌘K still works), large specs (linear filter over the live index).

## ⚠️ Needs real-page verification
Press **⌘K** (or the header search icon) on a real Swagger page → confirm the endpoint list loads, search filters, clicking a row **scrolls to & expands** that operation, the **star** persists across reload, **Recent** updates, and **Copy cURL/Fetch/Axios** produce runnable snippets.

## Next
Verify on the real page; then **Sprint 13 — Settings & Import/Export** (theme, storage metrics, export/import/backup, reset) → **feature-complete MVP (M8)**.
