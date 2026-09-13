import { onTestFinished, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AdminLoginView from '../src/views/auth/AdminLoginView.vue'
import { createAuthState, useAuth } from '../src/composables/useAuth'
import { AuthServiceError } from '../src/services/authService'
import { authServiceFixture, deferred, session, testRouter } from './helpers'
import type { AuthSession } from '../src/types/Auth'

vi.mock('../src/composables/useAuth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/composables/useAuth')>()),
  useAuth: vi.fn(),
}))

async function fixture(configured = true) {
  const provider = authServiceFixture()
  const auth = createAuthState({ ...provider.service, isConfigured: configured })
  vi.mocked(useAuth).mockReturnValue(auth)
  onTestFinished(() => auth.dispose())
  const router = testRouter()
  await router.push('/admin/login?redirect=%2Fadmin%2Fprojects')
  const wrapper = mount(AdminLoginView, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return { ...provider, auth, router, wrapper }
}

beforeEach(() => vi.mocked(useAuth).mockReset())

describe('Login view', () => {
  it('disables login when Supabase is unavailable', async () => {
    const { wrapper, service } = await fixture(false)
    expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    expect(service.signIn).not.toHaveBeenCalled()
  })
  it('shows accessible field errors and focuses the first invalid field', async () => {
    const { wrapper, service } = await fixture()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('#login-email').attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('#login-password').attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(wrapper.get('#login-email').element)
    expect(service.signIn).not.toHaveBeenCalled()
  })
  it('trims email, preserves password bytes and navigates after success', async () => {
    const { wrapper, service, router } = await fixture()
    await wrapper.get('#login-email').setValue('  admin@example.test  ')
    await wrapper.get('#login-password').setValue(' password with spaces ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(service.signIn).toHaveBeenCalledWith({
      email: 'admin@example.test',
      password: ' password with spaces ',
    })
    expect(router.currentRoute.value.path).toBe('/admin/projects')
  })
  it('clears the password and shows a safe error after rejected credentials', async () => {
    const { wrapper, service, router } = await fixture()
    service.signIn.mockRejectedValue(new AuthServiceError('invalid_credentials'))
    await wrapper.get('#login-email').setValue('admin@example.test')
    await wrapper.get('#login-password').setValue('incorrect')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('#login-password').element.value).toBe('')
    expect(wrapper.get('.login-message').text()).not.toBe('')
    expect(router.currentRoute.value.name).toBe('admin-login')
  })
  it('does not navigate after the view is unmounted during login', async () => {
    const { wrapper, service, router } = await fixture()
    const pending = deferred<AuthSession>()
    service.signIn.mockReturnValue(pending.promise)
    await wrapper.get('#login-email').setValue('admin@example.test')
    await wrapper.get('#login-password').setValue('password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const replace = vi.spyOn(router, 'replace')
    wrapper.unmount()
    pending.resolve(session)
    await flushPromises()
    expect(replace).not.toHaveBeenCalled()
  })
})
