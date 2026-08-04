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
    listSaved: vi.fn(async (): Promise<Result<SavedCredential[]>> => ok([])),
    saveAs: vi.fn(async (): Promise<Result<SavedCredential>> => ok(credential)),
    activateSaved: vi.fn(async (): Promise<Result<AuthRecord>> => ok(authorized)),
    deleteSaved: vi.fn(async (): Promise<Result<void>> => ok(undefined)),
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
})
