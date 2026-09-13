import { onTestFinished, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { supabase } from '../src/lib/supabase'
import { createAuthState } from '../src/composables/useAuth'
import { createAuthService, AuthServiceError } from '../src/services/authService'
import { authServiceFixture, deferred, session } from './helpers'
import type { AuthSession } from '../src/types/Auth'

function fixture() {
  const provider = authServiceFixture()
  const auth = createAuthState(provider.service)
  onTestFinished(() => auth.dispose())
  return { ...provider, auth }
}

describe('Auth state', () => {
  it('never creates a real Supabase client in the test environment', () => {
    expect(supabase).toBeNull()
  })

  it('does not grant access without a provider', async () => {
    const auth = createAuthState(createAuthService())
    await auth.initialize()
    expect(auth.status.value).toBe('unavailable')
    await expect(auth.signIn({ email: 'a@b.test', password: 'test' })).rejects.toMatchObject({
      code: 'not_configured',
    })
    expect(auth.isAuthenticated.value).toBe(false)
    auth.dispose()
  })

  it('coalesces initialization and ignores a stale restore after sign-out', async () => {
    const { auth, service, emit } = fixture()
    const pending = deferred<AuthSession | null>()
    service.getSession.mockReturnValue(pending.promise)
    const first = auth.initialize()
    expect(auth.initialize()).toBe(first)
    await flushPromises()
    emit(null)
    pending.resolve(session)
    await first
    expect(service.subscribe).toHaveBeenCalledTimes(1)
    expect(service.getSession).toHaveBeenCalledTimes(1)
    expect(auth.isAuthenticated.value).toBe(false)
  })

  it('retries initialization and removes the failed subscription', async () => {
    const { auth, service, unsubscribe } = fixture()
    service.getSession.mockRejectedValueOnce(new AuthServiceError('network_error'))
    await auth.initialize()
    expect(auth.status.value).toBe('error')
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    service.getSession.mockResolvedValue(session)
    await auth.initialize()
    expect(auth.user.value).toEqual(session.user)
  })

  it('preserves the session when logout fails and clears it on success', async () => {
    const { auth, service } = fixture()
    service.getSession.mockResolvedValue(session)
    await auth.initialize()
    service.signOut.mockRejectedValueOnce(new AuthServiceError('network_error'))
    await expect(auth.signOut()).rejects.toMatchObject({ code: 'network_error' })
    expect(auth.isAuthenticated.value).toBe(true)
    await auth.signOut()
    expect(auth.session.value).toBeNull()
  })

  it('blocks concurrent operations and does not restore a session after a newer sign-out', async () => {
    const { auth, service, emit } = fixture()
    const pending = deferred<AuthSession>()
    service.signIn.mockReturnValue(pending.promise)
    await auth.initialize()
    const login = auth.signIn({ email: 'a@b.test', password: 'test' })
    await flushPromises()
    await expect(auth.signOut()).rejects.toMatchObject({ code: 'busy' })
    emit(null)
    pending.resolve(session)
    await login
    expect(auth.isAuthenticated.value).toBe(false)
    expect(service.signIn).toHaveBeenCalledTimes(1)
  })

  it('ignores callbacks after disposal and rejects further operations', async () => {
    const { auth, emit, unsubscribe } = fixture()
    await auth.initialize()
    auth.dispose()
    auth.dispose()
    emit(session)
    expect(auth.session.value).toBeNull()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    await expect(auth.initialize()).rejects.toMatchObject({ code: 'disposed' })
  })
})
