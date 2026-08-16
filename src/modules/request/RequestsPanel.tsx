import { useCallback, useEffect, useState } from 'react'
import type { Result } from '@/types'
import type { EventBus } from '@/core/events'
import { useEventBus } from '@/hooks'
import { Button, EmptyState, IconButton, Spinner, RequestsIcon, DeleteIcon } from '@/components'
import type { RequestTemplate } from './types'

/** Surface RequestsPanel needs from RequestService (eases testing). */
export interface RequestPanelService {
  listTemplates(): Promise<Result<RequestTemplate[]>>
  saveOpenAsTemplate(name: string, environmentId: string): Promise<Result<RequestTemplate | null>>
  applyTemplate(templateId: string): Promise<Result<void>>
  deleteTemplate(templateId: string): Promise<Result<void>>
}

interface RequestsPanelProps {
  service: RequestPanelService
  bus: EventBus
  environmentId: string
}

export function RequestsPanel({ service, bus, environmentId }: RequestsPanelProps) {
  const [templates, setTemplates] = useState<RequestTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState('')
  const [hint, setHint] = useState<string | null>(null)

  const load = useCallback(async () => {
    const result = await service.listTemplates()
    setTemplates(result.ok ? result.value : [])
    setLoading(false)
  }, [service])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  useEventBus(bus, 'TEMPLATE_SAVED', () => void load())
  useEventBus(bus, 'TEMPLATE_DELETED', () => void load())

  // Surface failures (e.g. endpoint no longer on the page, EC-013) as toasts.
  const apply = async (templateId: string) => {
    const result = await service.applyTemplate(templateId)
    if (!result.ok) bus.publish('NOTIFY', { kind: 'error', message: result.error.message })
  }

  const saveOpen = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const result = await service.saveOpenAsTemplate(trimmed, environmentId)
    if (result.ok && result.value === null) {
      setHint('Open a request and enter a body in Swagger first.')
      return
    }
    if (!result.ok) {
      bus.publish('NOTIFY', { kind: 'error', message: result.error.message })
      return
    }
    setName('')
    setHint(null)
    setIsAdding(false)
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* ── Save request as template toggle / form ── */}
      {isAdding ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface/30 p-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text" htmlFor="oac-tpl-name">
              Save current request as a template
            </label>
            <button
              type="button"
              className="text-[11px] text-muted hover:text-text hover:underline"
              onClick={() => {
                setIsAdding(false)
                setName('')
                setHint(null)
              }}
            >
              Cancel
            </button>
          </div>
          <div className="flex gap-2">
            <input
              id="oac-tpl-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveOpen()
              }}
              placeholder="Template name…"
              className="flex-1 rounded-md border border-border bg-bg px-2 py-1 text-xs text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <Button variant="primary" onClick={() => void saveOpen()} disabled={!name.trim()}>
              Save
            </Button>
          </div>
          {hint ? <p className="text-xs text-warning">{hint}</p> : null}
        </div>
      ) : (
        <div>
          <Button
            variant="secondary"
            className="w-full text-xs"
            onClick={() => {
              setIsAdding(true)
              setHint(null)
            }}
          >
            + Save current request as template
          </Button>
        </div>
      )}

      <hr className="border-border" />

      {/* ── Template list ── */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<RequestsIcon className="h-8 w-8 text-muted" />}
          title="No templates yet"
          message="Save a request above to reuse it later."
        />
      ) : (
        <ul className="flex flex-col gap-1">
          {templates.map((t) => (
            <li
              key={t.templateId}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-text">{t.name}</div>
                <div className="truncate font-mono text-[11px] text-muted">{t.endpointId}</div>
              </div>
              <Button variant="secondary" onClick={() => void apply(t.templateId)}>
                Apply
              </Button>
              <IconButton
                label={`Delete ${t.name}`}
                onClick={() => void service.deleteTemplate(t.templateId)}
              >
                <DeleteIcon className="h-3.5 w-3.5" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}