# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Install dependencies**: `npm install`
- **Start dev server (HMR for UI)**: `npm run dev` – launches Vite with CRXJS hot module replacement for the extension UI. After changing background worker or manifest, click Reload on the extension card in `chrome://extensions`.
- **Build extension (unpacked MV3)**: `npm run build` – outputs to `dist/`.
- **Load built extension**: Open `chrome://extensions`, enable Developer mode, click Load unpacked → select `dist/`.
- **Run unit/integration tests**: `npm test` (Vitest).  
  - Watch mode: `npm run test:watch`  
  - Coverage: `npm run test:coverage`
- **Run end-to-end tests** (Playwright): `npm run test:e2e` (requires `npx playwright install chromium` once).
- **Lint**: `npm run lint` (ESLint flat config). Auto‑fix: `npm run lint:fix`.
- **TypeCheck**: `npm run typecheck` (`tsc --noEmit`).
- **Format**: `npm run format:check` (Prettier check). Auto‑fix: `npm run format`.
- **Build Firefox variant**: `npm run build:firefox` (then load `dist-firefox/` in `about:debugging`).

### Running a Single Test
With Vitest, you can target a specific test file:  
`npx vitest run src/modules/authentication/auth-service.test.ts`  
Or use watch mode and focus: `nvitest --reporter=verbose src/modules/authentication/`.

## Project Architecture (High‑Level)

### Layered Structure
```
src/
├── background/          # MV3 service worker (service-worker.ts) – handles install/storage migration, panel toggle via port messaging, tab‑switch close.
├── content/             # Headless in‑page agent – detects Swagger UI, bridges RPC and state to sidepanel, hosts ⌘K palette and launcher button.
├── sidepanel/           # Native chrome.sidePanel UI (PanelShell.tsx) – React UI hosted in the browser side panel.
├── sidebar/             # Shared panel components (tabs, Dashboard, PanelOutlet).
├── adapters/            # SwaggerAdapter – ONLY layer allowed to touch Swagger DOM; provides typed read/write of endpoints, params, responses.
├── core/                # Foundation: StorageService (chrome.storage wrapper), EventBus, ProjectMeta, migration service.
├── modules/             # Feature modules (authentication, environment, request, history, fake-data, productivity/codegen, etc.). Each module typically contains:
│   ├─ *-service.ts      # Business logic + Zustand store (or custom hooks)
│   ├─ *.test.tsx        # Unit/integration tests
│   ├─ *.tsx             # React UI component(s) for the sidepanel tab
│   └─ index.ts          # Barrel export
├── services/            # Cross‑cutting helpers: ThemeManager, ImportExportService, SettingsService.
├── hooks/               # Custom React hooks (useEventBus, useTheme, …).
├── components/          # Shared UI primitives (Button, IconButton, Tabs, ToastLayer, CopyButton, etc.).
├── types/               # Shared TypeScript utilities (Result<T>, etc.).
└── tests/               # Test setup (mocks, fakes for chrome.storage).
```

### Key Architectural Decisions
- **Native `chrome.sidePanel`**: Uses the browser’s own side panel chrome (no floating div injection).
- **Content Script ↔ Sidepanel RPC**: The panel cannot access the page DOM; the content script (`content/main-world.ts`) acts as an agent, forwarding DOM reads/writes via `chrome.tabs.sendMessage`.
- **RemoteSwaggerAdapter Pattern**: The panel keeps a mirrored snapshot of Swagger state (endpoints, parameters) to allow fast local reads without round‑tripping on every keystroke.
- **State Management**: `zustand` stores are used inside feature modules for lightweight, reactive state.
- **Manifest V3**: Required for Chrome Web Store; service worker is stateless, all durable state lives in `chrome.storage.local`.
- **Storage**: All user data (tokens, templates, environments, history) is stored locally; no external requests or telemetry.
- **Isolation per Origin**: The extension automatically scopes data by the page’s origin, so different Swagger instances (dev/staging/prod) have independent data.

## Common Tasks
- **Adding a new feature module**:  
  1. Create a folder under `src/modules/` (e.g., `new-feature`).  
  2. Add `*-service.ts` with Zustand store or custom logic.  
  3. Add React UI component(s) (`*.tsx`) rendered via a tab in `src/sidepanel/PanelShell.tsx`.  
  4. Wire up exports in `src/modules/index.ts` (or a dedicated index).  
  5. Add unit tests alongside implementation.  
  6. Ensure types are exported from `src/types/` if shared.
- **Modifying Swagger DOM interaction**: Edit only files under `src/adapters/swagger/`. The adapter provides typed getters/setters for endpoint UI (parameters, request body, responses) and is consumed by the content script.
- **Updating the sidepanel UI**: Changes go under `src/sidepanel/` or `src/sidebar/`. The `PanelShell.tsx` hosts the tab layout; individual tabs are lazy‑loaded from modules.
- **Changing build/target**: Adjust `vite.config.ts` (CRXJS plugin) or `manifest.config.ts`. After changes, run `npm run build` and reload the extension.

## Testing Guidelines
- Unit tests live next to the file they test (`*.test.tsx` or `*.test.ts`).  
- Use Vitest’s `describe`, `it`, `expect`. Mock `chrome.*` APIs via the fakes in `src/tests/`.  
- For components, use `@testing-library/react` and user-event.  
- End-to‑end tests (Playwright) are in `src/tests/e2e/` and verify that the extension loads, the sidepanel opens, and basic interactions work against a real Swagger UI page (e.g., petstore).  
- Run `npm run test:e2e` after building; ensure Chromium is installed.

## Migration & Versioning
- Bump version via `npm version patch|minor|major` (updates `package.json`, creates commit+tag).  
- Push with `git push origin main --follow-tags` to trigger the release workflow (lint, typecheck, tests, build, E2E smoke, GitHub Release).  
- To rehearse a release without publishing: go to Actions → *Build · verify · publish* → *Run workflow* on a branch; it uploads the built ZIP as an artifact.