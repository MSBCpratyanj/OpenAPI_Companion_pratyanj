# Sprint 8 — Environment Manager

**Status:** 🟢 Core delivered · **Phase:** 4 · **Milestone:** M4 (Environments) · **Epic:** EPIC-05

## Goal
Multiple environments per project with **one-click switching** that re-scopes authentication (and request drafts) to the selected environment, plus `{{VARIABLE}}` resolution (FR-007/008, FDD-003).

## What shipped

**`EnvironmentService`** (`src/modules/environment/`)
- CRUD + `duplicate`; `switch` (persists the active env in project metadata and emits `ENVIRONMENT_CHANGED`); `getActiveId` / `getActive`.
- Duplicate-name rejection (EC-018); the **default** environment is protected from deletion; deleting the active env falls back to default (EC-016).
- Built-in suggestions (Local / Development / QA / UAT / Staging / Production), created on demand.
- Pure `substitute()` for `{{VAR}}` resolution (DD-032) with missing-variable reporting; `resolve(text, envId)` convenience.
- Events `ENVIRONMENT_CREATED` / `ENVIRONMENT_CHANGED` / `ENVIRONMENT_DELETED`.

**`EnvironmentsPanel`** (Env tab) — environment list with the active one badged, one-click **Switch**, **Delete** (non-default), built-in quick-add chips, and a create form (name + base URL + variable rows) with duplicate-name validation.

**Cross-module switching (via the event bus, decoupled):**
- The sidebar shell re-scopes the Auth/Request panels to the new environment on `ENVIRONMENT_CHANGED`.
- The content script re-restores auth + request drafts for the new env, and **clears Swagger's live auth if the new env has no stored credential** (environment isolation — no auth leakage).

## Validation
| Gate | Result |
|---|---|
| Type-check / Lint / Format | ✅ |
| Unit tests | ✅ **143 passing** (+15: env-service 9, EnvironmentsPanel 5, doc-url 3, minus overlap) |
| Build | ✅ valid MV3 `dist/` |

## Design correction (from real-page feedback)
Two behaviours were explored and then corrected once the PO clarified the model:
- **Edit environments** — added per-env editing (✏️) so you can set base URL + variables on *any* environment, including the default/Local one (kept).
- **Switch behaviour** — briefly made switching *navigate* to a deployment URL (and environments global). The PO clarified that **jumping between deployments (Local/QA/dev/client) belongs to a future "Project switcher"**, not the Environment Manager. So this was reverted: environments are **per-project variable/credential contexts** and switching **re-scopes in place, no navigation** (matches FDD-003's "no page refresh"). `isHttpUrl` is retained for the future Project switcher.

### Model going forward
- **Projects (future):** a list of deployments (name + URL); switching a project **navigates** there and loads its data.
- **Environments (now):** per-project contexts — variables + the active credential — switched in place. Auth stays per project+environment (authorize a deployment once → auto-restored later).

## Follow-ups
- **Apply `{{VAR}}` substitution into request populate** (resolver exists; wire it into RequestService.restore/applyTemplate — DD-032).
- **Project switcher** (deployment list with navigate) — the home for cross-deployment jumping.

## Next
Verify environment create/switch on the real page; then Sprint 9 — API History.
