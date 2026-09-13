import { describe, expect, it, vi } from 'vitest'
import {
  AuthApiError,
  type AuthChangeEvent,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js'
import {
  createSupabaseAuthProvider,
  mapSupabaseAuthError,
} from '../src/services/supabaseAuthProvider'

function fixture() {
  const user = { id: 'admin', email: 'admin@example.test', user_metadata: { ignored: true } }
  const stored = { access_token: 'test-token', user }
  let callback: (event: AuthChangeEvent, session: Session | null) => void = () => {}
  const unsubscribe = vi.fn()
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: stored }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session: stored, user }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn((listener: typeof callback) => {
      callback = listener
      return { data: { subscription: { unsubscribe } } }
    }),
  }
  // Only the SDK boundary is replaced; the production adapter is exercised unchanged.
  const provider = createSupabaseAuthProvider({ auth } as unknown as SupabaseClient)
  return {
    auth,
    provider,
    unsubscribe,
    user,
    stored,
    emit: (event: AuthChangeEvent, value: typeof stored | null) =>
      callback(event, value as Session | null),
  }
}

describe('Supabase auth adapter', () => {
  it('verifies restored sessions with Auth and exposes only UI user fields', async () => {
    const { provider, auth, user } = fixture()
    expect(await provider.getSession()).toEqual({ user: { id: user.id, email: user.email } })
    expect(auth.getUser).toHaveBeenCalledWith('test-token')
  })
  it('does not verify a missing stored session', async () => {
    const { provider, auth } = fixture()
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    expect(await provider.getSession()).toBeNull()
    expect(auth.getUser).not.toHaveBeenCalled()
  })
  it.each([401, 403])('treats a rejected restored user (%i) as signed out', async (status) => {
    const { provider, auth } = fixture()
    auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthApiError('rejected', status, undefined),
    })
    expect(await provider.getSession()).toBeNull()
  })
  it('does not treat a verification outage as a valid session', async () => {
    const { provider, auth } = fixture()
    auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthApiError('offline', 503, undefined),
    })
    await expect(provider.getSession()).rejects.toMatchObject({ code: 'network_error' })
  })
  it('forwards credentials and limits logout to the current session', async () => {
    const { provider, auth } = fixture()
    const credentials = { email: 'admin@example.test', password: 'test-password' }
    await provider.signIn(credentials)
    expect(auth.signInWithPassword).toHaveBeenCalledWith(credentials)
    await provider.signOut()
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
  it('ignores unverified initial events and unsubscribes', () => {
    const { provider, emit, stored, unsubscribe } = fixture()
    const listener = vi.fn()
    const stop = provider.subscribe(listener)
    emit('INITIAL_SESSION', stored)
    expect(listener).not.toHaveBeenCalled()
    emit('SIGNED_IN', stored)
    expect(listener).toHaveBeenLastCalledWith({
      user: { id: 'admin', email: 'admin@example.test' },
    })
    emit('SIGNED_OUT', null)
    expect(listener).toHaveBeenLastCalledWith(null)
    stop()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
  it.each([
    [new AuthApiError('private details', 400, 'invalid_credentials'), 'invalid_credentials'],
    [new AuthApiError('private details', 400, 'email_not_confirmed'), 'email_not_confirmed'],
    [new AuthApiError('private details', 429, undefined), 'rate_limited'],
    [new Error('private details'), 'unknown'],
  ])('maps provider errors without exposing raw messages', (error, code) => {
    expect(mapSupabaseAuthError(error)).toMatchObject({ code, message: code })
  })
})
