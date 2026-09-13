import { describe, expect, it, vi } from 'vitest'
import {
  createRemoteProjectWriter,
  type ProjectWriteTransport,
} from '../src/services/supabaseProjectWriter'
import { exampleCatalog } from '../src/services/catalog/exampleCatalog'
import { deferred, projectInput } from './helpers'

async function fixture() {
  const project = (await exampleCatalog.listProjects())[0]!
  const transport = {
    getUserId: vi.fn().mockResolvedValue('test-user'),
    listCategories: vi.fn().mockResolvedValue(await exampleCatalog.listCategories()),
    upload: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    update: vi.fn<NonNullable<ProjectWriteTransport['update']>>().mockResolvedValue(undefined),
    create: vi.fn<ProjectWriteTransport['create']>().mockResolvedValue(undefined),
    findByRequest: vi.fn().mockResolvedValue(project),
  } satisfies ProjectWriteTransport
  return { transport, writer: createRemoteProjectWriter(transport), project }
}

describe('Remote write orchestration', () => {
  it('uploads before creating and returns the persisted read model', async () => {
    const { transport, writer, project } = await fixture()
    expect(await writer.create(projectInput())).toBe(project)
    expect(transport.upload.mock.invocationCallOrder[0]).toBeLessThan(
      transport.create.mock.invocationCallOrder[0]!,
    )
    const [request, fields, media] = transport.create.mock.calls[0]!
    expect(fields).toMatchObject({ category_ids: [1], slug: 'cam-balkon' })
    expect(media).toEqual([
      { kind: 'main', position: 0, object_path: `test-user/${request}/main-0.jpg` },
    ])
    expect(transport.remove).not.toHaveBeenCalled()
  })
  it('validates before contacting Storage and rejects unauthenticated writes', async () => {
    const { transport, writer } = await fixture()
    await expect(writer.create({ ...projectInput(), categoryIds: [999] })).rejects.toThrow()
    expect(transport.upload).not.toHaveBeenCalled()
    transport.getUserId.mockRejectedValue(new Error('no session'))
    await expect(writer.create(projectInput())).rejects.toThrow()
    expect(transport.upload).not.toHaveBeenCalled()
  })
  it('cleans attempted uploads on an upload failure and does not create a project', async () => {
    const { transport, writer } = await fixture()
    transport.upload.mockRejectedValue(new Error('upload failed'))
    await expect(writer.create(projectInput())).rejects.toMatchObject({ code: 'failed' })
    expect(transport.remove).toHaveBeenCalledWith([expect.stringMatching(/main-0.jpg$/)])
    expect(transport.create).not.toHaveBeenCalled()
  })
  it('cleans files on a definitive duplicate slug rejection', async () => {
    const { transport, writer } = await fixture()
    transport.create.mockRejectedValue({ code: '23505' })
    await expect(writer.create(projectInput())).rejects.toMatchObject({ code: 'duplicate_slug' })
    expect(transport.remove).toHaveBeenCalledOnce()
  })
  it('recovers a committed result when the RPC response was lost', async () => {
    const { transport, writer, project } = await fixture()
    transport.create.mockRejectedValue(new Error('connection lost'))
    expect(await writer.create(projectInput())).toBe(project)
    expect(transport.remove).not.toHaveBeenCalled()
  })
  it('preserves uploaded files on an uncertain commit outcome', async () => {
    const { transport, writer } = await fixture()
    transport.create.mockRejectedValue(new Error('connection lost'))
    transport.findByRequest.mockRejectedValue(new Error('offline'))
    await expect(writer.create(projectInput())).rejects.toMatchObject({ code: 'outcome_unknown' })
    expect(transport.remove).not.toHaveBeenCalled()
  })
  it('does not delete committed media if the final read fails', async () => {
    const { transport, writer } = await fixture()
    transport.findByRequest.mockResolvedValue(null)
    await expect(writer.create(projectInput())).rejects.toMatchObject({ code: 'outcome_unknown' })
    expect(transport.remove).not.toHaveBeenCalled()
  })
  it('reports cleanup failures instead of claiming all uploads were removed', async () => {
    const { transport, writer } = await fixture()
    transport.upload.mockRejectedValue(new Error('upload failed'))
    transport.remove.mockRejectedValue(new Error('cleanup failed'))
    await expect(writer.create(projectInput())).rejects.toMatchObject({ code: 'cleanup_failed' })
  })
})

describe('Remote updates', () => {
  it('keeps existing main media and skips uploading when only metadata changes', async () => {
    const { transport, writer, project } = await fixture()
    const input = {
      ...projectInput(),
      id: 1,
      version: 3,
      imageFile: null,
      retainedMedia: [
        {
          kind: 'main' as const,
          position: 0,
          objectPath: 'existing/main.jpg',
          url: 'https://example.test/main.jpg',
        },
      ],
    }
    expect(await writer.update(input)).toBe(project)
    expect(transport.upload).not.toHaveBeenCalled()
    expect(transport.create).not.toHaveBeenCalled()
    expect(transport.update).toHaveBeenCalledWith(
      1,
      3,
      expect.any(String),
      expect.objectContaining({ category_ids: [1] }),
      [{ kind: 'main', position: 0, object_path: 'existing/main.jpg' }],
    )
  })
  it('cleans only fresh uploads after an update conflict', async () => {
    const { transport, writer } = await fixture()
    transport.update.mockRejectedValue({ code: '40001' })
    await expect(writer.update({ ...projectInput(), id: 1, version: 1 })).rejects.toMatchObject({
      code: 'conflict',
    })
    expect(transport.remove).toHaveBeenCalledWith([
      expect.stringMatching(/test-user\/.*\/main-0.jpg$/),
    ])
  })
})

describe('Upload progress', () => {
  it('counts uploads only after completion and then reports persistence and verification', async () => {
    const { transport, writer } = await fixture()
    const pending = deferred<void>()
    transport.upload.mockReturnValue(pending.promise)
    const report = vi.fn()
    const task = writer.create(projectInput(), report)
    await vi.waitFor(() => expect(transport.upload).toHaveBeenCalledOnce())
    expect(report).toHaveBeenLastCalledWith({
      stage: 'uploading',
      completed: 0,
      total: 1,
      filename: projectInput().imageFile.name,
    })
    pending.resolve()
    await task
    expect(report.mock.calls.map(([event]) => [event.stage, event.completed])).toEqual([
      ['uploading', 0],
      ['uploading', 1],
      ['saving', 1],
      ['verifying', 1],
    ])
  })
  it('does not report a failed upload as completed', async () => {
    const { transport, writer } = await fixture()
    transport.upload.mockRejectedValue(new Error('offline'))
    const report = vi.fn()
    await expect(writer.create(projectInput(), report)).rejects.toThrow()
    expect(report.mock.calls.map(([event]) => event.stage)).toEqual(['uploading', 'cleanup'])
  })
})
