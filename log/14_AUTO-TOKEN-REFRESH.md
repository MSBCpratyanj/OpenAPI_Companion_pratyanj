# Auto Token Refresh — toggle + 401 trigger

**Status:** 🟢 Delivered (needs real-page verification) · **Source:** PO request — "after token expiry, auto-refresh and use the new token, with a toggle to enable it"

Builds on the `TokenRefreshService` engine from Feedback Round 1 (which already ran the saved login request and captured the new token). This adds the two things that make it a real, user-controlled feature: an **on/off toggle** and a **401/403 trigger** so it works mid-session and for opaque tokens.

## How it works (recap + what's new)
When enabled, on the trigger it: reads the stored credential → finds your saved **login** template (name/path like `login`/`auth`/`token`, prefers the current env) → runs it in Swagger → reads the fresh token from the 2xx response (`access_token`/`token`/`jwt`/… at any depth) → writes it into Authorize + persists it → toasts. It's a **re-login**, not an OAuth refresh-grant (we drive the visible Swagger UI, per DD-033).

## What this change adds

**1. Toggle (Auth tab, default OFF).** New checkbox **"Auto-refresh token on expiry"** in the Auth panel with a one-line hint ("runs your saved login request on a 401; needs a saved login template"). Persisted as a global flag `settings/auto-refresh-token` via `AuthenticationService.isAutoRefreshEnabled` / `setAutoRefreshEnabled` (emits `SETTINGS_UPDATED`). The content script gates the whole feature on it (`enabled: () => autoRefreshEnabled`) and updates live when toggled — no reload needed.

**2. 401/403 trigger (`TokenRefreshService.noticeResponses`).** Called on every executed-response change. A **new** 401/403 is the real "token died" signal — so it force-refreshes **regardless of any JWT `exp`**, which means it now works for **opaque / API-key tokens** and for **mid-session** expiry, not just an expired JWT at page load. The original on-load `AUTH_EXPIRED` trigger is kept.

**3. Loop protection.** A **cooldown** (default 15 s) plus a per-response dedup and the existing not-running guard stop a failing login (which itself returns 401) from looping.

## Design notes
- Chosen over a background timer: refresh drives the visible Swagger UI, so firing it on a real 401 (right when the user hit the error) is expected, whereas an unprompted timer would jump the page around.
- No auto-retry of the failed request in v1 (PO chose "refresh only") — the next call uses the fresh token. A retry-the-original variant is a possible follow-up.
- Requirements: a saved login template + a token in its response. If either is missing it silently no-ops (or toasts a warning when the login ran but no token was found).

## Validation
| Gate | Result |
|---|---|
| Type-check / Lint / Format | ✅ |
| Unit tests | ✅ **334 passing** (43 files; +9: token-refresh disabled-gate + 401-trigger + dedup + cooldown, auth-service flag, AuthPanel toggle) |
| Build | ✅ valid MV3 `dist/` |

## ⚠️ Needs real-page verification
1. Save your login request as a template (Requests → Save).
2. Auth tab → enable **Auto-refresh token on expiry**.
3. Let the token expire (or call an endpoint that 401s) → the extension should run the login and the Auth tab should show a fresh token, with a success toast.
4. Toggle it off → confirm a 401 no longer triggers a refresh.
