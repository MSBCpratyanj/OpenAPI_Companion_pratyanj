import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ok, type Result } from '@/types'
import { StorageService } from '@/core/storage'
import { EventBus } from '@/core/events'
import { ThemeManager, type MediaQueryListLike } from '@/services'
import { createFakeArea } from '@/tests/fake-storage'
import type { ProjectMeta } from '@/core/project'
import { PanelShell } from './PanelShell'

const noMatch: MediaQueryListLike = {
  matches: false,
  addEventListener: () => {},
  removeEventListener: () => {},
}

const project: ProjectMeta = {
  id: 'project_abc',
  name: 'Petstore API',
  originUrl: 'https://petstore.example',
  openApiUrl: '',
  docType: 'swagger-ui',
  createdAt: 0,
  lastActiveEnvId: 'default',
}

/* eslint-disable @typescript-eslint/no-explicit-any -- terse test doubles */
function services() {
  const okAsync = (v: unknown = undefined) => vi.fn(async (): Promise<Result<any>> => ok(v))
  return {
    authService: {
      current: okAsync(null),
      clear: okAsync(),
      isAutoRefreshEnabled: vi.fn(async () => false),
      setAutoRefreshEnabled: okAsync(),
      listSaved: okAsync([]),
      saveAs: okAsync({}),
      activateSaved: okAsync({}),
      deleteSaved: okAsync(),
    } as any,
    requestService: {
      listTemplates: okAsync([]),
      saveOpenAsTemplate: okAsync(null),
      applyTemplate: okAsync(),
      deleteTemplate: okAsync(),
    } as any,
    environmentService: {
      list: okAsync([]),
      getActiveId: vi.fn(async () => 'default'),
      switch: okAsync({}),
      create: okAsync({}),
      update: okAsync({}),
      delete: okAsync(),
      listBuiltins: () => [],
    } as any,
    historyService: {
      list: okAsync([]),
      get: okAsync(null),
      replay: okAsync({}),
      locate: vi.fn(() => ok(undefined)),
      deleteEntry: okAsync(),
      clearProject: okAsync(),
    } as any,
    fakeDataService: {
      previewOpenRequest: vi.fn(() => null),
      generateAll: okAsync({ endpointId: '', fieldCount: 0 }),
      regenerateField: okAsync({ endpointId: '', fieldCount: 0 }),
    } as any,
    settingsService: {
      getPreferences: vi.fn(async () => ({ autoBackup: false, historyLimit: 1000 })),
      setPreference: okAsync(),
      resetPreferences: okAsync(),
      getStorageMetrics: vi.fn(async () => ({ totalBytes: 0, projects: [] })),
      clearProject: okAsync(0),
      clearAll: okAsync(),
    } as any,
    importExportService: {
      exportAll: okAsync('{}'),
      backup: okAsync('backup.json'),
      previewImport: vi.fn(() => ok({} as any)),
      applyImport: okAsync({ imported: 0, skipped: 0, renamed: 0 }),
    } as any,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function setup() {
  const storage = new StorageService({ area: createFakeArea(), now: () => 0 })
  const theme = new ThemeManager({
    storage,
    root: document.createElement('div'),
    matchMedia: () => noMatch,
  })
  await theme.init()
  const bus = new EventBus()
  const onOpenPalette = vi.fn()
  render(
    <PanelShell
      project={project}
      theme={theme}
      bus={bus}
      environmentId="default"
      onOpenPalette={onOpenPalette}
      {...services()}
    />,
  )
  return { onOpenPalette }
}

describe('PanelShell (native side panel)', () => {
  it('renders the header, tabs, and the project dashboard', async () => {
    await setup()
    expect(screen.getByText('OpenAPI Companion')).toBeInTheDocument()
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByText('Petstore API')).toBeInTheDocument()
  })

  it('switches to the interactive History tab', async () => {
    await setup()
    fireEvent.click(screen.getByRole('tab', { name: /History/ }))
    expect(await screen.findByLabelText('Search history')).toBeInTheDocument()
  })

  // The palette renders in the PAGE (top-centered over the doc), not in this
  // narrow column — so the panel only asks for it, and never renders it itself.
  it('delegates the search button to the in-page palette', async () => {
    const { onOpenPalette } = await setup()
    fireEvent.click(screen.getByRole('button', { name: 'Search endpoints (⌘K)' }))
    expect(onOpenPalette).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: 'Search endpoints' })).not.toBeInTheDocument()
  })

  it('delegates ⌘K to the in-page palette', async () => {
    const { onOpenPalette } = await setup()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(onOpenPalette).toHaveBeenCalledTimes(1)
  })
})
