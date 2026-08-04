import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { AuthPanel, type AuthPanelService } from './AuthPanel'
import type { AuthRecord, SavedCredential } from './types'
import { EventBus } from '@/core/events'
import { ok, type Result } from '@/types'

const authorized: AuthRecord = {
  type: 'bearer',
  token: 'abcdefgh_SECRET_1234',
  schemeName: 'bearerAuth',
  environmentId: 'default',
  updatedAt: 0,
}

const credential: SavedCredential = {
  id: 'cred_admin',
  name: 'Admin',
  type: 'bearer',
  token: 'admin_TOKEN_9999',
  createdAt: 0,
}

function mockService(over: Partial<AuthPanelService> = {}): AuthPanelService {
  return {
    current: vi.fn(async (): Promise<Result<AuthRecord | null>> => ok(null)),
    clear: vi.fn(async (): Promise<Result<void>> => ok(undefined)),
    isAutoRefreshEnabled: vi.fn(async () => false),
    setAutoRefreshEnabled: vi.fn(async (): Promise<Result<void>> => ok(undefined)),
    addByLogin: vi.fn(async (): Promise<Result<SavedCredential>> => ok(credential)),
    refreshActivity: vi.fn(async () => []),
    refreshNow: vi.fn(async (): Promise<Result<boolean>> => ok(true)),
    loginEndpoint: vi.fn(async () => 'post /auth/login'),
    loginTemplate: vi.fn(async () => null),
    listSaved: vi.fn(async (): Promise<Result<SavedCredential[]>> => ok([])),
    saveAs: vi.fn(async (): Promise<Result<SavedCredential>> => ok(credential)),
    activateSaved: vi.fn(async (): Promise<Result<AuthRecord>> => ok(authorized)),
    deleteSaved: vi.fn(async (): Promise<Result<void>> => ok(undefined)),
    setLogin: vi.fn(async (): Promise<Result<SavedCredential>> => ok(credential)),
    ...over,
  }
}

