import { useEffect, useState, type ComponentType } from 'react'
import {
  IconButton,
  Tabs,
  ToastLayer,
  SearchIcon,
  ThemeLightIcon,
  ThemeDarkIcon,
  ThemeSystemIcon,
} from '@/components'
import { useEventBus, useTheme } from '@/hooks'
import type { EventBus } from '@/core/events'
import type { ProjectMeta } from '@/core/project'
import type { ThemeManager, ThemePreference } from '@/services'
import type { AuthPanelService } from '@/modules/authentication'
import type { RequestPanelService } from '@/modules/request'
import type { EnvironmentPanelService } from '@/modules/environment'
import type { HistoryPanelService } from '@/modules/history'
import type { FakeDataPanelService } from '@/modules/fake-data'
import { CommandPalette, type ProductivityPanelService } from '@/modules/productivity'
import type { SettingsApi, ImportExportApi } from '@/modules/settings'
import { PanelOutlet } from '@/sidebar/PanelOutlet'
import { TABS, DEFAULT_TAB } from '@/sidebar/tabs'

const NEXT_PREFERENCE: Record<ThemePreference, ThemePreference> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}
const PREFERENCE_ICON: Record<ThemePreference, ComponentType<{ className?: string }>> = {
  light: ThemeLightIcon,
  dark: ThemeDarkIcon,
  system: ThemeSystemIcon,
}

export interface PanelShellProps {
  project: ProjectMeta
  theme: ThemeManager
  bus: EventBus
  environmentId: string
  authService: AuthPanelService
  requestService: RequestPanelService
  environmentService: EnvironmentPanelService
  historyService: HistoryPanelService
  fakeDataService: FakeDataPanelService
  productivityService: ProductivityPanelService
  settingsService: SettingsApi
  importExportService: ImportExportApi
}

/**
 * Full-height shell for the native Side Panel. Same tabs + panels as the old
 * injected sidebar (reuses `PanelOutlet`), minus the floating card / collapse
 * chrome the browser's panel already provides.
 */
export function PanelShell({ project, theme, bus, environmentId, ...services }: PanelShellProps) {
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB)
  const [activeEnv, setActiveEnv] = useState(environmentId)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { preference } = useTheme(theme)

  useEventBus(bus, 'ENVIRONMENT_CHANGED', (payload) => setActiveEnv(payload.environmentId))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const cycleTheme = () => void theme.setPreference(NEXT_PREFERENCE[theme.getPreference()])
  const PreferenceIcon = PREFERENCE_ICON[preference]

  return (
    <>
      <div className="flex min-h-screen flex-col bg-bg text-text">
        <header className="flex items-center justify-between border-b border-border px-3 py-2">
          <strong className="text-sm">OpenAPI Companion</strong>
          <div className="flex items-center gap-1">
            <IconButton label="Search endpoints (⌘K)" onClick={() => setPaletteOpen(true)}>
              <SearchIcon />
            </IconButton>
            <IconButton label={`Theme: ${preference}. Click to change.`} onClick={cycleTheme}>
              <PreferenceIcon className="h-4 w-4" />
            </IconButton>
          </div>
        </header>

        <nav className="border-b border-border px-2 py-2">
          <Tabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />
        </nav>

        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="flex-1 overflow-auto"
        >
          <PanelOutlet
            activeTab={activeTab}
            project={project}
            bus={bus}
            authService={services.authService}
            requestService={services.requestService}
            environmentService={services.environmentService}
            historyService={services.historyService}
            fakeDataService={services.fakeDataService}
            settingsService={services.settingsService}
            importExportService={services.importExportService}
            theme={theme}
            environmentId={activeEnv}
          />
        </div>

        <ToastLayer bus={bus} />
      </div>

      {paletteOpen ? (
        <CommandPalette
          service={services.productivityService}
          onClose={() => setPaletteOpen(false)}
        />
      ) : null}
    </>
  )
}
