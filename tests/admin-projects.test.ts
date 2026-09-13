import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ProjectsAdminView from '../src/views/admin/ProjectsAdminView.vue'
import { listProjects } from '../src/services/projectService'
import { deleteProject } from '../src/services/projectManagementService'
import { exampleCatalog } from '../src/services/catalog/exampleCatalog'
import { ProjectWriteError } from '../src/services/projectWriteErrors'
vi.mock('../src/services/projectService', () => ({ listProjects: vi.fn() }))
vi.mock('../src/services/projectManagementService', () => ({ deleteProject: vi.fn() }))
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    },
  })
})
async function fixture() {
  const rows = await exampleCatalog.listProjects()
  const categories = await exampleCatalog.listCategories()
  rows[0]!.categoryIds = [1, 6]
  rows[0]!.categories = [categories[0]!, categories[5]!]
  vi.mocked(listProjects).mockResolvedValue(rows)
  vi.mocked(deleteProject).mockResolvedValue({ cleanupPending: false })
  const component = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/projeler', name: 'admin-projects', component },
      { path: '/admin/projeler/yeni', name: 'admin-project-new', component },
      { path: '/admin/projeler/:id/duzenle', name: 'admin-project-edit', component },
      { path: '/projeler/:slug', name: 'project-detail', component },
      { path: '/admin/medya', name: 'admin-media', component },
    ],
  })
  await router.push('/admin/projeler')
  const wrapper = mount(ProjectsAdminView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, rows, router }
}
describe('Admin project management', () => {
  it('shows multiple categories and a real edit link for the project', async () => {
    const { wrapper, rows } = await fixture()
    const first = wrapper.findAll('tbody tr').find((row) => row.text().includes(rows[0]!.title))!
    expect(first.text()).toContain('Bioclimatic')
    expect(first.text()).toContain('Cam Balkon')
    expect(
      first
        .findAll('a')
        .some((link) => link.attributes('href') === `/admin/projeler/${rows[0]!.id}/duzenle`),
    ).toBe(true)
  })
  it('filters by a secondary category and searches project titles', async () => {
    const { wrapper } = await fixture()
    await wrapper.findAll('select')[0]!.setValue('6')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    await wrapper.get('input[type=search]').setValue('Villa')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
  })
  it('does not delete until confirmation and supports canceling', async () => {
    const { wrapper } = await fixture()
    await wrapper.get('tbody .danger-text').trigger('click')
    expect(wrapper.get('dialog').attributes('open')).toBeDefined()
    expect(deleteProject).not.toHaveBeenCalled()
    await wrapper.get('dialog .secondary').trigger('click')
    expect(deleteProject).not.toHaveBeenCalled()
    expect(wrapper.get('dialog').attributes('open')).toBeUndefined()
  })
  it('deletes the selected version and removes the row after success', async () => {
    const { wrapper, rows } = await fixture()
    await wrapper.get('tbody .danger-text').trigger('click')
    await wrapper.get('dialog .danger').trigger('click')
    await flushPromises()
    expect(deleteProject).toHaveBeenCalledWith(rows[2]!.id, rows[2]!.version)
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.get('[role=status]').text()).toContain('silindi')
  })
  it('preserves rows and explains a version conflict', async () => {
    const { wrapper } = await fixture()
    vi.mocked(deleteProject).mockRejectedValue(new ProjectWriteError('conflict'))
    await wrapper.get('tbody .danger-text').trigger('click')
    await wrapper.get('dialog .danger').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
    expect(wrapper.get('[role=alert]').text()).toContain('güncellendi')
  })
})
