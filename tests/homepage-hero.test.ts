import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import HomepageHeroMedia from '../src/components/home/HomepageHeroMedia.vue'
import { defaultHomepageMedia } from '../src/services/homepageMediaService'
const settings = {
  ...defaultHomepageMedia,
  mode: 'video' as const,
  videoUrl: '/clip.mp4',
  video_path: 'clip.mp4',
}
let restricted = false
let visibility: (entries: { isIntersecting: boolean; intersectionRatio: number }[]) => void
beforeEach(() => {
  restricted = false
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: restricted, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: typeof visibility) {
        visibility = callback
      }
      observe() {}
      disconnect() {}
    },
  )
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})
describe('Homepage video playback policy', () => {
  it('does not create a video request before becoming visible and pauses off screen', async () => {
    const wrapper = mount(HomepageHeroMedia, { props: { settings } })
    expect(wrapper.find('video').exists()).toBe(false)
    visibility([{ isIntersecting: true, intersectionRatio: 1 }])
    await flushPromises()
    expect(wrapper.get('video').attributes('src')).toBe('/clip.mp4')
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
    visibility([{ isIntersecting: false, intersectionRatio: 0 }])
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  })
  it('waits for explicit play on mobile or reduced-motion devices', async () => {
    restricted = true
    const wrapper = mount(HomepageHeroMedia, { props: { settings } })
    visibility([{ isIntersecting: true, intersectionRatio: 1 }])
    await flushPromises()
    expect(wrapper.find('video').exists()).toBe(false)
    await wrapper.vm.toggle()
    await flushPromises()
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
  })
  it('keeps the cover visible when playback is blocked', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(new Error('blocked'))
    const wrapper = mount(HomepageHeroMedia, { props: { settings } })
    visibility([{ isIntersecting: true, intersectionRatio: 1 }])
    await flushPromises()
    expect(wrapper.get('img').isVisible()).toBe(true)
    expect(wrapper.emitted('state')?.at(-1)).toEqual([{ playing: false, failed: true }])
  })
})
