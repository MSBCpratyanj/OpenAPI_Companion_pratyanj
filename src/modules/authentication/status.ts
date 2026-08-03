import type { AuthRecord, AuthStatus } from './types'

/**
 * Fold a stored credential into a display status. Shared by the Auth panel and
 * the dashboard so they can never disagree about what "authorized" means.
 */
export function authStatusOf(record: AuthRecord | null, now: number = Date.now()): AuthStatus {
  if (!record) return 'none'
  if (record.expiresAt != null && record.expiresAt <= now) return 'expired'
  return 'authorized'
}
