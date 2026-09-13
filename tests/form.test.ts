import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { useProjectForm } from '../src/composables/useProjectForm'
import { useProjectSubmission } from '../src/composables/useProjectSubmission'
import { createProjectWriteService, ProjectWriteError } from '../src/services/projectWriteService'
import { listProjects } from '../src/services/projectService'
import {
  createProjectSlug,
  toCreateProjectInput,
  validateMediaFile,
  validateProjectForm,
} from '../src/validation/projectForm'
import { deferred, inScope, projectInput } from './helpers'
import type { Project } from '../src/types/Project'

const categories = [{ id: 1, name: 'Pergola', slug: 'pergola' }]
function selection(files: File[]) {
  const input = document.createElement('input')
  input.type = 'file'
  Object.defineProperty(input, 'files', { value: files })
  const event = new Event('change')
  Object.defineProperty(event, 'target', { value: input })
  return event
}

describe('Project form', () => {
  it('creates a stable Turkish slug and copies trimmed values into the write contract', () => {
    expect(createProjectSlug('  IŞIK, Çığ ve Özel Ürün! ')).toBe('isik-cig-ve-ozel-urun')
    const form = projectInput()
    form.title = '  Cam Balkon  '
    form.location = '  İstanbul  '
    const input = toCreateProjectInput(form, categories)
    expect(input.title).toBe('Cam Balkon')
    expect(input.location).toBe('İstanbul')
    expect(input.galleryFiles).not.toBe(form.galleryFiles)
    expect(validateProjectForm(input, categories)).toEqual({})
  })
  it('rejects missing required fields, unknown categories and fractional years', () => {
    const form = {
      ...projectInput(),
      title: ' ',
      slug: '',
      categoryIds: [999],
      year: 2026.5,
      imageFile: null,
    }
    expect(validateProjectForm(form, categories)).toMatchObject({
      title: expect.any(String),
      slug: expect.any(String),
      categoryIds: expect.any(String),
      year: expect.any(String),
      imageFile: expect.any(String),
    })
    expect(() => toCreateProjectInput(form, categories)).toThrow()
  })
  it.each([
    new File(['x'], 'script.svg', { type: 'image/svg+xml' }),
    new File(['x'], 'cover.exe', { type: 'image/jpeg' }),
    new File([], 'empty.jpg', { type: 'image/jpeg' }),
  ])('rejects invalid image metadata: $name', (file) => {
    expect(validateMediaFile(file, 'image')).toEqual(expect.any(String))
  })
  it('enforces individual and total media size limits', () => {
    const form = projectInput()
    Object.defineProperty(form.imageFile, 'size', { value: 10 * 1024 * 1024 + 1 })
    expect(validateMediaFile(form.imageFile, 'image')).toBeTruthy()
    const large = new File(['x'], 'video.mp4', { type: 'video/mp4' })
    Object.defineProperty(large, 'size', { value: 100 * 1024 * 1024 })
    const image = new File(['x'], 'cover.jpg', { type: 'image/jpeg' })
    Object.defineProperty(image, 'size', { value: 10 * 1024 * 1024 })
    form.imageFile = image
    form.videoFile = large
    form.galleryFiles = Array.from({ length: 5 }, () => image)
    expect(validateProjectForm(form, categories).imageFile).toContain('150 MB')
  })
  it('preserves the previous valid file on rejection and releases preview URLs', async () => {
    const { value: state, stop } = inScope(useProjectForm)
    const image = projectInput().imageFile
    await state.handleMainImage(selection([image]))
    await nextTick()
    const url = state.mainImagePreview.value
    expect(url).toContain('blob:test-')
    await state.handleMainImage(selection([new File(['x'], 'bad.svg', { type: 'image/svg+xml' })]))
    expect(state.form.imageFile).toBe(image)
    expect(state.errors.imageFile).toBeTruthy()
    state.removeMedia('imageFile')
    await nextTick()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url)
    await state.handleMainImage(selection([image]))
    await nextTick()
    const second = state.mainImagePreview.value
    stop()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(second)
  })
  it('deduplicates gallery selections, rejects overflow and tracks saved state', async () => {
    const { value: state } = inScope(useProjectForm)
    const files = Array.from(
      { length: 12 },
      (_, i) => new File(['x'], `${i}.jpg`, { type: 'image/jpeg' }),
    )
    await state.handleGalleryImages(selection(files))
    await state.handleGalleryImages(selection(files))
    expect(state.form.galleryFiles).toHaveLength(12)
    state.markSaved()
    expect(state.isDirty.value).toBe(false)
    await state.handleGalleryImages(selection([projectInput().imageFile]))
    expect(state.form.galleryFiles).toHaveLength(12)
    expect(state.errors.galleryFiles).toBeTruthy()
    state.removeMedia('galleryFiles', 0)
    expect(state.isDirty.value).toBe(true)
    state.form.title = 'İç Mekan'
    expect(state.form.slug).toBe('ic-mekan')
  })
})

describe('Project submission', () => {
  it('reports no persistence when the writer is not configured', async () => {
    const { value: state } = inScope(() =>
      useProjectSubmission(createProjectWriteService(), vi.fn().mockResolvedValue(null)),
    )
    expect(await state.submit(projectInput())).toBeNull()
    expect(state.message.value).toContain('proje kaydedilmedi')
    expect(state.canSave).toBe(false)
  })
  it('blocks duplicate slugs before calling the writer', async () => {
    const project = (await listProjects())[0]!
    const create = vi.fn().mockResolvedValue(project)
    const { value: state } = inScope(() =>
      useProjectSubmission(
        createProjectWriteService({ create }),
        vi.fn().mockResolvedValue(project),
      ),
    )
    expect(await state.submit(projectInput())).toBeNull()
    expect(state.slugError.value).toBeTruthy()
    expect(create).not.toHaveBeenCalled()
  })
  it('returns the actual writer result and prevents double submission', async () => {
    const project = (await listProjects())[0]!
    const pending = deferred<Project>()
    const create = vi.fn().mockReturnValue(pending.promise)
    const { value: state } = inScope(() =>
      useProjectSubmission(createProjectWriteService({ create }), vi.fn().mockResolvedValue(null)),
    )
    const first = state.submit(projectInput())
    await flushPromises()
    expect(await state.submit(projectInput())).toBeNull()
    pending.resolve(project)
    expect(await first).toBe(project)
    expect(create).toHaveBeenCalledTimes(1)
    expect(state.isSubmitting.value).toBe(false)
  })
  it('maps a server-side slug collision into a field error', async () => {
    const create = vi.fn().mockRejectedValue(new ProjectWriteError('duplicate_slug'))
    const { value: state } = inScope(() =>
      useProjectSubmission(createProjectWriteService({ create }), vi.fn().mockResolvedValue(null)),
    )
    expect(await state.submit(projectInput())).toBeNull()
    expect(state.slugError.value).toBeTruthy()
    expect(state.isSubmitting.value).toBe(false)
  })
  it('does not start a write when the scope closes during the lookup', async () => {
    const pending = deferred<Project | null>()
    const create = vi.fn()
    const { value: state, stop } = inScope(() =>
      useProjectSubmission(createProjectWriteService({ create }), () => pending.promise),
    )
    const result = state.submit(projectInput())
    stop()
    pending.resolve(null)
    expect(await result).toBeNull()
    expect(create).not.toHaveBeenCalled()
  })
})
