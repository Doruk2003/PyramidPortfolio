import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { youtubeVideoId } from '../src/validation/youtube'
import { toCreateProjectInput, validateProjectForm } from '../src/validation/projectForm'
import ProjectVideo from '../src/components/ui/ProjectVideo.vue'
import { projectInput } from './helpers'
const id = 'Abcdef_12-3'
const categories = [{ id: 1, name: 'Pergola', slug: 'pergola' }]
describe('YouTube videos', () => {
  it.each([
    `https://youtu.be/${id}?t=20`,
    `https://www.youtube.com/watch?v=${id}&list=abc`,
    `https://youtube.com/shorts/${id}`,
    `https://youtube.com/live/${id}`,
  ])('accepts video URL %s', (url) => expect(youtubeVideoId(url)).toBe(id))
  it.each([
    `https://youtube.com.evil.test/watch?v=${id}`,
    `https://youtube.com@evil.test/watch?v=${id}`,
    'javascript:alert(1)',
    'https://youtube.com/playlist?list=abc',
    'https://youtu.be/invalid',
  ])('rejects URL %s', (url) => expect(youtubeVideoId(url)).toBeNull())
  it('does not contact YouTube until clicked and resets when the video changes', async () => {
    const wrapper = mount(ProjectVideo, { props: { youtubeId: id, title: 'Proje' } })
    expect(wrapper.find('iframe').exists()).toBe(false)
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('iframe').attributes('src')).toContain(`youtube-nocookie.com/embed/${id}`)
    await wrapper.setProps({ youtubeId: '12345678901' })
    expect(wrapper.find('iframe').exists()).toBe(false)
  })
  it('keeps the native Storage player without preloading video bytes', () => {
    const wrapper = mount(ProjectVideo, { props: { url: '/test.mp4', title: 'Proje' } })
    expect(wrapper.get('video').attributes('preload')).toBe('none')
    expect(wrapper.find('iframe').exists()).toBe(false)
  })
  it('saves only the chosen video source while leaving the draft intact', () => {
    const video = new File(['video'], 'test.mp4', { type: 'video/mp4' })
    const form = {
      ...projectInput(),
      videoSource: 'youtube' as const,
      youtubeUrl: `https://youtu.be/${id}`,
      videoFile: video,
    }
    expect(toCreateProjectInput(form, categories).videoFile).toBeNull()
    expect(form.videoFile).toBe(video)
    expect(toCreateProjectInput({ ...form, videoSource: 'storage' }, categories).videoFile).toBe(
      video,
    )
    expect(toCreateProjectInput({ ...form, videoSource: 'storage' }, categories).youtubeUrl).toBe(
      '',
    )
    expect(
      validateProjectForm({ ...form, youtubeUrl: 'invalid' }, categories).youtubeUrl,
    ).toBeTruthy()
  })
})

describe('Opening media selection', () => {
  it('loads the video player immediately when selected as opening media', () => {
    const wrapper = mount(ProjectVideo, { props: { eager: true, youtubeId: id, title: 'Proje' } })
    expect(wrapper.find('iframe').exists()).toBe(true)
    expect(wrapper.find('.video-cover').exists()).toBe(false)
    expect(wrapper.get('iframe').attributes('src')).not.toContain('autoplay=1')
  })
  it('requires a YouTube source for the video opening and keeps the image as cover', () => {
    const input = {
      ...projectInput(),
      heroMedia: 'youtube' as const,
      videoSource: 'youtube' as const,
      youtubeUrl: `https://youtu.be/${id}`,
    }
    expect(toCreateProjectInput(input, categories).imageFile).toBe(input.imageFile)
    expect(validateProjectForm({ ...input, youtubeUrl: '' }, categories).heroMedia).toBeTruthy()
    expect(
      validateProjectForm({ ...input, videoSource: 'storage' }, categories).heroMedia,
    ).toBeTruthy()
    expect(
      validateProjectForm({ ...input, heroMedia: 'image' }, categories).heroMedia,
    ).toBeUndefined()
  })
})
