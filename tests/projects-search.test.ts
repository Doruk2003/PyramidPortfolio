import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ProjectsView from '../src/views/ProjectsView.vue'
import * as projectService from '../src/services/projectService'

async function fixture(url = '/projeler') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/projeler', component: ProjectsView },
      { path: '/projeler/:slug', component: { template: '<div />' } },
    ],
  })
  await router.push(url)
  await router.isReady()
  const wrapper = mount(ProjectsView, { global: { plugins: [router] } })
  await flushPromises()
  const titles = () => wrapper.findAll('.project-card h3').map((item) => item.text())
  async function search(value: string) {
    await wrapper.get('#project-search').setValue(value)
    await wrapper.get('form[role="search"]').trigger('submit')
    await flushPromises()
  }
  async function category(name: string) {
    const button = wrapper
      .findAll('.category-sidebar-item')
      .find((item) => item.text().includes(name))!
    await button.trigger('click')
    await flushPromises()
  }
  return { wrapper, router, titles, search, category }
}

describe('Public project search and URL filters', () => {
  it('restores a shared query and category on initial load', async () => {
    const { wrapper, titles } = await fixture('/projeler?q=CAM&category=6')
    expect(titles()).toEqual(['Residence Cam Balkon'])
    expect((wrapper.get('#project-search').element as HTMLInputElement).value).toBe('CAM')
    expect(wrapper.get('.projects-results [role="status"]').text()).toContain('1 proje bulundu')
    expect(wrapper.get('.category-sidebar-item[aria-pressed="true"]').text()).toContain(
      'Cam Balkon',
    )
  })

  it('combines a submitted search with category selection and clears both', async () => {
    const { wrapper, router, titles, search, category } = await fixture(
      '/projeler?source=portfolio#list',
    )
    await search('  cam  ')
    expect(titles()).toHaveLength(2)
    expect(router.currentRoute.value.query.q).toBe('cam')
    await category('Cam Balkon')
    expect(titles()).toEqual(['Residence Cam Balkon'])
    await search('pergola')
    expect(titles()).toEqual([])
    expect(wrapper.get('.projects-empty').text()).toContain('Aramanıza uygun proje bulunamadı')
    await wrapper.get('.projects-results button').trigger('click')
    await flushPromises()
    expect(titles()).toHaveLength(3)
    expect(router.currentRoute.value.query).toEqual({ source: 'portfolio' })
    expect(router.currentRoute.value.hash).toBe('#list')
    expect((wrapper.get('#project-search').element as HTMLInputElement).value).toBe('')
  })

  it('restores the search, category and input with back and forward navigation', async () => {
    const { router, wrapper, titles, search, category } = await fixture()
    await search('cam')
    await category('Cam Balkon')
    router.back()
    await flushPromises()
    expect(titles()).toHaveLength(2)
    expect(router.currentRoute.value.query.category).toBeUndefined()
    router.back()
    await flushPromises()
    expect(titles()).toHaveLength(3)
    expect((wrapper.get('#project-search').element as HTMLInputElement).value).toBe('')
    router.forward()
    await flushPromises()
    expect(titles()).toHaveLength(2)
    expect((wrapper.get('#project-search').element as HTMLInputElement).value).toBe('cam')
  })

  it('handles Turkish dotted/dotless I and canonically equivalent characters', async () => {
    const projects = await projectService.listProjects()
    projects[0]!.title = 'IŞIK İÇİN GÖLGELENDİRME'
    vi.spyOn(projectService, 'listProjects').mockResolvedValue(projects)
    const { titles, search } = await fixture()
    await search('ışık için')
    expect(titles()).toEqual(['IŞIK İÇİN GÖLGELENDİRME'])
    await search('gölgelendirme'.normalize('NFD'))
    expect(titles()).toEqual(['IŞIK İÇİN GÖLGELENDİRME'])
    await search('   ')
    expect(titles()).toHaveLength(3)
  })

  it.each([
    'category=999',
    'category=-1',
    'category=1.5',
    'category=1&category=6',
    'q=cam&q=pergola',
  ])('safely ignores invalid or repeated query parameters: %s', async (query) => {
    const { titles } = await fixture(`/projeler?${query}`)
    expect(titles()).toHaveLength(3)
  })

  it('shows the catalog empty state independently of search results', async () => {
    vi.spyOn(projectService, 'listProjects').mockResolvedValue([])
    const { wrapper } = await fixture('/projeler?q=cam')
    expect(wrapper.text()).toContain('Henüz yayımlanmış proje bulunmuyor')
    expect(wrapper.find('form[role="search"]').exists()).toBe(false)
  })
})
