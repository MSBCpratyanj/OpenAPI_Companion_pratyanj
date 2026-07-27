# Feedback Round 1 — Execute-on-Apply, Edit-Value fix, Auto Token Refresh

**Status:** 🟢 Delivered (needs real-page verification) · **Source:** PO testing of the request/history/auth modules on a real (QA/DEV) Swagger

Three items from live testing, all shipped together since they share the auto-execute path.

## 1 — "Apply" on a saved request now CALLS the API

Previously `applyTemplate` only filled the body. Now it delegates to `adapter.replay` — navigate to the operation, expand, enable Try-it-out, fill the saved body, **Execute** — exactly like history Replay. The business rule is refined, not dropped: **auto** paths (restore-on-load, auto-restore-empty-body) still never execute; only the **explicit** Apply/Replay user actions do.

## 2 — Fix: body hidden behind "Edit Value" (per-Swagger-version)

On the PO's Swagger build (OAS2 param bodies), after "Try it out" the body renders as a read-only example with an **"Edit Value"/"Edit"** toggle — the textarea only mounts after clicking it. Our state machine looked for `textarea.body-param__text` immediately, so Replay/Apply opened the operation but never filled or executed until the user intervened.

`autoExecute` gained two phases: `prepareBody` → `awaitBody`. When a body must be written and no textarea exists, it clicks the edit toggle (found by `.body-param__example-edit` / `.body-param-edit button`, with a label-text fallback for `Edit`/`Edit Value`), waits for the textarea to mount, then fills + executes. **Try-or-pass semantics** (per PO): versions without the toggle skip straight to Execute, and if the textarea never mounts within a 2 s budget we execute anyway with Swagger's example value — never stall.

## 3 — Auto token refresh via the saved login request

New `TokenRefreshService` (`src/services/token-refresh.ts`): when the stored credential is **expired** and a **saved login template** exists, it automatically:

1. Finds the login template — name/endpoint matching `login | sign-in | authenticate | auth | token`, preferring the active environment (the PO has one per QA/DEV).
2. Runs it via `applyTemplate` (which now executes — feature 1).
3. Waits for a **new** 2xx response on that endpoint (signature-compared against pre-refresh renders so a stale response is never re-captured).
4. Extracts the token from the response JSON — recursive search over `access_token`, `accessToken`, `id_token`, `auth_token`, `jwt`, `token`, `bearer`, … at any nesting depth.
5. Applies + persists it via the new `AuthenticationService.applyToken` (writes into Swagger through the bridge, stores with refined type + JWT expiry), and toasts success/failure.

**Triggers:** `AUTH_EXPIRED` (published by `restore()` on page load and on environment switch). Concurrency-guarded; a no-op unless *both* an expired credential *and* a login-looking template exist. Depends only on narrow structural interfaces of the auth/request services, so module decoupling holds.

## Validation
| Gate | Result |
|---|---|
| Type-check / Lint / Format | ✅ |
| Unit tests | ✅ **292 passing** (40 files; +14: token-refresh 10, edit-value machine 3, applyToken 1; rewrote applyTemplate test) |
| Build | ✅ valid MV3 `dist/` |

## ⚠️ Needs real-page verification
1. **Apply**: Requests tab → Apply on the QA login template → should navigate, fill, **and call** the API.
2. **Edit Value**: Replay/Apply on a POST — the body should now be filled even though your version needs "Edit Value" clicked first.
3. **Token refresh**: with an expired token stored and a saved login request, reload the page → toast "Token expired — refreshed automatically…", and Auth tab shows the fresh token.

## Notes / future
- Refresh triggers on load + env switch. Mid-session expiry (page left open past `exp`) is only caught on the next reload — a periodic expiry watcher is a possible follow-up.
- Token detection is heuristic (key names). If a team's login response uses an unusual field, a "mark this template as login / pick token field" setting is the v2 path (Workflow Runner, v1.2).
