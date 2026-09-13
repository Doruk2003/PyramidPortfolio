import { youtubeVideoId } from '../validation/youtube'
import type { ReportMediaProgress } from '../types/MediaProgress'
import { galleryFileKey } from '../validation/galleryLayout'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../types/Database'
import type { CreateProjectInput, UpdateProjectInput } from '../types/ProjectForm'
import type { Category } from '../types/Category'
import type { Project } from '../types/Project'
import { toCreateProjectInput, toUpdateProjectInput } from '../validation/projectForm'
import { ProjectWriteError } from './projectWriteErrors'
import { PROJECT_MEDIA_BUCKET } from './catalog/supabaseCatalog'

interface MediaUpload {
  file: File
  kind: 'main' | 'gallery' | 'application' | 'video'
  position: number
  object_path: string
}
export interface ProjectWriteTransport {
  getUserId(): Promise<string>
  listCategories(): Promise<Category[]>
  upload(path: string, file: File): Promise<void>
  remove(paths: string[]): Promise<void>
  update?(id: number, version: number, requestId: string, project: Json, media: Json): Promise<void>
  create(requestId: string, project: Json, media: Json): Promise<void>
  findByRequest(requestId: string): Promise<Project | null>
}
const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}
function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
}

export function createRemoteProjectWriter(transport: ProjectWriteTransport) {
  async function save(
    raw: CreateProjectInput | UpdateProjectInput,
    progress?: ReportMediaProgress,
  ): Promise<Project> {
    const categories = await transport.listCategories()
    const input =
      'id' in raw
        ? toUpdateProjectInput(raw, categories, raw.id, raw.version)
        : toCreateProjectInput(raw, categories)
    const userId = await transport.getUserId()
    const requestId = crypto.randomUUID()
    const uploads: MediaUpload[] = []
    const add = (kind: MediaUpload['kind'], files: File[]) =>
      files.forEach((file, position) => {
        uploads.push({
          file,
          kind,
          position,
          object_path: `${userId}/${requestId}/${kind}-${position}.${extensions[file.type]}`,
        })
      })
    if (input.imageFile) add('main', [input.imageFile])
    add('gallery', input.galleryFiles)
    add('application', input.applicationFiles)
    if (input.videoFile) add('video', [input.videoFile])
    const attempted: string[] = []
    async function cleanup(): Promise<void> {
      if (!attempted.length) return
      progress?.({ stage: 'cleanup', completed: 0, total: attempted.length })
      try {
        await transport.remove(attempted)
      } catch {
        throw new ProjectWriteError('cleanup_failed')
      }
    }
    try {
      for (const [index, item] of uploads.entries()) {
        progress?.({
          stage: 'uploading',
          completed: index,
          total: uploads.length,
          filename: item.file.name,
        })
        attempted.push(item.object_path)
        await transport.upload(item.object_path, item.file)
        progress?.({
          stage: 'uploading',
          completed: index + 1,
          total: uploads.length,
          filename: item.file.name,
        })
      }
    } catch {
      await cleanup()
      throw new ProjectWriteError('failed')
    }
    const media = [] as {
      title?: string
      description?: string
      kind: MediaUpload['kind']
      position: number
      object_path: string
    }[]
    for (const kind of ['main', 'gallery', 'application', 'video'] as const) {
      if (kind === 'gallery' && input.galleryLayout) {
        for (const [position, entry] of input.galleryLayout.entries()) {
          const retained = input.retainedMedia.find(
            (item) => item.kind === kind && item.objectPath === entry.key,
          )
          const upload = uploads.find(
            (item) => item.kind === kind && galleryFileKey(item.file) === entry.key,
          )
          const path = retained?.objectPath ?? upload?.object_path
          if (!path) throw new ProjectWriteError('failed')
          media.push({
            kind,
            position,
            object_path: path,
            title: entry.title,
            description: entry.description,
          })
        }
        continue
      }
      const kept = input.retainedMedia
        .filter((item) => item.kind === kind)
        .map((item) => ({ kind, object_path: item.objectPath }))
      const fresh = uploads
        .filter((item) => item.kind === kind)
        .map(({ object_path }) => ({ kind, object_path }))
      media.push(...[...kept, ...fresh].map((item, position) => ({ ...item, position })))
    }
    try {
      const persist =
        'id' in input
          ? (request: string, project: Json, media: Json) => {
              if (!transport.update) throw new ProjectWriteError('not_configured')
              return transport.update(input.id, input.version, request, project, media)
            }
          : transport.create
      progress?.({ stage: 'saving', completed: uploads.length, total: uploads.length })
      await persist(
        requestId,
        {
          title: input.title,
          slug: input.slug,
          category_ids: input.categoryIds,
          description: input.description,
          location: input.location,
          year: input.year,
          status: input.status,
          hero_media: input.heroMedia ?? 'image',
          youtube_video_id:
            input.videoSource === 'youtube' ? youtubeVideoId(input.youtubeUrl ?? '') : null,
        },
        media,
      )
    } catch (error) {
      // Only definite SQL rejection permits cleanup. A network error may hide a committed transaction.
      const code = errorCode(error)
      if (code === 'PGRST202' || /^(22|23|42)/.test(code) || code === '40001' || code === 'P0002') {
        await cleanup()
        throw new ProjectWriteError(
          code === 'PGRST202'
            ? 'gallery_setup_required'
            : code === '23505'
              ? 'duplicate_slug'
              : code === '40001'
                ? 'conflict'
                : code === 'P0002'
                  ? 'not_found'
                  : 'failed',
        )
      }
      try {
        progress?.({ stage: 'verifying', completed: uploads.length, total: uploads.length })
        const committed = await transport.findByRequest(requestId)
        if (committed) return committed
      } catch {
        /* Preserve uploads when commit outcome cannot be determined. */
      }
      throw new ProjectWriteError('outcome_unknown')
    }
    try {
      progress?.({ stage: 'verifying', completed: uploads.length, total: uploads.length })
      const saved = await transport.findByRequest(requestId)
      if (saved) return saved
    } catch {
      /* Do not delete media after a successful commit. */
    }
    throw new ProjectWriteError('outcome_unknown')
  }
  return {
    create: (input: CreateProjectInput, progress?: ReportMediaProgress) => save(input, progress),
    update: (input: UpdateProjectInput, progress?: ReportMediaProgress) => save(input, progress),
  }
}

export function createSupabaseWriteTransport(
  client: SupabaseClient<Database>,
  reader: Pick<ProjectWriteTransport, 'listCategories' | 'findByRequest'>,
): ProjectWriteTransport {
  const bucket = client.storage.from(PROJECT_MEDIA_BUCKET)
  return {
    ...reader,
    async getUserId() {
      const { data, error } = await client.auth.getUser()
      if (error || !data.user) throw new ProjectWriteError('failed')
      return data.user.id
    },
    async upload(path, file) {
      const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false })
      if (error) throw error
    },
    async remove(paths) {
      const { error } = await bucket.remove(paths)
      if (error) throw error
    },
    async update(id, version, requestId, project, media) {
      const { error } = await client.rpc('save_portfolio_project_presentation', {
        p_project_id: id,
        p_expected_version: version,
        p_request_id: requestId,
        p_project: project,
        p_media: media,
      })
      if (error) throw error
    },
    async create(requestId, project, media) {
      const { error } = await client.rpc('save_portfolio_project_presentation', {
        p_project_id: null,
        p_expected_version: null,
        p_request_id: requestId,
        p_project: project,
        p_media: media,
      })
      if (error) throw error
    },
  }
}
