import { useState } from 'react'
import {
  Badge,
  CopyButton,
  Tabs,
  type TabDef,
  ClockIcon,
  RequestIcon,
  ResponseIcon,
} from '@/components'
import type { HistoryEntry, HistoryRecord } from './types'
import { statusKind } from './status'

const TABS: TabDef[] = [
  { id: 'request', label: 'Request', icon: <RequestIcon className="h-3.5 w-3.5" /> },
  { id: 'response', label: 'Response', icon: <ResponseIcon className="h-3.5 w-3.5" /> },
]

/** Pretty-print JSON bodies for readability; fall back to the raw string. */
function prettify(body?: string): string {
  if (!body) return ''
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return String(ts)
  }
}

function Panel({
  body,
  wrap,
  onToggleWrap,
}: {
  body: string
  wrap: boolean
  onToggleWrap: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted">
          {body ? `${body.length} characters` : 'Empty'}
        </span>
        {body ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={wrap}
              onClick={onToggleWrap}
              title="Wrap long lines instead of scrolling sideways"
              className={
                wrap
                  ? 'rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-white'
                  : 'rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase text-muted hover:bg-surface hover:text-text'
              }
            >
              wrap
            </button>
            <CopyButton text={body} />
          </div>
        ) : null}
      </div>
      {/* Grows with the payload (up to most of the panel) rather than sitting in
          a short fixed box, so big JSON gets room while a 2-line body stays small. */}
      <pre
        className={`max-h-[62vh] min-h-[14vh] overflow-auto rounded-md border border-border bg-surface p-3 font-mono text-[11px] leading-relaxed text-text ${
          wrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
        }`}
      >
        {body || '(empty)'}
      </pre>
    </div>
  )
}

export interface HistoryDetailProps {
  record: HistoryRecord
  /** Every recorded call to this same operation, newest first (for the timeline). */
  calls?: HistoryEntry[]
  /** Load another call of this operation into the inspector. */
  onSelectCall?: (id: string) => void
}

/**
 * Tabbed inspector for a history entry: a fixed summary header (status / method
 * / path + metadata) with Request / Response tabs, each showing the (pretty-
 * printed) body and a copy button — plus a timeline of the other
 * times this same operation was called, so repeats are comparable without
 * closing the dialog. Replay / Locate live in the dialog header.
 */
export function HistoryDetail({ record, calls = [], onSelectCall }: HistoryDetailProps) {
  const [tab, setTab] = useState('request')
  // Wrap by default: the panel is narrow, and long tokens/URLs would otherwise
  // need sideways scrolling. Kept at this level so it survives a tab switch.
  const [wrap, setWrap] = useState(true)
  const request = prettify(record.requestBody)
  const response = prettify(record.responseBody)
  const toggleWrap = () => setWrap((v) => !v)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-md border border-border bg-surface px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge kind={statusKind(record.status)}>{record.status}</Badge>
          <span className="font-mono text-xs font-semibold uppercase text-muted">
            {record.method}
          </span>
          <span className="break-all font-mono text-xs text-text">{record.endpoint}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {formatTime(record.timestamp)}
          </span>
          {record.durationMs != null ? <span>{record.durationMs} ms</span> : null}
          <span>env: {record.environmentId}</span>
        </div>
      </div>

      {calls.length > 1 ? (
        <div className="flex flex-col gap-1">
          <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
            {calls.length} calls to this endpoint
          </span>
          <ul
            aria-label="Calls to this endpoint"
            className="flex max-h-[18vh] flex-col gap-1 overflow-auto"
          >
            {calls.map((call) => {
              const active = call.id === record.id
              return (
                <li key={call.id}>
                  <button
                    type="button"
                    aria-current={active}
                    onClick={() => onSelectCall?.(call.id)}
                    className={`flex w-full items-center gap-2 rounded-md border px-2 py-1 text-left text-[11px] ${
                      active
                        ? 'border-primary bg-surface text-text'
                        : 'border-border text-muted hover:bg-surface hover:text-text'
                    }`}
                  >
                    <Badge kind={statusKind(call.status)}>{call.status}</Badge>
                    <span className="flex-1 truncate">{formatTime(call.timestamp)}</span>
                    {call.durationMs != null ? <span>{call.durationMs} ms</span> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <Tabs tabs={TABS} activeId={tab} onChange={setTab} />

      {tab === 'request' ? (
        <Panel body={request} wrap={wrap} onToggleWrap={toggleWrap} />
      ) : (
        <Panel body={response} wrap={wrap} onToggleWrap={toggleWrap} />
      )}
    </div>
  )
}
