import {
  isAuthError,
  isAuthRetryableFetchError,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js'
import type { AuthProvider, AuthSession } from '../types/Auth'
import { AuthServiceError } from './authErrors'

function toSession(user: User): AuthSession {
  return { user: { id: user.id, email: user.email ?? null } }
}

export function mapSupabaseAuthError(error: unknown): AuthServiceError {
  if (isAuthError(error)) {
    if (error.code === 'invalid_credentials') return new AuthServiceError('invalid_credentials')
    if (error.code === 'email_not_confirmed') return new AuthServiceError('email_not_confirmed')
    if (error.status === 429) return new AuthServiceError('rate_limited')
    if (isAuthRetryableFetchError(error) || (error.status ?? 0) >= 500) {
      return new AuthServiceError('network_error')
    }
  }
  return new AuthServiceError('unknown')
}

export function createSupabaseAuthProvider(client: SupabaseClient): AuthProvider {
  return {
    async getSession() {
      const { data, error } = await client.auth.getSession()
      if (error) throw mapSupabaseAuthError(error)
      if (!data.session) return null

      // Confirm the restored user with Auth rather than trusting stored user metadata.
      const result = await client.auth.getUser(data.session.access_token)
      if (result.error) {
        if (result.error.status === 401 || result.error.status === 403) return null
        throw mapSupabaseAuthError(result.error)
      }
      return result.data.user ? toSession(result.data.user) : null
    },
    async signIn(credentials) {
      const { data, error } = await client.auth.signInWithPassword(credentials)
      if (error) throw mapSupabaseAuthError(error)
      if (!data.session || !data.user) throw new AuthServiceError('unknown')
      return toSession(data.user)
    },
    async signOut() {
      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error) throw mapSupabaseAuthError(error)
    },
    subscribe(listener) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        // Initial restoration is verified by getSession; avoid overriding that read.
        if (event === 'INITIAL_SESSION') return
        listener(session ? toSession(session.user) : null)
      })
      return () => data.subscription.unsubscribe()
    },
  }
}
