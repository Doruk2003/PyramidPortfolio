import { onTestFinished, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import NewProjectView from '../src/views/admin/NewProjectView.vue'
import { createAuthState, useAuth } from '../src/composables/useAuth'
import { getProjectById, getProjectBySlug } from '../src/services/projectService'
import { projectWriteService } from '../src/services/projectWriteService'
import { authServiceFixture, session } from './helpers'
import { exampleCatalog } from '../src/services/catalog/exampleCatalog'
vi.mock('../src/composables/useAuth', async (original) => ({
  ...(await original<typeof import('../src/composables/useAuth')>()),
  useAuth: vi.fn(),
}))
vi.mock('../src/services/projectService', () => ({
  getProjectById: vi.fn(),
  getProjectBySlug: vi.fn(),
}))
vi.mock('../src/services/projectWriteService', async (original) => ({
  ...(await original<typeof import('../src/services/projectWriteService')>()),
  projectWriteService: { isConfigured: true, create: vi.fn(), update: vi.fn() },
}))
vi.mock('../src/services/projectManagementService', () => ({
  cleanupProjectMedia: vi.fn().mockResolvedValue({ remaining: 0 }),
}))
async function fixture() {
  const project = (await exampleCatalog.listProjects())[0]!
  project.media = [
    { kind: 'main', position: 0, objectPath: 'user/request/main-0.jpg', url: project.image },
  ]
  vi.mocked(getProjectById).mockResolvedValue(project)
  vi.mocked(getProjectBySlug).mockResolvedValue(project)
  vi.mocked(projectWriteService.update).mockResolvedValue(project)
  const provider = authServiceFixture()
  provider.service.getSession.mockResolvedValue(session)
  const auth = createAuthState(provider.service)
  await auth.initialize()
  onTestFinished(() => auth.dispose())
  vi.mocked(useAuth).mockReturnValue(auth)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/admin/projeler/:id/duzenle',
        name: 'admin-project-edit',
        component: NewProjectView,
      },
      { path: '/admin/projeler', name: 'admin-projects', component: { template: '<p>Liste</p>' } },
    ],
  })
  await router.push(`/admin/projeler/${project.id}/duzenle`)
  const wrapper = mount(RouterView, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return { project, wrapper, router }
}
describe('Edit project form', () => {
  it('loads existing fields and keeps the published address when the title changes', async () => {
    const { project, wrapper } = await fixture()
    expect(wrapper.get<HTMLInputElement>('#title').element.value).toBe(project.title)
    await wrapper.get('#title').setValue('Yeni başlık')
    expect(wrapper.get<HTMLInputElement>('#slug').element.value).toBe(project.slug)
    expect(wrapper.get('input[name=category][value="1"]').element).toHaveProperty('checked', true)
  })
  it('saves multiple categories and keeps existing media without another upload selection', async () => {
    const { project, wrapper, router } = await fixture()
    await wrapper.get('input[name=category][value="6"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(projectWriteService.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: project.id,
        version: project.version,
        categoryIds: [1, 6],
        imageFile: null,
        retainedMedia: project.media,
      }),
      expect.any(Function),
    )
    expect(router.currentRoute.value.name).toBe('admin-projects')
    expect(projectWriteService.create).not.toHaveBeenCalled()
  })
  it('rejects removal of the main image without a replacement', async () => {
    const { wrapper } = await fixture()
    const remove = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Ana görseli kaldır')!
    await remove.trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('#main-image').attributes('aria-invalid')).toBe('true')
    expect(projectWriteService.update).not.toHaveBeenCalled()
  })
})
