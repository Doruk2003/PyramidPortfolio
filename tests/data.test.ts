import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useAsyncData } from '../src/composables/useAsyncData'
import { listCategories } from '../src/services/categoryService'
import { getProjectBySlug, listProjects } from '../src/services/projectService'
import { isProjectStatus } from '../src/constants/projectStatuses'
import { deferred, inScope } from './helpers'

describe('Catalog read contracts', () => {
  it('resolves projects against the seven system categories and valid statuses', async () => {
    const categories = await listCategories()
    expect(categories).toHaveLength(7)
    const projects = await listProjects()
    expect(projects.length).toBeGreaterThan(0)
    for (const project of projects) {
      expect(project.categories).toEqual(
        categories.filter((c) => project.categoryIds.includes(c.id)),
      )
      expect(isProjectStatus(project.status)).toBe(true)
      expect(await getProjectBySlug(project.slug)).toEqual(project)
    }
    expect(await getProjectBySlug('does-not-exist')).toBeNull()
  })
  it('isolates nested UI mutations from later reads', async () => {
    const first = (await listProjects())[0]!
    const original = await getProjectBySlug(first.slug)
    first.title = 'changed'
    first.categories[0]!.name = 'changed'
    first.gallery.push('changed')
    first.applicationImages.length = 0
    expect(await getProjectBySlug(first.slug)).toEqual(original)
    const categories = await listCategories()
    const name = categories[0]!.name
    categories[0]!.name = 'changed'
    expect((await listCategories())[0]!.name).toBe(name)
  })
})

describe('Async data lifecycle', () => {
  it('keeps a newer result when an earlier request finishes last', async () => {
    const old = deferred<string>()
    const recent = deferred<string>()
    const loader = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(recent.promise)
    const { value: state } = inScope(() => useAsyncData(loader, ''))
    const reload = state.reload()
    recent.resolve('new')
    await reload
    old.resolve('old')
    await flushPromises()
    expect(state.data.value).toBe('new')
    expect(state.isLoading.value).toBe(false)
  })
  it('recovers after a failed request', async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(['ready'])
    const { value: state } = inScope(() => useAsyncData(loader, []))
    await flushPromises()
    expect(state.hasError.value).toBe(true)
    await state.reload()
    expect(state.hasError.value).toBe(false)
    expect(state.data.value).toEqual(['ready'])
  })
  it('ignores late responses and further reloads after scope disposal', async () => {
    const pending = deferred<string>()
    const loader = vi.fn(() => pending.promise)
    const { value: state, stop } = inScope(() => useAsyncData(loader, 'initial'))
    stop()
    pending.resolve('late')
    await flushPromises()
    await state.reload()
    expect(state.data.value).toBe('initial')
    expect(loader).toHaveBeenCalledTimes(1)
  })
})