describe('AuthPanel', () => {
  it('shows the empty state when nothing is authorized', async () => {
    render(<AuthPanel service={mockService()} bus={new EventBus()} environmentId="default" />)
    expect(await screen.findByText('Not authorized')).toBeInTheDocument()
  })

  it('copies the real token even while the display is masked', async () => {
    let copied: string | null = null
    ;(document as unknown as { execCommand: () => boolean }).execCommand = () => {
      copied = (document.querySelector('textarea') as HTMLTextAreaElement | null)?.value ?? null
      return true
    }
    const service = mockService({ current: vi.fn(async () => ok(authorized)) })
    render(<AuthPanel service={service} bus={new EventBus()} environmentId="default" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Copy token' }))
    // Masked on screen, but the clipboard gets the usable credential.
    expect(screen.getByLabelText('Stored credential').textContent).not.toBe('abcdefgh_SECRET_1234')
    expect(copied).toBe('abcdefgh_SECRET_1234')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('shows a masked credential and its type when authorized', async () => {
    const service = mockService({ current: vi.fn(async () => ok(authorized)) })
    render(<AuthPanel service={service} bus={new EventBus()} environmentId="default" />)

    expect(await screen.findByText('Authorized')).toBeInTheDocument()
    expect(screen.getByText('bearer')).toBeInTheDocument()
    // token is masked (last 4 shown), not the raw secret
    expect(screen.queryByText('abcdefgh_SECRET_1234')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Stored credential').textContent).toContain('1234')
  })

  it('reveals the full credential on toggle', async () => {
    const service = mockService({ current: vi.fn(async () => ok(authorized)) })
    render(<AuthPanel service={service} bus={new EventBus()} environmentId="default" />)
    await screen.findByText('Authorized')

    fireEvent.click(screen.getByRole('button', { name: 'Show credential' }))
    expect(screen.getByLabelText('Stored credential').textContent).toBe('abcdefgh_SECRET_1234')
  })

  it('calls clear() when the Clear button is pressed', async () => {
    const service = mockService({ current: vi.fn(async () => ok(authorized)) })
    render(<AuthPanel service={service} bus={new EventBus()} environmentId="default" />)
    await screen.findByText('Authorized')

    fireEvent.click(screen.getByRole('button', { name: 'Clear authentication' }))
    expect(service.clear).toHaveBeenCalledWith('default')
  })

  it('toggles auto-refresh and persists it via the service', async () => {
    const service = mockService()
    render(<AuthPanel service={service} bus={new EventBus()} environmentId="default" />)
    const toggle = await screen.findByRole('checkbox', { name: /Auto-refresh token on expiry/ })
    expect(toggle).not.toBeChecked()

    fireEvent.click(toggle)
    await waitFor(() => expect(service.setAutoRefreshEnabled).toHaveBeenCalledWith(true))
    expect(toggle).toBeChecked()
  })

  it('reflects the stored auto-refresh state on load', async () => {
    const service = mockService({ isAutoRefreshEnabled: vi.fn(async () => true) })
    render(<AuthPanel service={service} bus={new EventBus()} environmentId="default" />)
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: /Auto-refresh token on expiry/ })).toBeChecked(),
    )
  })

  it('reloads when an AUTH_UPDATED event fires', async () => {
    const bus = new EventBus()
    const current = vi.fn(async (): Promise<Result<AuthRecord | null>> => ok(null))
    render(<AuthPanel service={mockService({ current })} bus={bus} environmentId="default" />)
    await screen.findByText('Not authorized')

    current.mockResolvedValue(ok(authorized))
    act(() =>
      bus.publish('AUTH_UPDATED', { projectId: 'p', environmentId: 'default', type: 'bearer' }),
    )

    await waitFor(() => expect(screen.getByText('Authorized')).toBeInTheDocument())
  })

  // Saved tokens: switch accounts without re-authorizing in Swagger.
  it('saves the current token under a name', async () => {
    const service = mockService({ current: vi.fn(async () => ok(authorized)) })
    render(<AuthPanel service={service} bus={new EventBus()} environmentId="default" />)
    await screen.findByText('Authorized')

    const input = screen.getByLabelText('Name for the current token')
    fireEvent.change(input, { target: { value: 'Admin' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save current' }))

    await waitFor(() => expect(service.saveAs).toHaveBeenCalledWith('Admin', 'default'))
  })

  it('lists saved tokens, marks the one in use, and switches to another', async () => {
    const other: SavedCredential = {
      id: 'cred_manager',
      name: 'Manager',
      type: 'bearer',
      token: 'manager_TOKEN_1111',
      createdAt: 0,
    }
    // `authorized.token` matches nothing in the vault, so neither is "in use"
    // until we mark one — use a credential whose token IS the active one.
    const active: SavedCredential = { ...credential, token: authorized.token }
    const service = mockService({
      current: vi.fn(async () => ok(authorized)),
      listSaved: vi.fn(async () => ok([active, other])),
    })
    render(<AuthPanel service={service} bus={new EventBus()} environmentId="default" />)

    expect(await screen.findByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Manager')).toBeInTheDocument()
    // The saved credential matching the active token is flagged, not offered.
    expect(screen.getByText('In use')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Use' }))
    await waitFor(() =>
      expect(service.activateSaved).toHaveBeenCalledWith('cred_manager', 'default'),
    )
  })

  it('deletes a saved token', async () => {
    const service = mockService({
      current: vi.fn(async () => ok(authorized)),
      listSaved: vi.fn(async () => ok([credential])),
    })
    render(<AuthPanel service={service} bus={new EventBus()} environmentId="default" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Admin' }))
    await waitFor(() => expect(service.deleteSaved).toHaveBeenCalledWith('cred_admin'))
  })

  // An enabled toggle with no saved login request does nothing at all — the panel
  // has to say so instead of looking functional.
  it('warns when auto-refresh is on but no login request is saved', async () => {
    const service = mockService({
      current: vi.fn(async () => ok(authorized)),
      isAutoRefreshEnabled: vi.fn(async () => true),
      loginTemplate: vi.fn(async () => null),
    })
    render(<AuthPanel service={service} bus={new EventBus()} environmentId="default" />)
    expect(await screen.findByText(/No saved login request found/)).toBeInTheDocument()
  })

  it('names the request it will re-run once one is saved', async () => {
    const service = mockService({
      current: vi.fn(async () => ok(authorized)),
      isAutoRefreshEnabled: vi.fn(async () => true),
      loginTemplate: vi.fn(async () => 'Login'),
    })
    render(<AuthPanel service={service} bus={new EventBus()} environmentId="default" />)
    expect(await screen.findByText(/Will re-run your saved request/)).toBeInTheDocument()
  })

  // The prerequisite isn't guessable, so the steps ship inside the panel.
  it('explains the setup and can jump to the Requests tab', async () => {
    const onNavigate = vi.fn()
    render(
      <AuthPanel
        service={mockService({ current: vi.fn(async () => ok(authorized)) })}
        bus={new EventBus()}
        environmentId="default"
        onNavigate={onNavigate}
      />,
    )
    expect(await screen.findByText('How to set this up')).toBeInTheDocument()
    expect(screen.getByText(/save it as a template/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open Requests tab' }))
    expect(onNavigate).toHaveBeenCalledWith('requests')
  })

  // Each saved token can carry its own login, so the right account is refreshed
  // when several are stored.
  it('attaches a login to a saved token', async () => {
    const service = mockService({
      current: vi.fn(async () => ok(authorized)),
      listSaved: vi.fn(async () => ok([credential])),
    })
    render(<AuthPanel service={service} bus={new EventBus()} environmentId="default" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Add login for Admin' }))
    // Only the two things the user actually knows — no URL, no field names.
    fireEvent.change(screen.getByLabelText('Email for Admin'), {
      target: { value: 'admin@acme.io' },
    })
    fireEvent.change(screen.getByLabelText('Password for Admin'), {
      target: { value: 'secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save login' }))

    await waitFor(() =>
      expect(service.setLogin).toHaveBeenCalledWith('cred_admin', {
        username: 'admin@acme.io',
        password: 'secret',
      }),
    )
  })

  it('says the password is kept out of backups', async () => {
    const service = mockService({
      current: vi.fn(async () => ok(authorized)),
      listSaved: vi.fn(async () => ok([credential])),
    })
    render(<AuthPanel service={service} bus={new EventBus()} environmentId="default" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Add login for Admin' }))
    expect(screen.getByText(/left out of backups/)).toBeInTheDocument()
  })

  // Visibility: the user must be able to see the flow run, not infer it.
  it('shows recent refresh activity and can trigger it on demand', async () => {
    const service = mockService({
      current: vi.fn(async () => ok(authorized)),
      isAutoRefreshEnabled: vi.fn(async () => true),
      refreshActivity: vi.fn(async () => [
        { at: 0, outcome: 'success' as const, message: 'New token stored and applied (abc123)' },
        { at: 0, outcome: 'triggered' as const, message: '401 on GET /approvals/limits/' },
      ]),
    })
    render(<AuthPanel service={service} bus={new EventBus()} environmentId="default" />)

    const log = await screen.findByRole('list', { name: 'Refresh activity' })
    expect(log).toHaveTextContent('401 on GET /approvals/limits/')
    expect(log).toHaveTextContent('New token stored and applied')

    fireEvent.click(screen.getByRole('button', { name: 'Refresh now' }))
    await waitFor(() => expect(service.refreshNow).toHaveBeenCalledWith('default'))
  })

  // Add an account without authorizing in Swagger first: name + credentials in,
  // token fetched and stored automatically.
  it('signs in and saves a new named token from just a name, email and password', async () => {
    const service = mockService({ current: vi.fn(async () => ok(authorized)) })
    render(<AuthPanel service={service} bus={new EventBus()} environmentId="default" />)

    fireEvent.click(await screen.findByRole('button', { name: /Add account with email/ }))
    fireEvent.change(screen.getByLabelText('New account name'), { target: { value: 'Admin' } })
    fireEvent.change(screen.getByLabelText('New account email'), {
      target: { value: 'admin@acme.io' },
    })
    fireEvent.change(screen.getByLabelText('New account password'), {
      target: { value: 'secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in & save' }))

    await waitFor(() =>
      expect(service.addByLogin).toHaveBeenCalledWith('Admin', 'admin@acme.io', 'secret'),
    )
    // The form closes and the list reloads, so the new token shows up.
    await waitFor(() => expect(service.listSaved).toHaveBeenCalled())
  })

  it('will not submit a half-filled account', async () => {
    const service = mockService({ current: vi.fn(async () => ok(authorized)) })
    render(<AuthPanel service={service} bus={new EventBus()} environmentId="default" />)
    fireEvent.click(await screen.findByRole('button', { name: /Add account with email/ }))
    fireEvent.change(screen.getByLabelText('New account name'), { target: { value: 'Admin' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in & save' }))
    expect(service.addByLogin).not.toHaveBeenCalled()
  })
})
