import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IconButton } from './IconButton'
import { MoreIcon } from './icons'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
}

interface MenuProps {
  /** Accessible label for the trigger (e.g. "Actions for GET /users"). */
  label: string
  items: MenuItem[]
  /** Trigger glyph; defaults to the "⋮" overflow icon. */
  trigger?: ReactNode
}

const MENU_WIDTH = 168

/**
 * A "⋮" overflow menu. The popup is `position: fixed` and anchored to the
 * trigger's viewport rect, so it is never clipped by the sidebar's
 * `overflow` containers (it escapes the scroll area entirely). Closes on
 * outside-click, Escape, or any scroll. Shadow-DOM-aware.
 */
export function Menu({ label, items, trigger }: MenuProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const anchorRef = useRef<HTMLSpanElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onDown = (e: Event) => {
      // We live in a Shadow DOM, so at the window level `e.target` is
      // retargeted to the shadow host — checking it would treat clicks on our
      // OWN items as "outside" and close before the click lands. `composedPath`
      // pierces the shadow boundary and lists the real nodes.
      const path = e.composedPath()
      const menu = menuRef.current
      const anchor = anchorRef.current
      if ((menu && path.includes(menu)) || (anchor && path.includes(anchor))) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    // Capture phase so scrolling inside the sidebar's panel also closes it.
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  const toggle = () => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (rect) {
      setPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - MENU_WIDTH) })
    }
    setOpen((v) => !v)
  }

  return (
    <span ref={anchorRef} className="inline-flex">
      <IconButton label={label} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        {trigger ?? <MoreIcon />}
      </IconButton>
      {open ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
          className="fixed z-[2147483647] flex flex-col overflow-hidden rounded-md border border-border bg-bg py-1 shadow-2xl"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-surface ${
                item.danger ? 'text-danger' : 'text-text'
              }`}
            >
              {item.icon ? (
                <span className="inline-flex h-4 w-4 items-center">{item.icon}</span>
              ) : null}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  )
}
