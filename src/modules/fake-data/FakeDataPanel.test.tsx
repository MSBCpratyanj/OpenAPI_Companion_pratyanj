import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ok, type Result } from '@/types'
import { EventBus } from '@/core/events'
import { FakeDataPanel } from './FakeDataPanel'
import type {
  FakeDataPanelService,
  FakeDataPreview,
  GenerateResult,
  BulkDatasetResult,
} from './types'

const preview: FakeDataPreview = {
  endpointId: 'post /users',
  method: 'post',
  fields: [
    { key: 'email', value: '', generator: 'email' },
    { key: 'fullName', value: 'Jane Doe', generator: 'fullName' },
    { key: 'note', value: 'x', generator: null },
  ],
}

function mockService(over: Partial<FakeDataPanelService> = {}): FakeDataPanelService {
  return {
    previewOpenRequest: vi.fn(() => preview),
    generateAll: vi.fn(async (): Promise<Result<GenerateResult>> =>
      ok({ endpointId: 'post /users', fieldCount: 2 }),
    ),
    regenerateField: vi.fn(async (): Promise<Result<GenerateResult>> =>
      ok({ endpointId: 'post /users', fieldCount: 1 }),
    ),
    listEndpoints: vi.fn(() => [
      { endpointId: 'post /users', method: 'post', path: '/users', summary: 'Create user' },
    ]),
    generateMockPayload: vi.fn(async (): Promise<Result<string>> =>
      ok(JSON.stringify({ email: 'jane@example.com', name: 'Jane' }, null, 2)),
    ),
    generateBulk: vi.fn(async (): Promise<Result<BulkDatasetResult>> =>
      ok({
        format: 'json',
        count: 5,
        text: JSON.stringify([{ id: 1 }, { id: 2 }], null, 2),
        records: [{ id: 1 }, { id: 2 }],
      }),
    ),
    injectPayload: vi.fn(async (): Promise<Result<void>> => ok(undefined)),
    ...over,
  }
}

describe('FakeDataPanel', () => {
  it('renders Live Fill sub-tab by default and shows fields', async () => {
    const service = mockService()
    render(<FakeDataPanel service={service} bus={new EventBus()} />)
    expect(screen.getByText('⚡ Live Fill')).toBeInTheDocument()
    expect(screen.getByText(/Detected Schema Fields/i)).toBeInTheDocument()
    expect(screen.getByText('email')).toBeInTheDocument()
  })

  it('switches between sub-tabs cleanly', async () => {
    const service = mockService()
    render(<FakeDataPanel service={service} bus={new EventBus()} />)

    // Switch to Mock Studio
    fireEvent.click(screen.getByText('🛠️ Mock Studio'))
    expect(screen.getByText('Generation Mode')).toBeInTheDocument()
    expect(screen.getByText('Synthesized JSON Payload')).toBeInTheDocument()

    // Switch to Bulk Seeder
    fireEvent.click(screen.getByText('📦 Bulk Seeder'))
    expect(screen.getByText('Target Schema / Endpoint')).toBeInTheDocument()
    expect(screen.getByText(/Generate 10 Records/i)).toBeInTheDocument()

    // Switch to Library
    fireEvent.click(screen.getByText('🎲 Library'))
    expect(screen.getByPlaceholderText(/Search 40\+ generators/i)).toBeInTheDocument()
  })

  it('live tab lists fields with detected-generator and unsupported badges', async () => {
    const service = mockService()
    render(<FakeDataPanel service={service} bus={new EventBus()} />)

    expect(screen.getByText('email')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument() // humanized generator
    expect(screen.getByText('Full name')).toBeInTheDocument()
    expect(screen.getByText('unsupported')).toBeInTheDocument()
  })

  it('live tab generate-all fills fields and toasts the count', async () => {
    const service = mockService()
    const bus = new EventBus()
    const toast = vi.fn()
    bus.subscribe('NOTIFY', toast)
    render(<FakeDataPanel service={service} bus={bus} />)

    fireEvent.click(screen.getByRole('button', { name: /Fill Empty Fields/i }))
    await waitFor(() => expect(service.generateAll).toHaveBeenCalledWith())
    expect(toast).toHaveBeenCalledWith({ kind: 'success', message: 'Generated 2 fields.' })
  })

  it('live tab regenerates a single field; unsupported fields are disabled', async () => {
    const service = mockService()
    render(<FakeDataPanel service={service} bus={new EventBus()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate email' }))
    await waitFor(() => expect(service.regenerateField).toHaveBeenCalledWith('email'))

    expect(screen.getByRole('button', { name: 'Regenerate note' })).toBeDisabled()
  })

  it('injects payload into swagger from studio tab', async () => {
    const service = mockService()
    const bus = new EventBus()
    const toast = vi.fn()
    bus.subscribe('NOTIFY', toast)
    render(<FakeDataPanel service={service} bus={bus} />)

    fireEvent.click(screen.getByText('🛠️ Mock Studio'))
    await waitFor(() => expect(screen.getByText('Inject into Swagger')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Inject into Swagger'))
    await waitFor(() => expect(service.injectPayload).toHaveBeenCalled())
  })

  it('library tab regenerates only the clicked generator sample while keeping others stable', async () => {
    const service = mockService()
    render(<FakeDataPanel service={service} bus={new EventBus()} />)

    fireEvent.click(screen.getByText('🎲 Library'))
    expect(screen.getByText('State / Province')).toBeInTheDocument()
    expect(screen.getByText('Country')).toBeInTheDocument()

    const newSampleButtons = screen.getAllByRole('button', { name: 'New sample' })
    expect(newSampleButtons.length).toBeGreaterThan(0)
    fireEvent.click(newSampleButtons[0]!)
  })
})
