# Sprint 4 — Authentication Manager

**Status:** ✅ Verified working on real Swagger UI (capture → store → auto-restore) · **Phase:** 2 · **Milestone:** M2 (Authentication Complete) · **Epic:** EPIC-03

> **Verified 2026-07-01** against a live OAS 2.0 API (DWERP) using a `Bearer (apiKey, in: header)` scheme: authorizing in Swagger is captured and shown in the Auth panel; after a page refresh the extension re-authorizes Swagger automatically.

## Goal
Persist the authorization a developer enters in Swagger's "Authorize" dialog and **auto-restore it across refreshes**, scoped per project + environment. The single highest-impact feature (DD-015, FR-004).

## What shipped

**SwaggerAdapter auth integration** (`src/adapters/swagger/`) — the R-01 spike, auth portion
- Real `readAuth()` / `writeAuth()` / `clearAuth()` via `window.ui` (Swagger's Redux state + `authActions` / `preauthorizeApiKey`) — the same mechanism Swagger's own dialog uses.
- Supports Bearer, API Key, and Basic schemes; captures the security-scheme name so restore targets the right scheme.

**`AuthenticationService`** (`src/modules/authentication/`)
- `save` / `current` / `captureFromSwagger` / `validate` / `restore` / `clear`, all env-scoped and returning `Result<T>`.
- **JWT-aware:** detects JWT tokens and reads the `exp` claim; an **expired** credential is *not* re-injected and is **kept** (not deleted) so the user can see and replace it (EC-008). Emits `AUTH_EXPIRED`.
- **`watch()`** — polls Swagger and auto-saves when the authorized token changes (the auto-capture path), returning an unsubscribe.
- Publishes `AUTH_UPDATED` / `AUTH_RESTORED` / `AUTH_CLEARED` / `AUTH_EXPIRED`. **Tokens are never logged** (security §1.9).

**`AuthPanel`** (Auth tab) — status badge (Authorized / Expired), type + scheme, **masked credential with reveal toggle** (never auto-copied), a Clear button, and live updates via the auth events. Empty state guides the user to Swagger's Authorize button.

**JWT util** (`src/utils/jwt.ts`) — `isJwt` + `decodeJwtExpiryMs` (reads `exp`; no signature verification).

**Wiring** — on a detected project the content script creates the service, **restores** the stored credential on load, starts the watcher, and renders the live `AuthPanel` in the Auth tab.

## Edge cases handled
EC-008 (expired token kept, not looped), EC-009 (invalid → not restored), EC-010 (type change via re-capture), EC-011 (logout → clear). Per-project + per-environment isolation (FR-024).

## Validation
| Gate | Result |
|---|---|
| Type-check / Lint / Format | ✅ |
| Unit tests | ✅ **97 passing** (+25 this sprint: adapter auth 9, auth-service 10, AuthPanel 5, jwt 5, minus overlap) |
| Build | ✅ valid MV3 `dist/` |
| E2E | ✅ 2 passing |
| Coverage | auth-service ~95% · AuthPanel high · adapter 100% |

## Fix: content-script world isolation (MAIN-world bridge)
First real-page test surfaced that content scripts **cannot see the page's `window.ui`** (isolated JS world) — so auth was never captured. Fixed with the standard MAIN-world bridge:
- `src/content/main-world.ts` runs in the **page world** (manifest `world: "MAIN"`), reads/writes `window.ui`, and relays over `window.postMessage`; retries writes until Swagger has initialised.
- `src/content/swagger-bridge.ts` (isolated) caches the auth snapshot and queues commands until a `ready` handshake.
- `src/content/swagger-protocol.ts` holds the pure, unit-tested Swagger-internals logic (`extractAuth`, `buildAuthorizePayload`).
- `SwaggerUiAdapter` now delegates auth to an injected `AuthBridge` (detection still reads the shared DOM).

## Remaining before release
- ✅ Verified on a live OAS 2.0 `apiKey`-bearer Swagger page. Still worth spot-checking Swagger 3.x/4.x/5.x + `http bearer` and `basic` schemes across builds.
- **Security-reviewer sign-off** for DD-037 (plaintext token storage) and DD-033 (capture approach) before release. Tracked in `TODO.md`.

## Next
- Verify auth restore on real Swagger pages; refine the adapter per findings.
- Sprint 5 polish (auth UX/edge cases) → then Sprint 6 Request Manager.
