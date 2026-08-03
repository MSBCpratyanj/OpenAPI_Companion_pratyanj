import { useCallback, useEffect, useState } from 'react'
import type { Result } from '@/types'
import type { EventBus } from '@/core/events'
import { useEventBus } from '@/hooks'
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  Spinner,
  AuthIcon,
  RevealIcon,
  HideIcon,
} from '@/components'
import type { AuthRecord } from './types'
import { authStatusOf } from './status'

/** Just the surface AuthPanel needs from AuthenticationService (eases testing). */
export interface AuthPanelService {
  current(environmentId: string): Promise<Result<AuthRecord | null>>
  clear(environmentId: string): Promise<Result<void>>
  isAutoRefreshEnabled(): Promise<boolean>
  setAutoRefreshEnabled(enabled: boolean): Promise<Result<void>>
}

interface AuthPanelProps {
  service: AuthPanelService
  bus: EventBus
  environmentId: string
}

function mask(token: string): string {
  const tail = token.slice(-4)
  return `${'•'.repeat(Math.min(12, Math.max(4, token.length - 4)))}${tail}`
}

export function AuthPanel({ service, bus, environmentId }: AuthPanelProps) {
  const [record, setRecord] = useState<AuthRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const load = useCallback(async () => {
    const result = await service.current(environmentId)
    setRecord(result.ok ? result.value : null)
    setLoading(false)
  }, [service, environmentId])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  useEffect(() => {
    void service.isAutoRefreshEnabled().then(setAutoRefresh)
  }, [service])

  useEventBus(bus, 'AUTH_UPDATED', () => void load())
  useEventBus(bus, 'AUTH_RESTORED', () => void load())
  useEventBus(bus, 'AUTH_CLEARED', () => void load())
  useEventBus(bus, 'AUTH_EXPIRED', () => void load())

  const toggleAutoRefresh = async (enabled: boolean) => {
    setAutoRefresh(enabled) // optimistic
    const result = await service.setAutoRefreshEnabled(enabled)
    if (!result.ok) {
      setAutoRefresh(!enabled)
      bus.publish('NOTIFY', { kind: 'error', message: result.error.message })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-6">
        <Spinner />
      </div>
    )
  }

  const status = authStatusOf(record)

  return (
    <div className="flex flex-col gap-3 p-4">
      {record ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text">Authentication</span>
            {status === 'expired' ? (
              <Badge kind="warning">Expired</Badge>
            ) : (
              <Badge kind="success">Authorized</Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            <Badge kind="info">{record.type}</Badge>
            {record.schemeName ? <span className="font-mono">{record.schemeName}</span> : null}
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1">
            <code
              className="flex-1 truncate font-mono text-[11px] text-text"
              aria-label="Stored credential"
            >
              {revealed ? record.token : mask(record.token)}
            </code>
            <IconButton
              label={revealed ? 'Hide credential' : 'Show credential'}
              onClick={() => setRevealed((v) => !v)}
            >
              {revealed ? <HideIcon /> : <RevealIcon />}
            </IconButton>
          </div>

          {status === 'expired' ? (
            <p className="text-xs text-warning">
              Token expired — re-authorize in Swagger to refresh it.
            </p>
          ) : null}

          <Button variant="danger" onClick={() => void service.clear(environmentId)}>
            Clear authentication
          </Button>
        </>
      ) : (
        <EmptyState
          icon={<AuthIcon className="h-8 w-8 text-muted" />}
          title="Not authorized"
          message="Use Swagger's Authorize button — your credential is saved and restored automatically on refresh."
        />
      )}

      <hr className="border-border" />

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-xs text-text">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => void toggleAutoRefresh(e.target.checked)}
          />
          Auto-refresh token on expiry
        </label>
        <p className="text-[11px] text-muted">
          When a request returns 401, runs your saved login request and stores the new token. Needs
          a saved login template.
        </p>
      </div>
    </div>
  )
}
