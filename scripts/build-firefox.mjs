#!/usr/bin/env node
/**
 * Produce a Firefox-loadable build from the Chrome `dist/`.
 *
 * The extension is built for Chrome with @crxjs/vite-plugin (`npm run build`).
 * Firefox needs a different manifest — no `chrome.sidePanel`, a `sidebar_action`
 * instead of `side_panel`, an event-page background instead of a service worker,
 * and `browser_specific_settings`. This copies `dist/` to `dist-firefox/` and
 * rewrites only the manifest; all built assets are reused as-is.
 *
 * Load it via Firefox → about:debugging → This Firefox → Load Temporary Add-on →
 * pick `dist-firefox/manifest.json`.
 *
 * ⚠️ Runtime behaviour on Firefox is NOT verified in CI (no Firefox). See
 * FIREFOX.md for what to check and the known crxjs caveats.
 */
import { readFileSync, writeFileSync, rmSync, cpSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'dist')
const out = resolve(root, 'dist-firefox')

if (!existsSync(resolve(src, 'manifest.json'))) {
  console.error('dist/manifest.json not found — run `npm run build` first.')
  process.exit(1)
}

// Fresh copy of the Chrome build.
rmSync(out, { recursive: true, force: true })
cpSync(src, out, { recursive: true })

const manifest = JSON.parse(readFileSync(resolve(src, 'manifest.json'), 'utf8'))

// 1. Chrome-only keys.
delete manifest.minimum_chrome_version
manifest.permissions = (manifest.permissions ?? []).filter((p) => p !== 'sidePanel')

// 2. side_panel → sidebar_action (Firefox's docked panel).
if (manifest.side_panel?.default_path) {
  manifest.sidebar_action = {
    default_panel: manifest.side_panel.default_path,
    default_title: manifest.name,
    default_icon: manifest.icons,
  }
}
delete manifest.side_panel

// 3. background service worker → event-page scripts (Firefox MV3).
if (manifest.background?.service_worker) {
  manifest.background = {
    scripts: [manifest.background.service_worker],
    type: manifest.background.type ?? 'module',
  }
}

// 4. Firefox add-on identity + minimum version (world:"MAIN" needs 128+).
manifest.browser_specific_settings = {
  gecko: {
    id: 'openapi-companion@pratyanj',
    strict_min_version: '128.0',
  },
}

writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

console.log('Firefox build written to dist-firefox/')
console.log('  permissions   :', JSON.stringify(manifest.permissions))
console.log('  sidebar_action:', JSON.stringify(manifest.sidebar_action?.default_panel))
console.log('  background    :', JSON.stringify(manifest.background))
console.log('  gecko         :', JSON.stringify(manifest.browser_specific_settings.gecko))
console.log(
  '\nLoad: Firefox → about:debugging → Load Temporary Add-on → dist-firefox/manifest.json',
)
