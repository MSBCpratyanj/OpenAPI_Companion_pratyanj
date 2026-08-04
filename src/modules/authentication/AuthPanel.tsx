import { useCallback, useEffect, useState } from 'react'
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
  AuthIcon,
  DeleteIcon,
  RevealIcon,
  HideIcon,
} from '@/components'
import type { RefreshLogEntry } from '@/services'
import type { AuthRecord, SavedCredential, SavedLogin } from './types'
import { authStatusOf } from './status'

/** Just the surface AuthPanel needs from AuthenticationService (eases testing). */
export interface AuthPanelService {
  current(environmentId: string): Promise<Result<AuthRecord | null>>
  clear(environmentId: string): Promise<Result<void>>
  isAutoRefreshEnabled(): Promise<boolean>
  setAutoRefreshEnabled(enabled: boolean): Promise<Result<void>>
  /**
   * Name of the saved request auto-refresh would re-run, or null if none matches.
   * Auto-refresh is inert without one, so the panel states it plainly.
   */
  loginTemplate(environmentId: string): Promise<string | null>
  /** The sign-in operation saved credentials would be sent to, if identifiable. */
  loginEndpoint(): Promise<string | null>
  /** Recent refresh activity, newest first — so the flow is observable. */
  refreshActivity(): Promise<RefreshLogEntry[]>
  /** Run a refresh immediately, ignoring the cooldown. */
  refreshNow(environmentId: string): Promise<Result<boolean>>
  /** Sign in with these credentials and save the issued token under `name`. */
  addByLogin(name: string, username: string, password: string): Promise<Result<SavedCredential>>
  /** Named credential vault — switch accounts without re-authorizing. */
  listSaved(): Promise<Result<SavedCredential[]>>
  saveAs(name: string, environmentId: string): Promise<Result<SavedCredential>>
  activateSaved(id: string, environmentId: string): Promise<Result<AuthRecord>>
  deleteSaved(id: string): Promise<Result<void>>
  /** Attach (or clear) the login used to re-authenticate this account. */
  setLogin(id: string, login: SavedLogin | null): Promise<Result<SavedCredential>>
}

interface AuthPanelProps {
  service: AuthPanelService
  bus: EventBus
  environmentId: string
  /** Jump to another tab — lets the setup steps link straight to Requests. */
  onNavigate?: (tabId: string) => void
}

const EMPTY_LOGIN: SavedLogin = { username: '', password: '' }

const OUTCOME_CLASS: Record<RefreshLogEntry['outcome'], string> = {
  triggered: 'text-text',
  skipped: 'text-muted',
  success: 'text-success',
  failed: 'text-danger',
}

function clockTime(at: number): string {
  try {
    return new Date(at).toLocaleTimeString()
  } catch {
    return ''
  }
}

function mask(token: string): string {
  const tail = token.slice(-4)
  return `${'•'.repeat(Math.min(12, Math.max(4, token.length - 4)))}${tail}`
}

