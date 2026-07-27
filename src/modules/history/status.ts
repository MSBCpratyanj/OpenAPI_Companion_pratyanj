import type { BadgeKind } from '@/components'

/** Map an HTTP status to a badge colour (2xx green, 4xx amber, 5xx red). */
export function statusKind(status: number): BadgeKind {
  if (status >= 500) return 'error'
  if (status >= 400) return 'warning'
  if (status >= 200 && status < 300) return 'success'
  return 'neutral'
}

/** Map an HTTP method to a badge colour (matches the endpoint-search palette). */
export function methodKind(method: string): BadgeKind {
  switch (method.toLowerCase()) {
    case 'get':
      return 'info'
    case 'post':
      return 'success'
    case 'put':
    case 'patch':
      return 'warning'
    case 'delete':
      return 'error'
    default:
      return 'neutral'
  }
}
