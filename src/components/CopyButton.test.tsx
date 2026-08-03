import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { CopyButton } from './CopyButton'

describe('CopyButton', () => {
  let copied: string | null

  beforeEach(() => {
    copied = null
    // jsdom has no execCommand; capture what the textarea holds when it fires.
    ;(document as unknown as { execCommand: () => boolean }).execCommand = () => {
      copied = (document.querySelector('textarea') as HTMLTextAreaElement | null)?.value ?? null
      return true
    }
  })

  it('copies the text and shows feedback', () => {
    render(<CopyButton text="secret-token" label="Copy token" />)
    fireEvent.click(screen.getByRole('button', { name: /Copy token/ }))
    expect(copied).toBe('secret-token')
    expect(screen.getByRole('button', { name: /Copied/ })).toBeInTheDocument()
  })

  it('renders an icon-only button that still copies, labelled for screen readers', () => {
    render(<CopyButton text="secret-token" label="Copy token" iconOnly />)
    const button = screen.getByRole('button', { name: 'Copy token' })
    expect(button.textContent).toBe('') // icon only — no visible text
    fireEvent.click(button)
    expect(copied).toBe('secret-token')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('reverts the feedback after the timeout', () => {
    vi.useFakeTimers()
    render(<CopyButton text="x" label="Copy token" iconOnly />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy token' }))
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1600))
    expect(screen.getByRole('button', { name: 'Copy token' })).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('shows no feedback when the copy fails', () => {
    ;(document as unknown as { execCommand: () => boolean }).execCommand = () => false
    render(<CopyButton text="x" label="Copy token" iconOnly />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy token' }))
    expect(screen.queryByRole('button', { name: 'Copied' })).not.toBeInTheDocument()
  })
})
