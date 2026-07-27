# Sprint 1 — Project Bootstrap

**Status:** ✅ Complete · **Phase:** 0 · **Milestone:** M0 (Project Setup) · **Epic:** EPIC-00

## Goal
A reproducible, CI-gated Manifest V3 extension skeleton that any contributor can clone, install, build, load unpacked, and test with one command.

## What shipped

**Toolchain & config**
- `package.json` (scripts: dev, build, typecheck, lint, format, test, test:e2e), `tsconfig.json` (**strict**, path alias `@/*`)
- Vite + **@crxjs/vite-plugin** MV3 build (`vite.config.ts`), `manifest.config.ts` (version injected from `package.json`)
- ESLint 9 flat config (`no-explicit-any` enforced) + Prettier, Tailwind + design tokens, Zustand

**Extension entry points**
- Background service worker, content script (Shadow-DOM mount), popup, placeholder sidebar shell

**Folder scaffold** (per `planning/07`): `core/`, `adapters/`, `modules/` (7 feature folders), `components/`, `hooks/`, `stores/`, `services/`, `utils/`, `constants/`, `types/`, `styles/`, `tests/` — with starter `types` (StorageEnvelope, Result), `constants` (`MAX_HISTORY_ITEMS=1000`, permission set), and the `SwaggerAdapter` contract.

**Test harnesses:** Vitest + React Testing Library (unit) and Playwright (E2E, loads the built extension in Chromium).

**CI:** GitHub Actions — lint → format → type-check → test+coverage → production `npm audit` → build → E2E; PR/issue templates, `CODEOWNERS`.

**Repo hygiene:** `LICENSE` (MIT), `SECURITY.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1).

## Permission set (DD-035)
`storage`, `activeTab`, `scripting`, `unlimitedStorage`, `downloads` — verified in the built `dist/manifest.json`.

## Validation
| Gate | Result |
|---|---|
| Type-check (strict) | ✅ |
| Lint / Format | ✅ |
| Unit tests | ✅ 4 passing |
| Production `npm audit` | ✅ 0 vulnerabilities |
| Build | ✅ valid MV3 `dist/` |
| E2E | ✅ 2 passing (extension loads, SW registers, popup renders) |

## Notes for the team
- Dev-toolchain (Vite/Vitest/esbuild) has dev-server-only advisories — **none ship** in the extension; CI gates on `npm audit --omit=dev`. Upgrade tracked in `TODO.md`.
- Load locally: `npm i && npm run build`, then `chrome://extensions` → Load unpacked → `dist/`.

## Next
Sprint 2 — Foundation core (storage, events, migration).
