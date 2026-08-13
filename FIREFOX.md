# Firefox support (work in progress)

The extension is built for Chrome (MV3, `@crxjs/vite-plugin`). This documents the
Firefox port: what's done, how to build/load it, and — importantly — the runtime
behaviours that still need verifying in a real Firefox, since there's no Firefox
in CI.

## What's done

- **Sidebar API shim** (`src/core/sidebar.ts`) — the background worker and the
  panel talk to this instead of `chrome.sidePanel`, so Firefox routes to
  `browser.sidebarAction`. Chrome behaviour is unchanged. Unit-tested both ways.
- **Firefox manifest build** (`scripts/build-firefox.mjs`, `npm run build:firefox`)
  — copies the Chrome `dist/` to `dist-firefox/` and rewrites the manifest:
  `side_panel` → `sidebar_action`, service worker → event-page `background.scripts`,
  drops `sidePanel`/`minimum_chrome_version`, adds `browser_specific_settings.gecko`
  (`strict_min_version: 128` — required for `world:"MAIN"` content scripts).

## Installation

### Prerequisites

- **Firefox 128 or newer** (`Menu → Help → About Firefox`) — earlier versions
  don't support the `world:"MAIN"` content script this extension relies on.
- **Node 20+** and npm, to build from source.

### 1. Build the Firefox package

```bash
npm install            # first time only
npm run build:firefox  # emits the loadable extension into dist-firefox/
```

`dist-firefox/` now contains `manifest.json` and all assets — this folder *is*
the extension.

### 2a. Install for testing (temporary — quickest)

1. Open Firefox and go to **`about:debugging`**.
2. Click **This Firefox** in the left sidebar.
3. Click **Load Temporary Add-on…**.
4. Select **`dist-firefox/manifest.json`** (inside this project).
5. "OpenAPI Companion" appears in the list, and its icon is added to the toolbar.

> Temporary add-ons are removed when Firefox restarts — re-do these steps after a
> restart, or use a permanent install (2b).

**Tip:** `npx web-ext run -s dist-firefox` launches a fresh Firefox with the
extension already loaded (auto-reloads on rebuild), and `npx web-ext lint -s
dist-firefox` checks the package for manifest problems.

### 2b. Install permanently

Firefox only installs **signed** extensions in the normal release build. Two ways:

**A. Firefox Developer Edition or Nightly** (no signing needed):

1. Go to **`about:config`**, accept the warning.
2. Set **`xpinstall.signatures.required`** to **`false`**.
3. Package it: `npx web-ext build -s dist-firefox -a web-ext-artifacts` →
   produces `web-ext-artifacts/*.zip`.
4. Go to **`about:addons`** → gear icon → **Install Add-on From File…** → pick
   that zip.

**B. Signed `.xpi` via Mozilla** (works in normal Firefox, and to publish):

1. Get API credentials at <https://addons.mozilla.org/developers/addon/api/key/>.
2. `npx web-ext sign -s dist-firefox --api-key <key> --api-secret <secret>` →
   produces a signed `.xpi` you can install permanently or list on AMO.

### 3. Use it

Open any Swagger UI / OpenAPI page, then click the toolbar icon (or press
`Ctrl+Shift+O`) to open the panel.

### Updating

Rebuild and reload:

```bash
npm run build:firefox
```

- Temporary add-on: `about:debugging` → **This Firefox** → **Reload** next to the
  extension. Then hard-refresh (`Ctrl+Shift+R`) any open Swagger tab.
- Installed add-on: re-install the new zip/`.xpi`.

### Uninstall

`about:addons` → OpenAPI Companion → **Remove** (or **Remove** in
`about:debugging` for a temporary add-on).

### Troubleshooting install

- **"This add-on could not be installed because it appears to be corrupt."** You
  used **Install Add-on From File** in `about:addons`, which on *release* Firefox
  only accepts a **signed** `.xpi`. For testing, use **Load Temporary Add-on**
  (2a) with `dist-firefox/manifest.json` instead — no signing. For a permanent
  install, sign it (2b‑B) or use Developer Edition/Nightly with signatures off
  (2b‑A). The same error also appears if you pick the folder or `manifest.json`
  here (this dialog wants a `.zip`/`.xpi`, not a folder).

## ⚠️ Needs verification in real Firefox (and the likely fixes)

These are the parts CI can't check. Load it and watch the page + extension
consoles.

1. **crxjs content-script loaders (highest risk).** crxjs injects content scripts
   via small loader files that dynamically `import()` the real chunk. That's a
   Chrome-oriented mechanism and may not run in Firefox. **Check:** on a Swagger
   page the console should log `[OpenAPI Companion] content agent loaded`. If it
   doesn't, the content scripts aren't executing — the fix is a Firefox-native
   build (e.g. `vite-plugin-web-extension`) or non-loader content scripts.
2. **Background as an event page.** The manifest points `background.scripts` at
   crxjs's `service-worker-loader.js` (a module). **Check:** on install, the
   background console logs the migration line. If not, the background isn't
   loading as an event page.
3. **`world:"MAIN"` content script** (reads Swagger's `window.ui`). Needs Firefox
   **128+**. **Check:** console logs `main-world active; Swagger object found`.
4. **Sidebar open/close/toggle.** **Check:** toolbar icon opens the sidebar;
   `⌘⇧O` / `Ctrl+Shift+O` toggles it; switching tabs closes it; the in-page
   launcher button opens it. These map to `sidebarAction` and have stricter
   user-gesture rules than Chrome's `sidePanel`.
5. **Panel ↔ page messaging** (`tabs.sendMessage` needs host permission). **Check:**
   the panel shows the project/auth/history rather than "No OpenAPI page
   connected".

## Not yet done

- A Firefox entry in the release workflow (packaging a signed/unsigned `.xpi`).
- Firefox E2E (Playwright is Chromium-only here; use `web-ext` locally).
- If the crxjs loaders don't run on Firefox (item 1), migrating the build to a
  cross-browser tool is the clean fix — bigger change, tracked separately.
