# Sprint 6 — Request Manager

**Status:** 🟢 Core delivered (Swagger DOM selectors need real-page verification) · **Phase:** 3 · **Milestone:** M3 (Request Persistence) · **Epic:** EPIC-04

## Goal
Auto-save the request body a developer types in Swagger's "Try it out" form and restore it after refresh, per endpoint + environment — plus reusable named templates (FR-005/006, FDD-002). Restoring never executes a request.

## What shipped

**Swagger request DOM helpers** (`src/adapters/swagger/swagger-request-dom.ts`)
- Reads/writes the **request body** of open operations directly from the shared DOM (no MAIN-world bridge needed — the request form is in the page DOM the isolated script can see).
- `setNativeValue` dispatches a native `input` event so React-controlled fields actually update.
- Endpoint id derived as `"<method> <path>"`; selectors isolated here for per-version tuning (R-01), unit-tested against a synthetic Swagger structure.

**`RequestService`** (`src/modules/request/`)
- `saveDraft` / `getDraft`, debounced `autosaveOpen` (captures every open operation's body), `restore`, and `autoRestoreOpen` (fills drafts **only into empty** open bodies, so it never clobbers edits).
- Templates: `saveTemplate` / `saveOpenAsTemplate` / `listTemplates` / `applyTemplate` / `deleteTemplate`.
- Per endpoint + environment isolation; events `REQUEST_CHANGED` / `REQUEST_RESTORED` / `TEMPLATE_SAVED` / `TEMPLATE_DELETED`.

**`RequestsPanel`** (Requests tab) — save the current open request as a named template, list templates (Apply / Delete), live via template events.

**Wiring** — content script auto-restores drafts on load and auto-saves on Swagger DOM changes (`adapter.observe` → debounced `autosaveOpen`).

## Validation
| Gate | Result |
|---|---|
| Type-check / Lint / Format | ✅ |
| Unit tests | ✅ **125 passing** (+21: request-service 10, DOM helpers 6, RequestsPanel 6, minus overlap) |
| Build | ✅ valid MV3 `dist/` |

## Fix: project identity was hash-dependent (data lost on refresh)
Real-page testing showed saved requests/templates vanished after refresh. Cause: the project id was derived from `location.href`, which includes Swagger's routing **hash** (`#/…`) — so navigating then refreshing produced a *different* project id and orphaned all stored data. Fixed with `docIdentityUrl()` (origin + pathname + search, hash dropped), unit-tested; the content script now identifies the project by the stable URL. Auth had been unaffected only because that test didn't navigate.

## ⚠️ Needs real-page verification
The DOM selectors (`.opblock.is-open`, `textarea.body-param__text`, `.opblock-summary-method/-path`) are unit-tested against a synthetic structure but not yet a live Swagger page — expect the same quick tune-up loop auth needed if a selector differs on your build.

## Next
Verify request save/restore on the real Swagger page; then params/headers capture (v1 is body-only) and Sprint 8 Environment Manager.
