import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Result } from '@/types'
import type { EventBus } from '@/core/events'
import { useEventBus } from '@/hooks'
import {
  Badge,
  Button,
  CopyButton,
  EmptyState,
  IconButton,
  Spinner,
  DataIcon,
  GenerateIcon,
  RegenerateIcon,
  DownloadIcon,
  SearchIcon,
  CloseIcon,
  ChevronDownIcon,
  CopiedIcon,
  ZapIcon,
} from '@/components'
import { copyText } from '@/utils'
import { GENERATOR_CATALOG, generate, type GeneratorKey, type GeneratorMeta } from './generators'
import type {
  BulkFormat,
  EndpointInfo,
  FakeDataPanelService,
  FakeDataPreview,
  GenerateResult,
  GenerationMode,
} from './types'

interface FakeDataPanelProps {
  service: FakeDataPanelService
  bus: EventBus
}

type StudioTab = 'live' | 'studio' | 'bulk' | 'catalog'

const METHODS = ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
type MethodFilter = (typeof METHODS)[number]

const METHOD_STYLES: Record<string, { bg: string; text: string }> = {
  get: { bg: 'bg-[#61affe]/15', text: 'text-[#61affe]' },
  post: { bg: 'bg-[#49cc90]/15', text: 'text-[#49cc90]' },
  put: { bg: 'bg-[#fca130]/15', text: 'text-[#fca130]' },
  delete: { bg: 'bg-[#f93e3e]/15', text: 'text-[#f93e3e]' },
  patch: { bg: 'bg-[#50e3c2]/15', text: 'text-[#50e3c2]' },
}

