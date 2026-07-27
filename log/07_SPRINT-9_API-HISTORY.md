# Sprint 9 — API History

**Status:** 🟢 Core delivered (response-capture selectors need real-page verification) · **Phase:** 5 · **Milestone:** M5 (History) · **Epic:** EPIC-06

## Goal
Automatically record every executed request + response, keep it searchable and replayable, and let the user inspect and clear it (FR-009/010, FDD-004). Capture is from Swagger's rendered response DOM (DD-033 — no network interception).

## What shipped

**Response-capture DOM helpers** (`src/adapters/swagger/swagger-response-dom.ts`)
- Reads status + response body (+ request body) from each open operation's rendered "live response" table. Selectors isolated for per-version tuning (R-01); unit-tested against a synthetic block. New adapter method `readExecutedResponses()`.

**`HistoryService`** (`src/modules/history/`)
- `record` + **ring-buffer cap** (DD-031, oldest auto-evicted); a lightweight **index** drives list/search while full records (bodies) are stored separately and fetched on demand.
- `captureExecuted` reads rendered responses and **de-duplicates** (won't re-record the same rendered response on every DOM mutation); `scheduleCapture` debounces it.
- `list` with **search + method/date filter**; `get` (full record); `replay` (navigates to the operation and auto-executes it — see Follow-ups); `deleteEntry`; `clearProject`.
- Events `HISTORY_RECORDED` / `REQUEST_REPLAYED` / `HISTORY_CLEARED`.

**`HistoryPanel`** (History tab) — searchable, method-filtered list with per-entry status badge (2xx/4xx/5xx colour), **Replay** and **Delete**, a click-to-open **detail modal** (request/response bodies + copy buttons), and **Clear history**.

**Wiring** — the content script records executed responses on Swagger DOM mutations (debounced), scoped to the active environment.

## Validation
| Gate | Result |
|---|---|
| Type-check / Lint / Format | ✅ |
| Unit tests | ✅ **175 passing** (28 files) |
| Build | ✅ valid MV3 `dist/` |

## Fix: read the data row, not the header ("No requests yet")
First real-page test captured nothing. Cause: Swagger's live-response table has a **header row** whose cells also carry `.response-col_status` ("Code") / `.response-col_description` ("Details"); the selector grabbed the header, couldn't parse a status, and skipped the record. Fixed by excluding `.col_header` (`.response-col_status:not(.col_header)`), and the synthetic test now includes the header row to lock this in.

## Follow-ups (post-review requests)

**1 — Detail modal → tabbed inspector.** Clicking a history row opens a **modal** (`Dialog` + `HistoryDetail`). It's laid out as a **tabbed inspector**: a fixed summary header (status badge / method / path, plus timestamp · duration · env) above a **Request | Response** tab strip (reuses the design-system `Tabs`), each tab showing the **pretty-printed** body with a character count and a **Copy** button (`CopyButton` → `copyText`, `execCommand`-based so it works on `http://` pages where the async clipboard API is blocked). Replaced the old inline row-expand. New shared components `Dialog`, `CopyButton`; utility `copyText`; status→badge helper extracted to `history/status.ts`.

**2 — Replay now auto-executes (no clicks).** Previously "Replay" only re-filled the request body. It now **navigates to the operation and runs it** with zero user interaction: new adapter method `replay(endpointId, body?)` delegates to `autoExecute`, which scrolls to the block, expands it, enables "Try it out", fills the body, and clicks Execute. `HistoryService.replay` switched from `writeRequest` to `adapter.replay`; the fresh response is picked up by the normal capture path as a new history entry.

**Fix: first-click did nothing (had to expand + click Replay twice).** The initial version fired the steps on fixed 200/150 ms timeouts and probed for the "Try it out"/Execute controls synchronously — before Swagger's React re-render had produced them — so nothing filled or executed until the user manually expanded the operation and clicked Replay a second time. Replaced with a **polling state machine** (`autoExecute`): `expand → awaitOpen → tryOut → awaitExecute → execute`. It performs one action per tick, waits `pollMs` (120 ms, up to a 6 s timeout) for the DOM to settle, and clicks each control **exactly once** (the `awaitOpen`/`awaitExecute` states never re-click, so an already-open block is never toggled shut). Also clicks `.opblock-summary-control` (Swagger 5.x) with a fallback to `.opblock-summary` (3.x/4.x). One click of Replay now runs the whole sequence.

Test count after follow-ups: **175 passing** (28 files) — added Dialog/CopyButton (3), clipboard (2), `autoExecute`/`clickExecute` DOM helpers (5), adapter replay end-to-end (2); rewrote the panel + history-service replay tests.

## ⚠️ Needs real-page verification
The live-response selectors (`.live-responses-table`, `.response-col_status`, `.response-col_description .microlight`) are unit-tested against a synthetic block but not yet a live Swagger response — expect the same quick selector tune-up loop if a class differs on your build.

## Next
Verify capture on the real page; then Sprint 11 — Fake Data Generator.
