import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { useProjectForm } from '../src/composables/useProjectForm'
import DesignGalleryEditor from '../src/components/admin/projects/DesignGalleryEditor.vue'
import { galleryFileKey } from '../src/validation/galleryLayout'
import { validateProjectForm } from '../src/validation/projectForm'
import { inScope, projectInput } from './helpers'
import { createRemoteProjectWriter } from '../src/services/supabaseProjectWriter'

const main = { kind: 'main' as const, objectPath: 'old/main.jpg', url: '/main.jpg', position: 0 }
const old = {
  kind: 'gallery' as const,
  objectPath: 'old/drawing.jpg',
  url: '/drawing.jpg',
  position: 0,
  title: 'Alternatif A',
  description: 'Üstten görünüş',
}
const categories = [{ id: 1, name: 'Pergola', slug: 'pergola' }]

describe('Design gallery management', () => {
  it('edits text, reorders mixed old/new images and tracks unsaved changes', async () => {
    const { value: state } = inScope(useProjectForm)
    const file = projectInput().imageFile
    state.form.retainedMedia = [main, old]
    state.form.galleryFiles = [file]
    state.markSaved()
    expect(state.isDirty.value).toBe(false)
    const wrapper = mount(DesignGalleryEditor, { props: { form: state.form } })
    await wrapper.get('#design-title-1').setValue('Alternatif B')
    expect(state.isDirty.value).toBe(true)
    await wrapper.get('[aria-label="2. tasarımı yukarı taşı"]').trigger('click')
    expect(state.form.galleryLayout?.map((entry) => entry.title)).toEqual([
      'Alternatif B',
      'Alternatif A',
    ])
    await wrapper.findAll('.design-actions button')[2]!.trigger('click')
    expect(state.form.galleryFiles).toHaveLength(0)
    expect(state.form.galleryLayout?.map((entry) => entry.key)).toEqual([old.objectPath])
    await nextTick()
    expect(wrapper.get('#design-description-0').element).toHaveProperty('value', 'Üstten görünüş')
  })
  it('rejects missing, duplicated or overlong layout entries', () => {
    const input = { ...projectInput(), retainedMedia: [old], galleryLayout: [] }
    expect(validateProjectForm(input, categories).galleryFiles).toBeTruthy()
    for (const galleryLayout of [
      [{ key: old.objectPath, title: 'x'.repeat(121), description: '' }],
      [{ key: old.objectPath, title: '', description: 'x'.repeat(1001) }],
      [{ key: 'wrong', title: '', description: '' }],
    ])
      expect(validateProjectForm({ ...input, galleryLayout }, categories).galleryFiles).toBeTruthy()
  })
  it('writes the chosen order and metadata without re-uploading retained drawings', async () => {
    const file = projectInput().imageFile
    const upload = vi.fn().mockResolvedValue(undefined)
    const update = vi.fn().mockResolvedValue(undefined)
    const writer = createRemoteProjectWriter({
      listCategories: async () => categories,
      getUserId: async () => 'user',
      upload,
      update,
      create: vi.fn(),
      remove: vi.fn(),
      findByRequest: vi.fn().mockResolvedValue({ id: 1 }),
    })
    await writer.update({
      ...projectInput(),
      id: 1,
      version: 1,
      imageFile: null,
      retainedMedia: [main, old],
      galleryFiles: [file],
      galleryLayout: [
        { key: galleryFileKey(file), title: ' B ', description: ' Yeni ' },
        { key: old.objectPath, title: 'A', description: 'Eski' },
      ],
    })
    expect(upload).toHaveBeenCalledOnce()
    expect(update.mock.calls[0]![4]).toEqual([
      { kind: 'main', position: 0, object_path: main.objectPath },
      {
        kind: 'gallery',
        position: 0,
        object_path: expect.stringContaining('/gallery-0.jpg'),
        title: 'B',
        description: 'Yeni',
      },
      {
        kind: 'gallery',
        position: 1,
        object_path: old.objectPath,
        title: 'A',
        description: 'Eski',
      },
    ])
  })
})