function MethodTag({ method }: { method: string }) {
  const m = method.toLowerCase()
  const style = METHOD_STYLES[m] ?? { bg: 'bg-surface', text: 'text-muted' }
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${style.bg} ${style.text}`}
    >
      {method}
    </span>
  )
}

function humanize(generator: string): string {
  const spaced = generator.replace(/([A-Z])/g, ' $1').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function preview(value: unknown): string {
  const text = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)
  return text.length > 32 ? `${text.slice(0, 32)}…` : text
}

function initCatalogSamples(): Record<string, string> {
  const samples: Record<string, string> = {}
  for (const item of GENERATOR_CATALOG) {
    try {
      const val = generate(item.key)
      samples[item.key] =
        typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)
    } catch {
      samples[item.key] = 'sample'
    }
  }
  return samples
}

// ── Searchable Endpoint Picker ──
interface EndpointPickerProps {
  endpoints: EndpointInfo[]
  selectedEndpointId: string
  onSelect: (endpointId: string) => void
  disabled?: boolean
}

function EndpointPicker({
  endpoints,
  selectedEndpointId,
  onSelect,
  disabled = false,
}: EndpointPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('ALL')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedEndpoint = useMemo(
    () => endpoints.find((ep) => ep.endpointId === selectedEndpointId),
    [endpoints, selectedEndpointId],
  )

  const filteredEndpoints = useMemo(() => {
    const q = query.trim().toLowerCase()
    return endpoints.filter((ep) => {
      if (methodFilter !== 'ALL' && ep.method.toUpperCase() !== methodFilter) {
        return false
      }
      if (!q) return true
      const matchesMethod = ep.method.toLowerCase().includes(q)
      const matchesPath = ep.path.toLowerCase().includes(q)
      const matchesSummary = (ep.summary || '').toLowerCase().includes(q)
      return matchesMethod || matchesPath || matchesSummary
    })
  }, [endpoints, query, methodFilter])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative flex flex-col gap-1" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-bg px-2.5 py-2 text-left text-xs transition hover:border-muted hover:bg-surface/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
      >
        {selectedEndpoint ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <MethodTag method={selectedEndpoint.method} />
            <span className="truncate font-mono font-medium text-text">
              {selectedEndpoint.path}
            </span>
            {selectedEndpoint.summary && (
              <span className="truncate text-muted">— {selectedEndpoint.summary}</span>
            )}
          </div>
        ) : (
          <span className="text-muted">Select target endpoint…</span>
        )}
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 flex max-h-64 flex-col rounded-lg border border-border bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex flex-col gap-1.5 border-b border-border p-2 bg-surface">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by path, method, summary…"
                className="w-full rounded-md border border-border bg-bg pl-8 pr-7 py-1.5 text-xs text-text placeholder:text-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-2 text-muted hover:text-text"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {METHODS.map((m) => {
                const active = methodFilter === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethodFilter(m)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-bg text-muted hover:bg-surface hover:text-text border border-border'
                    }`}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto p-2 max-h-56 bg-surface">
            {filteredEndpoints.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted">
                {endpoints.length === 0
                  ? 'No endpoints detected on this page.'
                  : 'No matching endpoints.'}
              </div>
            ) : (
              filteredEndpoints.map((ep) => {
                const isSelected = ep.endpointId === selectedEndpointId
                return (
                  <div
                    key={ep.endpointId}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      onSelect(ep.endpointId)
                      setIsOpen(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onSelect(ep.endpointId)
                        setIsOpen(false)
                      }
                    }}
                    className={`group flex flex-col gap-1 rounded-md border p-2 text-xs transition cursor-pointer select-none ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-bg hover:border-muted hover:bg-surface/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MethodTag method={ep.method} />
                        <span className="font-mono text-[11px] font-medium text-text break-all">
                          {ep.path}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-primary">
                          <CopiedIcon className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    {ep.summary ? (
                      <div className="text-[11px] text-muted pl-0.5 group-hover:text-text/90">
                        {ep.summary}
                      </div>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function FakeDataPanel({ service, bus }: FakeDataPanelProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>('live')
  const [liveData, setLiveData] = useState<FakeDataPreview | null>(() =>
    service.previewOpenRequest(),
  )
  const [busy, setBusy] = useState(false)

  // Endpoints list
  const availableEndpoints = useMemo(() => {
    try {
      return service.listEndpoints() || []
    } catch {
      return []
    }
  }, [service])

  // Mock Studio State
  const [studioEndpointId, setStudioEndpointId] = useState<string>('')
  const [studioMode, setStudioMode] = useState<GenerationMode>('realistic')
  const [studioArrayCount, setStudioArrayCount] = useState<number>(2)
  const [studioPayload, setStudioPayload] = useState<string>('')
  const [isGeneratingStudio, setIsGeneratingStudio] = useState(false)

  // Bulk Seeder State
  const [bulkEndpointId, setBulkEndpointId] = useState<string>('')
  const [bulkCount, setBulkCount] = useState<number>(10)
  const [bulkFormat, setBulkFormat] = useState<BulkFormat>('json')
  const [bulkMode, setBulkMode] = useState<GenerationMode>('realistic')
  const [bulkResultText, setBulkResultText] = useState<string>('')
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false)

  // Catalog State
  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogCategory, setCatalogCategory] = useState<string>('ALL')
  const [catalogSamples, setCatalogSamples] = useState<Record<string, string>>(() =>
    initCatalogSamples(),
  )

  // Set default endpoints once available
  useEffect(() => {
    if (availableEndpoints.length > 0) {
      if (!studioEndpointId) setStudioEndpointId(availableEndpoints[0]?.endpointId || '')
      if (!bulkEndpointId) setBulkEndpointId(availableEndpoints[0]?.endpointId || '')
    }
  }, [availableEndpoints, studioEndpointId, bulkEndpointId])

  const refreshLive = useCallback(() => setLiveData(service.previewOpenRequest()), [service])

  useEffect(() => refreshLive(), [refreshLive])
  useEventBus(bus, 'REQUEST_CHANGED', refreshLive)
  useEventBus(bus, 'FAKE_DATA_GENERATED', refreshLive)

  // Trigger studio generation when endpoint or mode changes
  const runStudioGeneration = useCallback(async () => {
    if (!studioEndpointId) return
    setIsGeneratingStudio(true)
    const res = await service.generateMockPayload(studioEndpointId, studioMode, studioArrayCount)
    if (res.ok) {
      setStudioPayload(res.value)
    } else {
      bus.publish('NOTIFY', { kind: 'error', message: res.error.message })
    }
    setIsGeneratingStudio(false)
  }, [service, studioEndpointId, studioMode, studioArrayCount, bus])

  useEffect(() => {
    if (studioEndpointId && activeTab === 'studio' && !studioPayload) {
      void runStudioGeneration()
    }
  }, [studioEndpointId, activeTab, studioPayload, runStudioGeneration])

  // Trigger bulk generation
  const runBulkGeneration = async () => {
    if (!bulkEndpointId) return
    setIsGeneratingBulk(true)
    const res = await service.generateBulk(bulkEndpointId, bulkCount, bulkFormat, bulkMode)
    if (res.ok) {
      setBulkResultText(res.value.text)
      bus.publish('NOTIFY', {
        kind: 'success',
        message: `Generated ${res.value.count} rows in ${res.value.format.toUpperCase()} format!`,
      })
    } else {
      bus.publish('NOTIFY', { kind: 'error', message: res.error.message })
    }
    setIsGeneratingBulk(false)
  }

  // Inject payload to Swagger
  const handleInject = async (endpointId: string, payload: string) => {
    if (!payload.trim()) return
    const res = await service.injectPayload(endpointId, payload)
    if (res.ok) {
      bus.publish('NOTIFY', {
        kind: 'success',
        message: 'Mock payload injected into Swagger editor!',
      })
    } else {
      bus.publish('NOTIFY', { kind: 'error', message: res.error.message })
    }
  }

  // Download Bulk Dataset File
  const handleDownloadDataset = () => {
    if (!bulkResultText) return
    const blob = new Blob([bulkResultText], {
      type: bulkFormat === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dataset_${Date.now()}.${bulkFormat}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    bus.publish('NOTIFY', {
      kind: 'success',
      message: `Downloaded dataset.${bulkFormat}!`,
    })
  }

  // Regenerate catalog sample
  const regenSample = (key: GeneratorKey) => {
    try {
      const val = generate(key)
      setCatalogSamples((prev) => ({
        ...prev,
        [key]: typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val),
      }))
    } catch {
      // Graceful fallback
    }
  }

  // Catalog filtered list
  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase()
    return GENERATOR_CATALOG.filter((item: GeneratorMeta) => {
      if (catalogCategory !== 'ALL' && item.category !== catalogCategory.toLowerCase()) {
        return false
      }
      if (!q) return true
      return (
        item.label.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      )
    })
  }, [catalogQuery, catalogCategory])

  // Live Auto-fill actions
  const notifyLive = (result: Result<GenerateResult>) => {
    if (result.ok) {
      const n = result.value.fieldCount
      bus.publish('NOTIFY', {
        kind: n > 0 ? 'success' : 'warning',
        message: n > 0 ? `Generated ${n} field${n === 1 ? '' : 's'}.` : 'No fillable fields found.',
      })
    } else {
      bus.publish('NOTIFY', { kind: 'error', message: result.error.message })
    }
    refreshLive()
  }

  const runLive = async (op: () => Promise<Result<GenerateResult>>) => {
    setBusy(true)
    notifyLive(await op())
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* ── Sub-Tab Switcher ── */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-bg p-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 font-semibold transition-colors ${
            activeTab === 'live'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted hover:text-text'
          }`}
        >
          <span>⚡ Live Fill</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('studio')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 font-semibold transition-colors ${
            activeTab === 'studio'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted hover:text-text'
          }`}
        >
          <span>🛠️ Mock Studio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bulk')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 font-semibold transition-colors ${
            activeTab === 'bulk'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted hover:text-text'
          }`}
        >
          <span>📦 Bulk Seeder</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 font-semibold transition-colors ${
            activeTab === 'catalog'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted hover:text-text'
          }`}
        >
          <span>🎲 Library</span>
        </button>
      </div>

      {/* ── 1. MOCK STUDIO SUB-TAB ── */}
      {activeTab === 'studio' && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-150">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text">Target Endpoint</span>
            <EndpointPicker
              endpoints={availableEndpoints}
              selectedEndpointId={studioEndpointId}
              onSelect={(id) => {
                setStudioEndpointId(id)
                setStudioPayload('')
              }}
            />
          </div>

          {/* Mode Selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text">Generation Mode</span>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {[
                { id: 'realistic', label: '⭐ Realistic', desc: 'Valid semantic data' },
                { id: 'minimal', label: '📌 Minimal', desc: 'Required fields only' },
                { id: 'boundary', label: '⚠️ Boundary', desc: 'Min/max/extreme limits' },
                { id: 'fuzzing', label: '🛡️ Fuzzing', desc: 'XSS, SQLi & Unicode' },
              ].map((m) => {
                const isSelected = studioMode === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setStudioMode(m.id as GenerationMode)
                      setStudioPayload('')
                    }}
                    className={`flex flex-col items-start gap-0.5 rounded-md border p-2 text-left transition ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-bg hover:border-muted hover:bg-surface/50'
                    }`}
                  >
                    <span className="text-xs font-semibold text-text">{m.label}</span>
                    <span className="text-[10px] text-muted">{m.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Controls: Array count & Regenerate */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span>Array size:</span>
              {[1, 2, 3, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setStudioArrayCount(n)
                    setStudioPayload('')
                  }}
                  className={`h-6 w-6 rounded border font-mono text-[11px] font-semibold transition ${
                    studioArrayCount === n
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-bg text-muted hover:text-text'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <Button
              variant="secondary"
              onClick={() => void runStudioGeneration()}
              disabled={isGeneratingStudio}
              className="h-7 text-xs"
            >
              {isGeneratingStudio ? (
                <Spinner className="h-3 w-3" />
              ) : (
                <RegenerateIcon className="h-3 w-3" />
              )}
              <span>Regenerate</span>
            </Button>
          </div>

          {/* JSON Preview Box */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Synthesized JSON Payload
              </span>
              {studioPayload ? <CopyButton text={studioPayload} label="Copy payload" /> : null}
            </div>

            <pre className="max-h-72 overflow-auto rounded-md border border-border bg-bg/95 p-2.5 font-mono text-xs text-text leading-relaxed select-text">
              <code>{studioPayload || '{\n  \n}'}</code>
            </pre>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
            <Button
              variant="primary"
              onClick={() => void handleInject(studioEndpointId, studioPayload)}
              disabled={!studioPayload}
              className="flex items-center gap-1.5 text-xs"
            >
              <ZapIcon className="h-3.5 w-3.5" />
              <span>Inject into Swagger</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── 2. BULK SEEDER SUB-TAB ── */}
      {activeTab === 'bulk' && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-150">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text">Target Schema / Endpoint</span>
            <EndpointPicker
              endpoints={availableEndpoints}
              selectedEndpointId={bulkEndpointId}
              onSelect={(id) => {
                setBulkEndpointId(id)
                setBulkResultText('')
              }}
            />
          </div>

          {/* Row count & Format */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text">Record Count</span>
              <div className="flex items-center gap-1">
                {[5, 10, 25, 50].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setBulkCount(n)}
                    className={`flex-1 rounded border py-1 text-xs font-semibold transition ${
                      bulkCount === n
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-bg text-muted hover:text-text'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text">Export Format</span>
              <div className="flex items-center gap-1">
                {(['json', 'csv'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setBulkFormat(f)}
                    className={`flex-1 rounded border py-1 text-xs font-semibold uppercase transition ${
                      bulkFormat === f
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-bg text-muted hover:text-text'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mode Selector for Bulk */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted">Mode:</span>
            {(['realistic', 'fuzzing', 'boundary'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setBulkMode(m)}
                className={`rounded px-2 py-0.5 text-[11px] font-medium capitalize transition ${
                  bulkMode === m
                    ? 'bg-surface text-text border border-primary'
                    : 'text-muted hover:text-text'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <Button
            variant="primary"
            onClick={() => void runBulkGeneration()}
            disabled={isGeneratingBulk || !bulkEndpointId}
            className="flex items-center justify-center gap-1.5 text-xs py-2"
          >
            {isGeneratingBulk ? (
              <Spinner className="h-3.5 w-3.5" />
            ) : (
              <GenerateIcon className="h-3.5 w-3.5" />
            )}
            <span>
              Generate {bulkCount} Records ({bulkFormat.toUpperCase()})
            </span>
          </Button>

          {/* Bulk Preview Output */}
          {bulkResultText ? (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Dataset Preview ({bulkFormat.toUpperCase()})
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    onClick={handleDownloadDataset}
                    className="h-6 text-[11px] px-2 text-primary"
                  >
                    <DownloadIcon className="h-3 w-3" />
                    <span>Download</span>
                  </Button>
                  <CopyButton text={bulkResultText} label="Copy dataset" />
                </div>
              </div>
              <pre className="max-h-64 overflow-auto rounded-md border border-border bg-bg/95 p-2.5 font-mono text-[11px] text-text leading-relaxed select-text">
                <code>{bulkResultText}</code>
              </pre>
            </div>
          ) : null}
        </div>
      )}

      {/* ── 3. LIVE REQUEST AUTO-FILLER SUB-TAB ── */}
      {activeTab === 'live' && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-150">
          {!liveData ? (
            <div className="flex flex-col gap-2 py-4">
              <EmptyState
                icon={<DataIcon className="h-8 w-8 text-muted" />}
                title="No request open in Swagger"
                message="Click 'Try it out' on any request with a JSON body in Swagger UI to auto-fill mock data."
              />
              <Button variant="secondary" onClick={refreshLive} className="self-center text-xs">
                Refresh Status
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface/40 p-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MethodTag method={liveData.method} />
                  <span className="truncate font-mono text-xs font-medium text-text">
                    {liveData.endpointId.split(' ')[1]}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  className="flex-1 text-xs py-1.5"
                  onClick={() => void runLive(() => service.generateAll())}
                  disabled={busy}
                >
                  <GenerateIcon className="h-3.5 w-3.5" />
                  <span>Fill Empty Fields</span>
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 text-xs py-1.5"
                  onClick={() => void runLive(() => service.generateAll({ overwrite: true }))}
                  disabled={busy}
                >
                  <RegenerateIcon className="h-3.5 w-3.5" />
                  <span>Regenerate All</span>
                </Button>
              </div>

              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted pt-1">
                Detected Schema Fields ({liveData.fields.length})
              </span>

              <ul className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
                {liveData.fields.map((f) => (
                  <li
                    key={f.key}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-bg p-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-text">{f.key}</span>
                        {f.generator ? (
                          <Badge kind="info">{humanize(f.generator)}</Badge>
                        ) : (
                          <Badge kind="neutral">unsupported</Badge>
                        )}
                      </div>
                      <div className="truncate font-mono text-[11px] text-muted pt-0.5">
                        {preview(f.value)}
                      </div>
                    </div>
                    <IconButton
                      label={`Regenerate ${f.key}`}
                      onClick={() => void runLive(() => service.regenerateField(f.key))}
                      disabled={busy || !f.generator}
                    >
                      <RegenerateIcon className="h-3.5 w-3.5 text-muted hover:text-text" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* ── 4. GENERATOR CATALOG LIBRARY SUB-TAB ── */}
      {activeTab === 'catalog' && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-150">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
              placeholder="Search 40+ generators (e.g. email, card, ipv4, sqli)…"
              className="w-full rounded-md border border-border bg-bg pl-8 pr-7 py-1.5 text-xs text-text placeholder:text-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
            {catalogQuery ? (
              <button
                type="button"
                onClick={() => setCatalogQuery('')}
                className="absolute right-2 top-2 text-muted hover:text-text"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {[
              'ALL',
              'personal',
              'internet',
              'finance',
              'location',
              'content',
              'system',
              'security',
              'numeric',
            ].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCatalogCategory(cat)}
                className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase transition ${
                  catalogCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-bg text-muted hover:text-text border border-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Generator Cards Grid */}
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-0.5">
            {filteredCatalog.map((item: GeneratorMeta) => {
              const currentSample = catalogSamples[item.key] ?? 'sample'
              return (
                <div
                  key={item.key}
                  className="flex flex-col gap-1.5 rounded-lg border border-border bg-bg p-2.5 text-xs transition hover:border-muted"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text">{item.label}</span>
                      <span className="font-mono text-[10px] text-muted">({item.key})</span>
                    </div>
                    <Badge
                      kind={
                        item.category === 'security'
                          ? 'error'
                          : item.category === 'finance'
                            ? 'warning'
                            : 'info'
                      }
                    >
                      {item.category}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded bg-surface/60 px-2 py-1 font-mono text-[11px] text-text select-all break-all">
                    <span>{currentSample}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <IconButton
                        label="New sample"
                        onClick={() => regenSample(item.key)}
                        className="h-6 w-6 text-muted hover:text-text"
                      >
                        <RegenerateIcon className="h-3 w-3" />
                      </IconButton>
                      <IconButton
                        label="Copy sample"
                        onClick={() => {
                          void copyText(currentSample)
                          bus.publish('NOTIFY', {
                            kind: 'success',
                            message: `Copied "${item.label}" sample!`,
                          })
                        }}
                        className="h-6 w-6 text-primary hover:text-primary/80"
                      >
                        <CopiedIcon className="h-3 w-3" />
                      </IconButton>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
