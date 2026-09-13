import { onTestFinished, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createAuthState } from '../src/composables/useAuth'
import { installAuthGuard } from '../src/router/authGuard'
import { getSafeAdminRedirect } from '../src/router/authRedirect'
import { authServiceFixture, deferred, session, testRouter } from './helpers'
import type { AuthSession } from '../src/types/Auth'

function fixture() {
  const provider = authServiceFixture()
  const auth = createAuthState(provider.service)
  const router = testRouter()
  const cleanup = installAuthGuard(router, auth)
  onTestFinished(() => {
    cleanup()
    auth.dispose()
  })
  return { ...provider, auth, router }
}

describe('Admin route guard', () => {
  it('allows public pages without initializing auth', async () => {
    const { router, service } = fixture()
    await router.push('/')
    expect(service.getSession).not.toHaveBeenCalled()
  })
  it('waits for restore, then sends an anonymous user to login with the return path', async () => {
    const { router, service } = fixture()
    const pending = deferred<AuthSession | null>()
    service.getSession.mockReturnValue(pending.promise)
    const navigation = router.push('/admin/projects?sort=new#top')
    await flushPromises()
    expect(router.currentRoute.value.name).not.toBe('admin-projects')
    pending.resolve(null)
    await navigation
    expect(router.currentRoute.value.name).toBe('admin-login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin/projects?sort=new#top')
  })
  it('returns an authenticated user to a permitted admin page', async () => {
    const { router, service } = fixture()
    service.getSession.mockResolvedValue(session)
    await router.push('/admin/login?redirect=%2Fadmin%2Fprojects')
    expect(router.currentRoute.value.name).toBe('admin-projects')
  })
  it('redirects when the current admin session ends', async () => {
    const { router, service, emit } = fixture()
    service.getSession.mockResolvedValue(session)
    await router.push('/admin/projects')
    emit(null)
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('admin-login')
  })
  it('rechecks the session after another navigation guard', async () => {
    const { router, service, emit } = fixture()
    service.getSession.mockResolvedValue(session)
    router.beforeEach((to) => {
      if (to.name === 'admin-projects') emit(null)
    })
    await router.push('/admin/projects')
    expect(router.currentRoute.value.name).toBe('admin-login')
  })
  it('fails closed on initialization errors without a redirect loop', async () => {
    const { router, service } = fixture()
    service.getSession.mockRejectedValue(new Error('offline'))
    await router.push('/admin/projects')
    expect(router.currentRoute.value.name).toBe('admin-login')
  })
  it.each([
    'https://evil.test',
    '//evil.test',
    '/admin/login',
    '/admin/../',
    '/admin/%2e%2e',
    '/admin\\projects',
    '/admin/projects\n',
    ['/admin/projects'],
    null,
  ])('rejects an unsafe return address: %j', (target) => {
    expect(getSafeAdminRedirect(testRouter(), target)).toBe('/admin')
  })
})
