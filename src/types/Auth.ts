export interface AuthUser {
  readonly id: string
  readonly email: string | null
}

// Tokens and persistence belong to the Supabase SDK, not the UI session model.
export interface AuthSession {
  readonly user: AuthUser
}

export interface SignInCredentials {
  email: string
  password: string
}

export type AuthStatus =
  'idle' | 'initializing' | 'authenticated' | 'unauthenticated' | 'unavailable' | 'error'

export type AuthErrorCode =
  | 'not_configured'
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'rate_limited'
  | 'network_error'
  | 'unknown'
  | 'busy'
  | 'disposed'

export type AuthSessionListener = (session: AuthSession | null) => void

// The future Supabase adapter maps SDK results/errors into these application types.
export interface AuthProvider {
  getSession(): Promise<AuthSession | null>
  signIn(credentials: SignInCredentials): Promise<AuthSession>
  signOut(): Promise<void>
  subscribe(listener: AuthSessionListener): () => void
}

export interface AuthService extends AuthProvider {
  readonly isConfigured: boolean
}
