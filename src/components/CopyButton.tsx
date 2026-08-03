import { useEffect, useRef, useState } from 'react'
import { copyText } from '@/utils'
import { Button } from './Button'
import { IconButton } from './IconButton'
import { CopyIcon, CopiedIcon } from './icons'

/**
 * Copies `text` on click (explicit user action), with brief "Copied" feedback.
 * `iconOnly` renders it as an icon button, for tight rows like the credential
 * field — the copy behavior stays here either way.
 */
export function CopyButton({
  text,
  label = 'Copy',
  iconOnly = false,
}: {
  text: string
  label?: string
  iconOnly?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const onClick = () => {
    if (!copyText(text)) return
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1500)
  }

  if (iconOnly) {
    return (
      <IconButton
        label={copied ? 'Copied' : label}
        onClick={onClick}
        className={copied ? 'text-success' : ''}
      >
        {copied ? <CopiedIcon /> : <CopyIcon />}
      </IconButton>
    )
  }

  return (
    <Button variant="secondary" onClick={onClick}>
      {copied ? <CopiedIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </Button>
  )
}
