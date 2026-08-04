// Authentication Manager (FR-004, FDD-001). Persist & auto-restore authorization.
export { AuthenticationService } from './auth-service'
export type { AuthenticationServiceOptions } from './auth-service'
export { AuthPanel } from './AuthPanel'
export type { AuthPanelService } from './AuthPanel'
export { authStatusOf } from './status'
export {
  SUPPORTED_AUTH_TYPES,
  type AuthType,
  type AuthRecord,
  type AuthStatus,
  type SavedCredential,
  type SavedLogin,
} from './types'
