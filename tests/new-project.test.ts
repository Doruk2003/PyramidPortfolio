import { onTestFinished, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import NewProjectView from '../src/views/admin/NewProjectView.vue'
import { createAuthState, useAuth } from '../src/composables/useAuth'
import { authServiceFixture, projectInput, session } from './helpers'

vi.mock('../src/composables/useAuth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/composables/useAuth')>()),
  useAuth: vi.fn(),
}))

async function fixture() {
  const provider = authServiceFixture()
  provider.service.getSession.mockResolvedValue(session)
  const auth = createAuthState(provider.service)
  await auth.initialize()
  vi.mocked(useAuth).mockReturnValue(auth)
  onTestFinished(() => auth.dispose())
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/projeler/yeni', component: NewProjectView },
      {
        path: '/admin/projeler',
        name: 'admin-projects',
        component: { template: '<p>Projeler</p>' },
      },
    ],
  })
  await router.push('/admin/projeler/yeni')
  const wrapper = mount(RouterView, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return { ...provider, wrapper, router }
}

describe('New project view', () => {
  it('shows validation errors and focuses the first invalid field', async () => {
    const { wrapper } = await fixture()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('#title').attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('#main-image').attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(wrapper.get('#title').element)
  })
  it('validates a complete form without claiming persistence or leaving the page', async () => {
    const { wrapper, router } = await fixture()
    await wrapper.get('#title').setValue('Test Pergola Projesi')
    await wrapper.get('input[name=category][value="1"]').setValue(true)
    const fileInput = wrapper.get<HTMLInputElement>('#main-image')
    Object.defineProperty(fileInput.element, 'files', { value: [projectInput().imageFile] })
    await fileInput.trigger('change')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('proje kaydedilmedi')
    expect(wrapper.get<HTMLInputElement>('#title').element.value).toBe('Test Pergola Projesi')
    expect(router.currentRoute.value.path).toBe('/admin/projeler/yeni')
    expect(wrapper.get('.save-button').text()).toBe('Formu Kontrol Et')
  })
  it('allows canceling a dirty navigation and bypasses the prompt on session loss', async () => {
    const { wrapper, router, emit } = await fixture()
    await wrapper.get('#title').setValue('Kaydedilmedi')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await router.push('/admin/projeler')
    expect(confirm).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.path).toBe('/admin/projeler/yeni')
    emit(null)
    await router.push('/admin/projeler')
    expect(confirm).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.name).toBe('admin-projects')
  })
  it('warns before unloading a dirty form and removes the listener on unmount', async () => {
    const { wrapper } = await fixture()
    await wrapper.get('#title').setValue('Kaydedilmedi')
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    wrapper.unmount()
    const later = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(later)
    expect(later.defaultPrevented).toBe(false)
  })
})
