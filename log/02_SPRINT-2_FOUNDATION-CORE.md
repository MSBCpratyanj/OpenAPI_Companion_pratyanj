# Sprint 2 — Foundation Core

**Status:** ✅ Complete · **Phase:** 1 · **Milestone:** M1 (Foundation) · **Epic:** EPIC-01

## Goal
Build the shared core every feature depends on: an event bus, a robust storage layer, and a safe migration pipeline.

## What shipped

**`EventBus`** — `src/core/events/`
- Typed pub/sub over the full event catalog (`planning/12`). A throwing subscriber is isolated and never breaks delivery; handlers are snapshotted so they can (un)subscribe mid-publish; includes `once()`.

**`StorageService`** — `src/core/storage/`
- **Versioned envelopes** on every stored object (`schemaVersion` / `createdVersion` / `updatedVersion` / `updatedAt`).
- **Debounced + batched writes** — rapid `set`s to a key coalesce into one write.
- **`withLock(projectId, fn)`** — serializes read-modify-write per project → mitigates the multi-tab race (**R-04**).
- **Corruption recovery** — non-envelope values are flagged (`STORAGE_CORRUPT`), not returned as data; `getOrSeed` reseeds defaults (**EC-020/021**).
- **Quota safety net** — emits `STORAGE_QUOTA_WARNING` (the backstop under `unlimitedStorage`).
- `Result<T>` everywhere — no exceptions cross the boundary.

**`MigrationService`** — ordered pipeline with **snapshot-before + rollback-on-failure** (never partially migrates — **EC-022/EC-042**), refuses to downgrade a newer schema (**EC-034**), emits `STORAGE_MIGRATED`. Wired into the background worker on install/update.

**Support:** `chromeLocalArea` adapter (the only code touching `chrome.storage`) and an in-memory fake for tests.

## Tasks completed
T-01.1–T-01.8 (envelopes/keys, StorageService, debounce/batch, write-lock, quota, MigrationService, corruption recovery, EventBus) and the migration half of T-01.9.

## Validation
| Gate | Result |
|---|---|
| Type-check / Lint / Format | ✅ |
| Unit tests | ✅ **33 passing** (events 7, storage 15, migration 7, utils 4) |
| Build | ✅ background worker bundles the core |
| Coverage (core) | event-bus 95% · storage-service 92% · migration 88% · envelope/utils 100% |

## Next
Sprint 3 — Foundation part B: ProjectService, SwaggerAdapter, ThemeManager.