export function AuthPanel({ service, bus, environmentId, onNavigate }: AuthPanelProps) {
  const [record, setRecord] = useState<AuthRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [saved, setSaved] = useState<SavedCredential[]>([])
  const [loginTemplate, setLoginTemplate] = useState<string | null>(null)
  const [loginEndpoint, setLoginEndpoint] = useState<string | null>(null)
  const [activity, setActivity] = useState<RefreshLogEntry[]>([])
  const [testing, setTesting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [newAccount, setNewAccount] = useState({ name: '', username: '', password: '' })
  /** Which vault entry has its login form open. */
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<SavedLogin>(EMPTY_LOGIN)
  const [newName, setNewName] = useState('')

  const load = useCallback(async () => {
    const [result, vault] = await Promise.all([service.current(environmentId), service.listSaved()])
    setRecord(result.ok ? result.value : null)
    if (vault.ok) setSaved(vault.value)
    setLoading(false)
  }, [service, environmentId])

  const report = (result: Result<unknown>) => {
    if (!result.ok) bus.publish('NOTIFY', { kind: 'error', message: result.error.message })
    return result.ok
  }

  const saveCurrent = async () => {
    const name = newName.trim()
    if (!name) return
    if (report(await service.saveAs(name, environmentId))) setNewName('')
    await load()
  }

  const activate = async (id: string) => {
    report(await service.activateSaved(id, environmentId))
    await load()
  }

  const addAccount = async () => {
    const { name, username, password } = newAccount
    if (!name.trim() || !username.trim() || !password) return
    setBusy(true)
    const result = await service.addByLogin(name.trim(), username.trim(), password)
    setBusy(false)
    if (report(result)) {
      setNewAccount({ name: '', username: '', password: '' })
      setAdding(false)
    }
    setActivity(await service.refreshActivity())
    await load()
  }

  const testRefresh = async () => {
    setTesting(true)
    const result = await service.refreshNow(environmentId)
    if (!result.ok) report(result)
    setActivity(await service.refreshActivity())
    setTesting(false)
    await load()
  }

  const openLoginForm = (cred: SavedCredential) => {
    setEditing(cred.id)
    setForm({ ...EMPTY_LOGIN, ...cred.login })
  }

  const saveLogin = async (id: string) => {
    // Both required — half a login can't sign anything in.
    const complete = form.username.trim() !== '' && form.password !== ''
    report(await service.setLogin(id, complete ? form : null))
    setEditing(null)
    await load()
  }

  const removeSaved = async (id: string) => {
    report(await service.deleteSaved(id))
    await load()
  }

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  useEffect(() => {
    void service.isAutoRefreshEnabled().then(setAutoRefresh)
    void service.loginTemplate(environmentId).then(setLoginTemplate)
    void service.loginEndpoint().then(setLoginEndpoint)
    void service.refreshActivity().then(setActivity)
  }, [service, environmentId])

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
            {/* Copies the real token, not the masked display value. */}
            <CopyButton text={record.token} label="Copy token" iconOnly />
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

      {/* Named credentials: switch accounts (admin / manager / read-only) without
          re-authorizing in Swagger each time. */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-text">Saved tokens</span>

        {saved.length === 0 ? (
          <p className="text-[11px] text-muted">
            Save the current token under a name, then switch between accounts with one click.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {saved.map((cred) => {
              const active = record?.token === cred.token
              const expired = cred.expiresAt != null && cred.expiresAt <= Date.now()
              return (
                <li
                  key={cred.id}
                  className={`flex flex-col gap-1 rounded-md border px-2 py-1 ${
                    active ? 'border-primary bg-surface' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[11px] font-medium text-text">
                        {cred.name}
                      </span>
                      <span className="truncate font-mono text-[10px] text-muted">
                        {cred.type}
                        {expired ? ' · expired' : ''}
                      </span>
                    </div>
                    {active ? (
                      <Badge kind="success">In use</Badge>
                    ) : (
                      <Button variant="secondary" onClick={() => void activate(cred.id)}>
                        Use
                      </Button>
                    )}
                    <CopyButton text={cred.token} label={`Copy ${cred.name}`} iconOnly />
                    <IconButton
                      label={`${cred.login ? 'Edit' : 'Add'} login for ${cred.name}`}
                      onClick={() => openLoginForm(cred)}
                      className={cred.login ? 'text-success' : ''}
                    >
                      <AuthIcon />
                    </IconButton>
                    <IconButton
                      label={`Delete ${cred.name}`}
                      onClick={() => void removeSaved(cred.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </div>

                  {editing === cred.id ? (
                    <div className="flex flex-col gap-1 border-t border-border pt-1">
                      <p className="text-[10px] leading-snug text-muted">
                        Signs <strong>this</strong> account back in when its token expires, and
                        replaces only this saved token. Stored on this device in plain text; the
                        password is left out of backups.
                      </p>
                      {/* Name the target: credentials must never be posted to a
                          surprise endpoint (a loose match once hit forgot-password). */}
                      {loginEndpoint ? (
                        <p className="text-[10px] text-muted">
                          Will sign in via{' '}
                          <span className="font-mono text-text">{loginEndpoint}</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-warning">
                          No sign-in endpoint could be identified in this API, so credentials
                          can&apos;t be used yet. Saving a login request in the{' '}
                          <strong>Requests</strong> tab gives it something to run instead.
                        </p>
                      )}
                      <input
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        placeholder="Email / username"
                        aria-label={`Email for ${cred.name}`}
                        className="rounded-md border border-border bg-bg px-2 py-1 text-[11px] text-text"
                      />
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Password"
                        aria-label={`Password for ${cred.name}`}
                        className="rounded-md border border-border bg-bg px-2 py-1 text-[11px] text-text"
                      />
                      <div className="flex justify-end gap-1">
                        <Button variant="secondary" onClick={() => setEditing(null)}>
                          Cancel
                        </Button>
                        <Button variant="primary" onClick={() => void saveLogin(cred.id)}>
                          Save login
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}

        {/* Add an account without authorizing in Swagger first: sign in here and
            keep the issued token, with its credentials, under one name. */}
        {adding ? (
          <div className="flex flex-col gap-1 rounded-md border border-primary px-2 py-2">
            <span className="text-[11px] font-medium text-text">Add account</span>
            <p className="text-[10px] leading-snug text-muted">
              Signs in with these details and saves the token it returns
              {loginEndpoint ? (
                <>
                  {' '}
                  via <span className="font-mono text-text">{loginEndpoint}</span>
                </>
              ) : null}
              .
            </p>
            <input
              value={newAccount.name}
              onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              placeholder="Token name (e.g. Admin)"
              aria-label="New account name"
              className="rounded-md border border-border bg-bg px-2 py-1 text-[11px] text-text"
            />
            <input
              value={newAccount.username}
              onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
              placeholder="Email / username"
              aria-label="New account email"
              className="rounded-md border border-border bg-bg px-2 py-1 text-[11px] text-text"
            />
            <input
              type="password"
              value={newAccount.password}
              onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
              placeholder="Password"
              aria-label="New account password"
              className="rounded-md border border-border bg-bg px-2 py-1 text-[11px] text-text"
            />
            <div className="flex justify-end gap-1">
              <Button variant="secondary" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => void addAccount()} disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in & save'}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            + Add account with email &amp; password
          </Button>
        )}

        <div className="flex gap-1">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveCurrent()
            }}
            placeholder="Name (e.g. Admin)"
            aria-label="Name for the current token"
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <Button variant="secondary" onClick={() => void saveCurrent()} disabled={!newName.trim()}>
            Save current
          </Button>
        </div>
      </div>

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
          When a request returns 401, runs your saved login request and stores the new token.
        </p>
        {/* Setup lives in the product, not just in a changelog: the feature has a
            prerequisite the user can't guess, so spell it out where it's enabled. */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void testRefresh()} disabled={testing}>
            {testing ? 'Refreshing…' : 'Refresh now'}
          </Button>
          <span className="text-[10px] text-muted">
            Runs the flow immediately, so you can watch it.
          </span>
        </div>

        {/* Proof of work: every decision the refresher made, most recent first.
            Without this the feature is invisible until it silently doesn't fire. */}
        {activity.length > 0 ? (
          <ul aria-label="Refresh activity" className="flex flex-col gap-0.5">
            {activity.map((entry, i) => (
              <li key={`${entry.at}-${i}`} className="flex gap-1 text-[10px] leading-snug">
                <span className="font-mono text-muted">{clockTime(entry.at)}</span>
                <span className={OUTCOME_CLASS[entry.outcome]}>{entry.message}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <details className="rounded-md border border-border px-2 py-1">
          <summary className="cursor-pointer text-[11px] text-primary">How to set this up</summary>
          <ol className="mt-1 flex list-decimal flex-col gap-1 pl-4 text-[11px] text-muted">
            <li>
              In Swagger, open your login endpoint (e.g. POST /auth/login) and fill in the body.
            </li>
            <li>Click Execute once, so a real response is on screen.</li>
            <li>
              Open the <strong>Requests</strong> tab and save it as a template. Its name or path
              must mention <span className="font-mono">login</span>,{' '}
              <span className="font-mono">signin</span>, <span className="font-mono">auth</span> or{' '}
              <span className="font-mono">token</span> — that&apos;s how it&apos;s recognised.
            </li>
            <li>
              Done. When a call returns 401, that request is re-run, the token is read from its
              response, and Swagger is re-authorized automatically.
            </li>
          </ol>
          {onNavigate ? (
            <Button variant="secondary" onClick={() => onNavigate('requests')} className="mt-2">
              Open Requests tab
            </Button>
          ) : null}
        </details>

        {/* The prerequisite, stated where it's enabled — an enabled toggle with no
            login request saved does nothing at all. */}
        {autoRefresh ? (
          loginTemplate ? (
            <p className="text-[11px] text-success">
              Will re-run your saved request “{loginTemplate}”.
            </p>
          ) : (
            <p className="text-[11px] text-warning">
              No saved login request found, so this can&apos;t run yet. Open your login endpoint in
              Swagger, fill it in, then save it from the <strong>Requests</strong> tab — its name or
              path needs to mention login / signin / auth / token.
            </p>
          )
        ) : null}
      </div>
    </div>
  )
}
