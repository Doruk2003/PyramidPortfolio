import { describe, expect, it, vi } from 'vitest'
import {
  createHomepageMediaService,
  type HomepageTransport,
} from '../src/services/homepageMediaService'
import type { HomepageMediaInput, HomepageMediaRow } from '../src/types/HomepageMedia'
const input: HomepageMediaInput = {
  mode: 'image',
  version: 1,
  posterPath: null,
  videoPath: null,
  posterFile: null,
  videoFile: null,
}
function fixture() {
  let row: HomepageMediaRow = {
    id: 1,
    mode: 'image',
    poster_path: null,
    video_path: null,
    version: 1,
    request_id: null,
  }
  const transport = {
    read: vi.fn(async () => row),
    publicUrl: (path: string) => `https://example.test/${path}`,
    userId: vi.fn(async () => 'user'),
    upload: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    cleanup: vi.fn(async () => 0),
    commit: vi.fn<HomepageTransport['commit']>(async (data) => {
      row = {
        ...row,
        mode: data.mode,
        request_id: data.requestId,
        poster_path: data.posterPath,
        video_path: data.videoPath,
        version: 2,
      }
    }),
  } satisfies HomepageTransport
  return { transport, service: createHomepageMediaService(transport) }
}
describe('Homepage media service', () => {
  it('uploads new media and returns confirmed settings', async () => {
    const { transport, service } = fixture()
    const result = await service.save({
      ...input,
      mode: 'video',
      posterFile: new File(['photo'], 'poster.jpg', { type: 'image/jpeg' }),
      videoFile: new File(['video'], 'clip.mp4', { type: 'video/mp4' }),
    })
    expect(transport.upload).toHaveBeenCalledTimes(2)
    expect(result.settings.videoUrl).toMatch(/\/video.mp4$/)
    expect(result.settings.posterUrl).toMatch(/\/poster.jpg$/)
    expect(result.settings.version).toBe(2)
    expect(result.cleanupPending).toBe(false)
  })
  it('clears the video path in image mode and does not upload the inactive video', async () => {
    const { transport, service } = fixture()
    await service.save({
      ...input,
      videoPath: 'old.mp4',
      videoFile: new File(['x'], 'new.mp4', { type: 'video/mp4' }),
    })
    expect(transport.upload).not.toHaveBeenCalled()
    expect(transport.commit).toHaveBeenCalledWith(expect.objectContaining({ videoPath: null }))
  })
  it('rejects oversized videos before any upload', async () => {
    const { transport, service } = fixture()
    const videoFile = new File(['x'], 'new.mp4', { type: 'video/mp4' })
    Object.defineProperty(videoFile, 'size', { value: 21 * 1024 * 1024 })
    await expect(service.save({ ...input, mode: 'video', videoFile })).rejects.toThrow('20 MB')
    expect(transport.upload).not.toHaveBeenCalled()
  })
  it('cleans only fresh uploads on a definite conflict', async () => {
    const { transport, service } = fixture()
    transport.commit.mockRejectedValue({ code: '40001' })
    await expect(
      service.save({ ...input, posterFile: new File(['x'], 'new.jpg', { type: 'image/jpeg' }) }),
    ).rejects.toThrow('güncellendi')
    expect(transport.remove).toHaveBeenCalledWith([expect.stringMatching(/\/poster.jpg$/)])
  })
  it('keeps files when the commit outcome cannot be verified', async () => {
    const { transport, service } = fixture()
    transport.commit.mockRejectedValue(new Error('offline'))
    await expect(
      service.save({ ...input, posterFile: new File(['x'], 'new.jpg', { type: 'image/jpeg' }) }),
    ).rejects.toThrow('doğrulanamadı')
    expect(transport.remove).not.toHaveBeenCalled()
  })
  it('reports a successful save even when old media cleanup fails', async () => {
    const { transport, service } = fixture()
    transport.cleanup.mockRejectedValue(new Error('offline'))
    expect((await service.save(input)).cleanupPending).toBe(true)
  })
})
