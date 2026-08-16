import type { ComponentProps } from 'react'

/**
 * Reusable input component with consistent styling.
 * Matches the styling used in RequestsPanel, HistoryPanel, and AuthPanel.
 */
type InputProps = ComponentProps<'input'> & {
  /** Optional label for accessibility */
  label?: string
}

export function Input({ label, ...props }: InputProps) {
  return (
    <>
      {label && (
        <label htmlFor={props.id} className="mb-flex text-[11px] font-medium text-text">
          {label}
        </label>
      )}
      <input
        {...props}
        className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
    </>
  )
}
