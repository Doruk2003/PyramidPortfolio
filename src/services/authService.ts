import { supabase } from '../lib/supabase'
import { createSupabaseAuthProvider } from './supabaseAuthProvider'
import { AuthServiceError } from './authErrors'
export { AuthServiceError, getAuthErrorCode } from './authErrors'
import type {
  AuthProvider,
  AuthService,
  AuthSessionListener,
  SignInCredentials,
} from '../types/Auth'

export function createAuthService(provider: AuthProvider | null = null): AuthService {
  function requireProvider(): AuthProvider {
    if (!provider) throw new AuthServiceError('not_configured')
    return provider
  }

  return {
    isConfigured: provider !== null,
    async getSession() {
      return requireProvider().getSession()
    },
    async signIn(credentials: SignInCredentials) {
      return requireProvider().signIn(credentials)
    },
    async signOut() {
      await requireProvider().signOut()
    },
    subscribe(listener: AuthSessionListener) {
      return requireProvider().subscribe(listener)
    },
  }
}

export const authService = createAuthService(supabase ? createSupabaseAuthProvider(supabase) : null)
