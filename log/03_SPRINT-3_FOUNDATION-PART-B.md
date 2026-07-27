# Sprint 3 — Foundation Part B

**Status:** 🟢 Shell delivered (adapter auth/request read+write continues into Sprint 4) · **Phase:** 1 · **Milestone:** M1 (Foundation) · **Epics:** EPIC-01, EPIC-02

## Goal
Identify the OpenAPI project on a page, isolate all Swagger-DOM coupling behind an adapter, add theming, and wire the detect → identify → mount pipeline end to end.

## What shipped

**`ProjectService`** — `src/core/project/`
- Stable project id = FNV-1a hash of `origin + OpenAPI URL + doc type` (e.g. `project_1a2b3c4d`) → same workspace across refreshes/restarts (**FR-001/003**).
- Creates/loads the project workspace and **guarantees a `default` environment** (the seam that lets Auth/Request be built before the Environment Manager).
- Idempotent; recreates a workspace if metadata is corrupt; publishes `PROJECT_DETECTED`.

**`SwaggerUiAdapter`** — `src/adapters/swagger/` — the **only** code that touches the Swagger DOM/global (isolates risk **R-01**)
- `detect()` (via `#swagger-ui` / `.swagger-ui` / `window.ui`), `version()` (from the swagger-ui-dist script URL), `specUrl()` (from `window.ui` config), and a coarse `observe()` (MutationObserver).
- Auth/request read+write are **stubbed with clear contracts** — they need a real Swagger 3/4/5 fixture matrix and land with the Authentication (Sprint 4–5) and Request (Sprint 6–7) modules.

**`ThemeManager`** — `src/services/`
- Light/dark/system preference (DD-025); persists the choice, applies the `.dark` class **instantly** (no reload — EC-038), and follows the OS setting when on "system".

**Sidebar Shell & Design System** — `src/components/` + `src/sidebar/` (EPIC-02)
- **Tailwind wired into the Shadow DOM** — the compiled stylesheet is injected into the shadow root and tokens are scoped to `:host` so styles never leak in or out of the host page.
- **Design-system components:** `Button`, `IconButton`, `Badge`, `Spinner`, `EmptyState`, `Toast` + `ToastLayer`, `Tabs` (ARIA `tablist` with arrow-key nav). All keyboard-operable and token-themed.
- **`SidebarShell`** — collapsible (state persisted), ARIA tab navigation across 7 sections, a panel outlet (Dashboard shows the live project; other tabs show "arrives in Sprint N" placeholders), header theme toggle, and a **toast layer** driven by `NOTIFY` events (`NotificationService`).
- **Reactive theming** — `useTheme` (via `useSyncExternalStore`) + `useEventBus` hooks; the toggle flips light ↔ dark ↔ system instantly.

**Wiring** — the content script detects Swagger → identifies the project → injects Tailwind + initialises theming → mounts the full shell into an isolated Shadow DOM. On non-OpenAPI pages it stays dormant (**EC-005**). Verified live in a real browser.

## Tasks completed
T-01.10–T-01.13 (adapter detect/version/specUrl, ProjectService + default environment) and **EPIC-02** (T-02.1–T-02.4, T-02.7: shell, tabs, theming, toasts, a11y baseline; core component set).

## Validation
| Gate | Result |
|---|---|
| Type-check / Lint / Format | ✅ |
| Unit tests | ✅ **72 passing** (+39 this sprint) |
| Build | ✅ valid MV3 `dist/` |
| E2E | ✅ 2 passing (+ manually verified sidebar mounts on a real Swagger page) |
| Coverage | overall **85%** · SwaggerAdapter 100% · ProjectService 96% · ThemeManager 91% · components 93% · hooks/shell 100% |

## Continuing / next
- **SwaggerAdapter auth/request read+write** across a Swagger 3/4/5 fixture matrix (the R-01 spike's next iteration; drives Sprint 4).
- Remaining shared components (`Table`, `Dialog`, form inputs) — built alongside the first feature panel that needs them.
- Full **content ↔ background message bridge** (finish T-01.9).

## Next
Sprint 4 — Authentication Manager (persist & auto-restore authorization), which drives the adapter's auth read/write to completion.
