# Sprint 11 — Fake Data Generator

**Status:** 🟢 Core delivered · **Phase:** 6 · **Milestone:** M6 (Fake Data) · **Epic:** EPIC-07

## Goal
One-click, offline generation of realistic test data into the open request's JSON body — so developers stop hand-typing names/emails/UUIDs/dates (FDD-005, FR-FDG-001…007). Zero network, zero config; manual edits are respected and requests are never executed.

## What shipped

**Generator library** (`src/modules/fake-data/generators.ts`) — all **21 v1 generators** (name/first/last/username/email/password/uuid/phone/address/city/state/country/postal/date/datetime/boolean/integer/float/decimal/url/company), pure functions producing valid values *by construction* (RFC-4122 v4 UUIDs, RFC-shaped emails, ISO dates, strong passwords). Randomness is injectable (`Rng`) for deterministic tests. `GENERATORS` registry is the single source of truth.

**Field-type detection** (`detect.ts`) — `detectGenerator(name, value)` picks a generator from the field **name** first (ordered, most-specific-first rules; `datetime` before `date`; id/uuid matched on the raw camelCase/`_id` boundary so "valid"/"paid" aren't mistaken for ids), then falls back to the **value's runtime type**. Returns `null` for anything it can't confidently type → left unchanged (EC-029/EC-030).

**`FakeDataService`** (`fake-data-service.ts`) — operates on the open operation's JSON body via the existing adapter (`readOpenRequests`/`writeRequest` — **no adapter change**, so no mock churn):
- `previewOpenRequest()` — top-level fields + detected generator, for the panel (sync).
- `generateAll({ overwrite })` — **recursively** fills detected fields (into nested objects and arrays). Default preserves manual edits (only fills placeholders: `''`, `"string"`, `0`, `null`); `overwrite:true` replaces existing values too. Unsupported fields untouched.
- `regenerateField(key)` — always overwrites a single top-level field (FR-FDG-004).
- Writes the body back pretty-printed; emits `FAKE_DATA_GENERATED` with the filled count. Never executes (business rule).
- Minimal preset storage `fake-data/presets` (T-07.5).

**`FakeDataPanel`** (Fake Data tab) — reads the open request, lists each top-level field with its detected type badge (or an **unsupported** badge), and offers **Generate test data** (fill placeholders), **Regenerate all** (overwrite), and per-field **regenerate** (disabled for unsupported fields). Success/'no fillable fields'/error surfaced as toasts via `NOTIFY`. Empty state + Refresh when no JSON request is open.

**Icons** — added `GenerateIcon` (Sparkles) + `RegenerateIcon` (RefreshCw) to the central icon set. **Wiring** — `FakeDataService` constructed in the content script and threaded through `App → SidebarShell → PanelOutlet`; the old "Sprint 11" placeholder is gone.

## Validation
| Gate | Result |
|---|---|
| Type-check / Lint / Format | ✅ |
| Unit tests | ✅ **232 passing** (32 files; +57: generators 8, detect 37, service 7, panel 5) |
| Build | ✅ valid MV3 `dist/` (main bundle 24.7 kB gzip) |
| Perf | ✅ field generation ≪ 20 ms; full request ≪ 150 ms (pure in-memory) |

## Follow-up: supported-data reference + money fields
- Added [`src/modules/fake-data/README.md`](../src/modules/fake-data/README.md) — a user-facing table of all 21 generators and the **exact field-name keywords** that trigger each, plus a "Why is my field unsupported?" section (using `cancel_reason: "string"` as the example) so users know what names auto-fill and why free-text/domain fields are intentionally left alone.
- While documenting, found the `decimal` generator was **unreachable by detection**. Added money-field name detection (`amount`/`price`/`cost`/`total`/`balance`/`salary`/`subtotal`/`discount`/`fee`/`tax`) → `decimal`, so common money fields (e.g. `grand_total`) now fill. +4 detection tests.

## Design notes / scope
- **JSON body only** in v1 (the highest-value target). Non-JSON bodies and query/path params are a follow-up.
- **Name-first detection** (not schema-driven) — we operate on the rendered body in the DOM, so we don't have the resolved OpenAPI schema here; schema-aware generation is a listed future enhancement.
- **Placeholder heuristic** treats Swagger's default example values as fillable; booleans are only regenerated on overwrite (a bare `true`/`false` is ambiguous).

## ⚠️ Needs real-page verification
Open a request → **Try it out** → Fake Data tab → confirm fields are detected, **Generate test data** fills the body in Swagger (and the textarea visibly updates), per-field regenerate works, and manual edits survive a non-overwrite generate.

## Next
Verify on the real page; then **Sprint 12 — Productivity Tools** (search / favorites / recents / copy-as-code), Milestone M7.
