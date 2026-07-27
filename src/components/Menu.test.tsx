import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createRoot } from 'react-dom/client'
import { Menu } from './Menu'

describe('Menu', () => {
  const items = (onA = vi.fn(), onB = vi.fn()) => [
    { label: 'Replay', onSelect: onA },
    { label: 'Delete', onSelect: onB, danger: true },
  ]

  it('is closed until the trigger is clicked', () => {
    render(<Menu label="Actions for X" items={items()} />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Actions for X' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Replay' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
  })

  it('runs the item action and closes on select', () => {
    const onA = vi.fn()
    render(<Menu label="Actions" items={items(onA)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Replay' }))
    expect(onA).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes on Escape and on outside click', () => {
    render(<Menu label="Actions" items={items()} />)
    const trigger = screen.getByRole('button', { name: 'Actions' })

    fireEvent.click(trigger)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(trigger)
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('exposes aria-expanded / aria-haspopup on the trigger', () => {
    render(<Menu label="Actions" items={items()} />)
    const trigger = screen.getByRole('button', { name: 'Actions' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  // Regression: inside a Shadow DOM, a `mousedown` on our own item is retargeted
  // to the shadow host at window level. The outside-click check must use
  // composedPath (not e.target) or it closes before the item's click fires.
  it('keeps the menu open when its item is pressed inside a shadow root', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const shadow = host.attachShadow({ mode: 'open' })
    const mount = document.createElement('div')
    shadow.appendChild(mount)

    const onA = vi.fn()
    const root = createRoot(mount)
    act(() => root.render(<Menu label="Actions" items={[{ label: 'Replay', onSelect: onA }]} />))

    act(() => (shadow.querySelector('button') as HTMLButtonElement).click()) // open
    const item = shadow.querySelector('[role="menuitem"]') as HTMLElement
    expect(item).toBeTruthy()

    // Browser dispatches a composed, bubbling mousedown that reaches window
    // retargeted to the host — must NOT close the menu (composedPath check).
    act(() => {
      item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }))
    })
    expect(shadow.querySelector('[role="menu"]')).toBeTruthy()

    act(() => item.click())
    expect(onA).toHaveBeenCalledTimes(1)

    act(() => root.unmount())
    host.remove()
  })
})
