import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MediaProgressStatus from '../src/components/admin/projects/MediaProgressStatus.vue'
import { useProjectSubmission } from '../src/composables/useProjectSubmission'
import { createProjectWriteService } from '../src/services/projectWriteService'
import { deferred, inScope, projectInput } from './helpers'
import type { ReportMediaProgress } from '../src/types/MediaProgress'
import type { Project } from '../src/types/Project'

describe('Media progress feedback', () => {
  it('shows accessible file counts and changes to the save phase without claiming completion', async () => {
    const wrapper = mount(MediaProgressStatus, {
      props: { progress: { stage: 'uploading', completed: 1, total: 3, filename: 'tasarım.png' } },
    })
    expect(wrapper.get('[role="status"]').text()).toContain('1 / 3 dosya tamamlandı')
    expect(wrapper.get('progress').attributes('value')).toBe('1')
    await wrapper.setProps({ progress: { stage: 'saving', completed: 3, total: 3 } })
    expect(wrapper.text()).toContain('Proje kaydediliyor')
    expect(wrapper.find('progress').exists()).toBe(false)
  })
  it('clears the indicator on errors and ignores late progress after disposal', async () => {
    const pending = deferred<Project>()
    let report: ReportMediaProgress = () => {}
    const { value: state, stop } = inScope(() =>
      useProjectSubmission(
        createProjectWriteService({
          create: (_input, callback) => {
            report = callback!
            return pending.promise
          },
        }),
        vi.fn().mockResolvedValue(null),
      ),
    )
    const task = state.submit(projectInput())
    await flushPromises()
    report({ stage: 'uploading', completed: 0, total: 1 })
    expect(state.uploadProgress.value?.stage).toBe('uploading')
    pending.reject(new Error('offline'))
    await task
    expect(state.uploadProgress.value).toBeNull()
    expect(state.isSubmitting.value).toBe(false)
    stop()
    report({ stage: 'saving', completed: 1, total: 1 })
    expect(state.uploadProgress.value).toBeNull()
  })
})
