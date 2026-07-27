# Feedback Round 2 — Full API paths, History ⋮ menu (+ Locate), wider sidebar

**Status:** 🟢 Delivered (needs real-page verification) · **Source:** PO testing History + endpoint search on a real API with long paths

The API path was being cut off (`/site-surveys…`) in both the History list and the ⌘K search, so you couldn't tell which endpoint a row referred to. Also: History rows needed a cleaner action set with a way to just *find* an endpoint (not only replay it).

## 1 — Full API paths (no more truncation)

Both surfaces now show the **complete path**, wrapping to a second line instead of truncating:

- **History rows** — restructured to two lines: `[status] [METHOD]` on top, the **full path** (`break-all`) below. Clicking the row still opens the detail inspector.
- **Command Palette** — method badge + **full path** wrap; the summary drops to a muted second line (it truncates, since the path is the important part).

## 2 — History row actions → a "⋮" overflow menu

The inline **Replay** button + trash icon are replaced by a single **⋮ menu** (new reusable `Menu` component) with three actions:

- **Replay** — re-runs the whole request (navigate → fill → execute), as before.
- **Locate in Swagger** — **new**: jumps to and expands the operation **without executing it** (`HistoryService.locate` → `adapter.openEndpoint`). For "where is this endpoint?" without firing a call.
- **Delete** — removes the entry (danger-styled).

`Menu` is a `position: fixed` popover anchored to the trigger's viewport rect, so it's never clipped by the sidebar's scroll/overflow containers; it closes on outside-click, Escape, or scroll, and is keyboard/ARIA-labelled (`role="menu"`/`menuitem`, `aria-haspopup`/`aria-expanded`). Errors (e.g. endpoint no longer on the page) surface as toasts.

## 3 — Wider layout

- **Sidebar** widened `w-80` → `w-96` (320 → 384 px), so most paths now fit on one line.
- **Command Palette** dialog widened via a new `Dialog` `size` prop (`lg` default, **`xl`** = `max-w-2xl` for the palette).

## Validation
| Gate | Result |
|---|---|
| Type-check / Lint / Format | ✅ |
| Unit tests | ✅ **324 passing** (43 files; +6: Menu 4, history-service locate 1, HistoryPanel full-path 1; rewrote History action tests for the menu) |
| Build | ✅ valid MV3 `dist/` |

## Notes
- Env-note: the dev `node_modules` was wiped mid-session and restored with `npm ci` — no code impact.
- New shared `Menu` component (`src/components/Menu.tsx`) is generic; reusable for future overflow menus elsewhere.

## Follow-up: History rows restyled to match the (approved) search palette
PO: search now looks good, History still doesn't. Aligned History rows to the palette's look:

- **Method is now a colored badge** (`methodKind` — GET blue / POST green / PUT·PATCH amber / DELETE red), same as search — previously it was dull gray text.
- **Row layout mirrors search**: `[status] [METHOD] full-path` on one line (wraps when long) instead of status+method on one line and the path stranded below.
- **Smarter wrapping**: paths break at `/` **segment** boundaries via `<wbr>` (a `PathText` helper) — no more mid-word breaks like `technician-shee|t-url`; now wraps as whole segments.
- `Badge` hardened globally with `shrink-0 whitespace-nowrap` so badges never squish beside a wrapping path.

Only the History tab changed; the endpoint-search palette was left as-is.

## Fix: ⋮ menu items did nothing (Shadow DOM event retargeting)
On the real page the menu opened but Replay/Locate/Delete were dead. Cause: the outside-click handler listened on `window` and checked `e.target`. Because the whole UI is in a **Shadow DOM**, a `mousedown` on a menu item is **retargeted to the shadow host** by the time it reaches `window`, so the handler treated the click as "outside", closed the menu on `mousedown`, and the item's `click` never fired. Fixed by checking `event.composedPath()` (which pierces the shadow boundary) instead of `e.target`. Added a regression test that mounts `Menu` inside a real shadow root and dispatches a composed `mousedown` — it fails on the old `e.target` check and passes with `composedPath`. (Unit tests missed this originally because RTL renders in the light DOM, where no retargeting occurs.)

## Fix: "Locate in Swagger" did nothing (single-shot expand)
Replay and Delete worked, but Locate didn't scroll/expand. Cause: `openEndpoint`
did a **single synchronous** expand click + scroll — the exact unreliable pattern
we'd already replaced for Replay (Swagger expands via an async React re-render, so
one click often doesn't take). Rewrote `openEndpoint` to mirror `autoExecute`'s
proven approach: scroll immediately, click the summary control **once**, then
**poll** until the block reports `is-open` and re-scroll (the expanded block is
taller) — never re-clicking, so it can't toggle shut. Added tests for the polling
path (retry-until-open, no re-click) with an injected scheduler.

## ⚠️ Needs real-page verification
On a real API with long paths: History rows show the **full path**; the **⋮** menu offers Replay / Locate / Delete, and **Locate** scrolls to the endpoint without calling it; ⌘K search shows full paths in the wider dialog.
