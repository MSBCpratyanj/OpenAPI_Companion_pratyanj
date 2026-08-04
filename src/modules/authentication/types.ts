/** Authentication domain types (FDD-001, planning/08 §5). */

export type AuthType = 'bearer' | 'jwt' | 'apiKey' | 'basic'

export const SUPPORTED_AUTH_TYPES: readonly AuthType[] = ['bearer', 'jwt', 'apiKey', 'basic']

export interface AuthRecord {
  type: AuthType
  token: string
  /** Swagger security-scheme name — needed to restore into the right scheme. */
  schemeName?: string
  environmentId: string
  updatedAt: number
  lastUsed?: number
  /** Epoch-ms expiry (from a JWT `exp` claim), when known. */
  expiresAt?: number
}

export type AuthStatus = 'none' | 'authorized' | 'expired'

/**
 * A credential saved under a name, so switching accounts (admin / manager /
 * read-only) is one click instead of re-authorizing in Swagger every time.
 * Separate from the active `AuthRecord`: the vault is per project and outlives
 * whichever environment is currently selected.
 */
export interface SavedCredential {
  id: string
  name: string
  type: AuthType
  token: string
  schemeName?: string
  createdAt: number
  /** Epoch-ms expiry (from a JWT `exp` claim), when known. */
  expiresAt?: number
}
