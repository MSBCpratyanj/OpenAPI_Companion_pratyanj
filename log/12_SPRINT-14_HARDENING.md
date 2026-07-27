# Sprint 14 — Hardening (Part A: automated)

**Status:** 🟡 Part A delivered — manual passes remain · **Phase:** 9 · **Epic:** EPIC-10

## Goal
Production quality across the board: edge-case sweep (EC-001…048), performance vs NFR targets, accessibility, security review, and Swagger/browser version matrices (T-10.1…T-10.7). Part A covers everything automatable; Part B is the manual/PO work (cross-browser, screen reader, sign-offs).

## Fixes shipped (found by the sweep)

- **EC-013/014 — deleted/changed endpoint:** Replay (History) and Apply (Requests) failures were silently swallowed; both now surface the error as a toast ("No open operation matching …").
- **EC-015 — large bodies:** new `MAX_SAVED_BODY_BYTES` (256 KB). Request autosave **skips** oversized bodies; History **truncates** oversized request/response bodies with a visible `[truncated by OpenAPI Companion]` marker.
- **A11y (WCAG 2.1 §2.4.3):** `Dialog` now moves focus into the panel on open (respecting a child's `autoFocus`, Shadow-DOM-aware) and **restores focus to the opener on close**.

## New test suites

- **Swagger version matrix (T-10.6, R-01):** `swagger-version-matrix.test.ts` runs the full adapter surface (endpoint id, list, read/write body, response capture, navigate, auto-execute) against faithful **3.x / 4.x / 5.x** markup fixtures — 18 tests. Covers the structural differences: div vs button summary, `data-path` vs text-only path, header-row response tables.
- **Performance (T-10.2, EC-039/023):** `performance.test.ts` asserts the NFR targets — endpoint search **< 50 ms @ 5,000 endpoints**, history list+search **< 100 ms @ 1,000 entries**, code-gen **< 30 ms** (best-of-N to avoid CI flakes while catching complexity regressions). Existing per-field fake-data (< 20 ms) and codegen perf tests already in place.
- Regression tests for each fix above (toast surfacing, autosave skip, history truncation, dialog focus).

## Edge-case audit (EC-001…048)

| Status | Cases |
|---|---|
| ✅ Covered by automated tests | EC-005 (dormant on non-Swagger), EC-006/007 (stable project id, `docIdentityUrl`), EC-008…011 (auth expiry/invalid/type-change/logout), EC-012–014 (missing endpoint errors + toasts), EC-015 (body caps), EC-016 (delete active env → default), EC-017 (`{{VAR}}` unresolved passthrough), EC-018 (duplicate env name), EC-019 (quota warning event), EC-020/021 (corrupt storage → recover/reseed), EC-022 (batched flush Result), EC-023 (ring cap + perf), EC-024 (dedup capture), EC-025 (clear leaves auth/templates), EC-029…031 (unsupported field unchanged/fallback), EC-032…035 (import validation/versions/duplicate modes), EC-038 (instant theme), EC-039 (search perf), EC-043 (duplicate injection guard), EC-045/047 (import sanitization, invalid JSON) |
| ✅ By construction | EC-046 (XSS: React escaping everywhere — grep confirms **zero** `dangerouslySetInnerHTML`/`innerHTML`/`eval` in src), EC-036 (fixed-width sidebar + scrollable panels), EC-042/044 (MigrationService snapshot/rollback on update; storage versioned envelopes) |
| 🟡 Manual (Part B) | EC-001…004 (restart/multi-window/multi-tab/incognito), EC-037 (slow browser), EC-040/041 (hundreds of projects / large collections — metrics loop is linear), EC-048 (permission denied) |
| ⚪ N/A in v1.0 | EC-026…028 (Workflow Runner — v1.2 feature) |

## Security review (T-10.3) — evidence for sign-off

- **Permissions:** fixed 5-permission set (DD-035); a test asserts the manifest matches `PERMISSIONS`.
- **No secret logging:** only 4 `console.*` calls in src (background migration status + EventBus subscriber-error) — none touch tokens; grep-verified.
- **No dynamic code / HTML injection:** zero `eval` / `new Function` / `innerHTML` / `dangerouslySetInnerHTML` in src.
- **Input validation:** imports are schema-validated, version-gated, and **namespace-sanitized** before any write (EC-045); MAIN-world bridge messages validated by `swagger-protocol` (typed, origin-checked, tested).
- **Isolation:** UI in a closed-over Shadow DOM; page interaction only through the adapter; per-project storage namespaces.
- **Dependencies:** `npm audit --omit=dev` → **0 vulnerabilities** (dev-toolchain advisories tracked as tech debt, nothing ships).
- **Awaiting PO/security-reviewer sign-off:** DD-037 (plaintext token storage, v1 scope) and DD-033 (DOM response capture) — the evidence above plus docs/13 checklist.

## Validation
| Gate | Result |
|---|---|
| Type-check / Lint / Format | ✅ |
| Unit tests | ✅ **317 passing** (42 files; +25 this sprint) |
| Build | ✅ valid MV3 `dist/` (main content bundle ≈ 31.5 kB gzip) |
| Prod dependency audit | ✅ 0 vulnerabilities |

## Branding: final logo shipped
The logo went through three rounds: an interim compass set, then dev-native candidates, and finally the PO set the brand direction — *the mark must show what the product does: OpenAPI/Swagger, automated* (saved as a standing guideline). A design brief (`branding/LOGO_BRIEF.md` — product story, palette, constraints, ready-to-paste AI prompts) was produced for external generation, and the PO's chosen mark is now shipped: an **OpenAPI spec sheet with `{…}` JSON braces on stacked layers, badged with a green automation bolt**. Master: `branding/logo-final.png` (1254²); `scripts/generate-icons.mjs` now renders the 16/32/48/128 set from the PNG master (SVG fallback retained); manifest `icons` + `action.default_icon` unchanged. Verified legible at 128/32; 16 px reduces to a distinctive silhouette. Remaining T-11.2: store screenshots + listing copy.

## Part B — remaining (manual / PO)
1. **Cross-browser matrix (T-10.5):** load `dist/` in Chrome, Edge, Brave, Arc, Opera → smoke the critical flows (auth restore, request save, replay, ⌘K, settings backup).
2. **Screen-reader / keyboard pass (T-10.4):** tab through the sidebar, palette, and dialogs; VoiceOver/NVDA spot check.
3. **Sign-offs:** DD-033 + DD-037 (security section above is the evidence package).
4. Real-Swagger spot check of the version matrix if you have access to a 3.x or 5.x instance (we verified 4.x-era live).

## Next
Part B above, then **Sprint 15 — Public Beta** (repo goes public — `git init` on your word), then **Sprint 16 — v1.0.0**.
