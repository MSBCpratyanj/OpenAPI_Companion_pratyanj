# Sprint 13 — Settings & Import/Export

**Status:** 🟢 Core delivered (needs real-page verification) · **Phase:** 8 · **Milestone:** M8 (Settings — feature-complete MVP) · **Epic:** EPIC-09

## Goal
A local-first control center: configure appearance, see and manage storage usage, and back up / restore / reset all data — with destructive actions gated behind confirmation and imports validated before anything is written (FDD-010, FR-SET-001…009). This is the **last feature sprint**, so it completes the 7-module MVP.

## What shipped

**`SettingsService`** (`src/modules/settings/`)
- Global preferences at `settings/preferences` (merged over defaults so old/partial records still resolve every field); `getPreferences` / `setPreference` (applies immediately, emits `SETTINGS_UPDATED`) / `resetPreferences`.
- **Storage metrics** — total bytes + per-project usage (via `getBytesInUse`), sorted largest-first.
- **Clear per-project** and **clear-all** (wipes every key, emits `DATA_RESET`) — both destructive paths return counts/Results for the UI to confirm + report.

**`ImportExportService`** (`src/modules/settings/`, DD-039)
- **Export** — every stored entry → a versioned JSON bundle (`app`, `appVersion`, `schemaVersion`, `exportedAt`, `entries`); emits `DATA_EXPORTED`.
- **Backup** — writes the bundle to Downloads and emits `DATA_BACKED_UP`. *Deviation:* `chrome.downloads` isn't available to content scripts, so backup uses an injectable anchor+Blob download (lands in Downloads all the same); a background-routed `chrome.downloads` path can replace it later without touching callers.
- **Import** — strict, safe-by-default: rejects non-JSON, foreign files, and **newer schema versions** *before any write*, and **refuses keys outside the extension's own namespace** (sanitization, EC-045/047 — no arbitrary storage injection, no code execution). `previewImport` returns a non-destructive summary (counts by root, project count, **secrets flag**); `applyImport(mode)` supports **Keep-existing** (skip) and **Replace**, emits `DATA_IMPORTED` with `{imported, skipped, renamed}`.

**`SettingsPanel`** (Settings tab) — four categories: **Appearance** (theme radios → `ThemeManager`, instant), **Storage** (usage table + Clear-this-project / Clear-all behind a confirm `Dialog`), **Data** (Download backup with a credentials warning, auto-backup toggle, paste-to-import with preview + mode radios), **General** (name + version). Feedback via `NOTIFY` toasts.

**Wiring** — `SettingsService` + `ImportExportService` are global (not project-scoped); constructed in the content script and threaded through `App → SidebarShell → PanelOutlet`; the Settings tab placeholder is gone. `downloads` permission was already declared (DD-035).

## Validation
| Gate | Result |
|---|---|
| Type-check / Lint / Format | ✅ |
| Unit tests | ✅ **278 passing** (39 files; +21: settings-service 6, import-export 10, SettingsPanel 5) |
| Build | ✅ valid MV3 `dist/` (main bundle 30.5 kB gzip) |

Covers the DoD checks: preferences persist + apply immediately, export round-trips, invalid/oversized-version/unsafe imports never write, destructive actions confirmed, import validated before applying.

## Follow-up (PO feedback): "Restore from backup…" file picker
Backup was downloadable but restoring required pasting JSON by hand — not discoverable. The Data section now has a **Restore from backup…** button beside Download backup: it opens a file picker (`.json`), reads the file (Blob.text with a FileReader fallback), and feeds it into the exact same **preview → Keep/Replace → Import** pipeline, so all validation/sanitization still applies. The paste textarea remains as the secondary path ("…or paste a backup's JSON here").

## Design notes / scope
- **Import modes:** Keep-existing + Replace shipped (satisfies the "never overwrite without approval" rule). Merge/Rename (item-level) are deferred — noted in the plan as the richer modes.
- **Auto-backup toggle** persists as a preference; the periodic/on-change **scheduler is deferred** (auto-downloading on every change is poor UX). Manual "Download backup" is the primary path for v1.
- **Theme** stays owned by `ThemeManager` (single source at `settings/theme`); Settings drives it via the same API the header toggle uses.

## ⚠️ Needs real-page verification
Open **Settings** → switch theme (instant), check storage usage looks right, **Download backup** (file lands in Downloads), paste it back → **Preview** shows counts + "contains secrets", **Import** (Keep vs Replace), then **Clear this project** / **Clear all** (confirm dialog). Reload to confirm preferences persist.

## Next
Feature-complete MVP reached (M8). Remaining: **Sprint 14 — Hardening** (edge-case sweep EC-001…048, perf vs NFRs, a11y WCAG 2.1 AA, security sign-off, cross-browser), then **S15 Beta** and **S16 v1.0.0**.
