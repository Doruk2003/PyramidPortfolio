import { supabase } from '../lib/supabase'
import { dataSource } from './catalog'
import defaultPoster from '../assets/images/hero.jpeg'
import type { HomepageMedia, HomepageMediaInput, HomepageMediaRow } from '../types/HomepageMedia'
import type { ReportMediaProgress } from '../types/MediaProgress'
import { validateMediaFile } from '../validation/projectForm'

export const HOMEPAGE_BUCKET = 'homepage-media'
export const HOMEPAGE_VIDEO_MAX_BYTES = 20 * 1024 * 1024
export const defaultHomepageMedia: HomepageMedia = {
  id: 1,
  mode: 'image',
  poster_path: null,
  video_path: null,
  version: 1,
  request_id: null,
  posterUrl: defaultPoster,
  videoUrl: null,
}
export interface HomepageTransport {
  read(): Promise<HomepageMediaRow>
  publicUrl(path: string): string
  userId(): Promise<string>
  upload(path: string, file: File): Promise<void>
  remove(paths: string[]): Promise<void>
  commit(input: {
    version: number
    requestId: string
    mode: 'image' | 'video'
    posterPath: string | null
    videoPath: string | null
  }): Promise<void>
  cleanup(): Promise<number>
}
export function validateHomepageInput(input: HomepageMediaInput) {
  if (!['image', 'video'].includes(input.mode)) throw new Error('Geçerli bir açılış türü seçin.')
  if (input.posterFile) {
    const error = validateMediaFile(input.posterFile, 'image')
    if (error) throw new Error(error)
  }
  if (input.mode === 'video') {
    if (!input.videoFile && !input.videoPath) throw new Error('Bir açılış videosu seçin.')
    if (input.videoFile) {
      const error = validateMediaFile(input.videoFile, 'video')
      if (error) throw new Error(error)
      if (input.videoFile.size > HOMEPAGE_VIDEO_MAX_BYTES)
        throw new Error('Açılış videosu en fazla 20 MB olabilir.')
    }
  }
}
export function createHomepageMediaService(transport: HomepageTransport | null) {
  const required = () => {
    if (!transport) throw new Error('Supabase ana sayfa yönetimi yapılandırılmadı.')
    return transport
  }
  const map = (row: HomepageMediaRow): HomepageMedia => ({
    ...row,
    posterUrl: row.poster_path ? required().publicUrl(row.poster_path) : defaultPoster,
    videoUrl: row.video_path ? required().publicUrl(row.video_path) : null,
  })
  const read = async () => map(await required().read())
  async function save(input: HomepageMediaInput, progress?: ReportMediaProgress) {
    validateHomepageInput(input)
    const remote = required()
    const userId = await remote.userId()
    const requestId = crypto.randomUUID()
    const uploads: { path: string; file: File }[] = []
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
    }
    const add = (kind: string, file: File) => {
      const path = `${userId}/${requestId}/${kind}.${extensions[file.type]}`
      uploads.push({ path, file })
      return path
    }
    const posterPath = input.posterFile ? add('poster', input.posterFile) : input.posterPath
    const videoPath =
      input.mode === 'video'
        ? input.videoFile
          ? add('video', input.videoFile)
          : input.videoPath
        : null
    const attempted: string[] = []
    const removeAttempted = async () => {
      if (attempted.length) {
        try {
          await remote.remove(attempted)
        } catch {
          throw new Error(
            'Kayıt tamamlanamadı; yeni dosyaların temizliği de başarısız oldu. Storage kontrol edilmeli.',
          )
        }
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
        attempted.push(item.path)
        await remote.upload(item.path, item.file)
        progress?.({
          stage: 'uploading',
          completed: index + 1,
          total: uploads.length,
          filename: item.file.name,
        })
      }
    } catch {
      await removeAttempted()
      throw new Error('Dosya yüklenemedi. Seçimleriniz korunuyor; tekrar deneyebilirsiniz.')
    }
    let saved: HomepageMedia
    try {
      progress?.({ stage: 'saving', completed: uploads.length, total: uploads.length })
      await remote.commit({
        version: input.version,
        requestId,
        mode: input.mode,
        posterPath,
        videoPath,
      })
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
      if (/^(22|23|42)/.test(code) || ['40001', 'P0002', 'PGRST202'].includes(code)) {
        await removeAttempted()
        throw new Error(
          code === '40001'
            ? 'Ana sayfa başka bir işlemde güncellendi. Seçimlerinizi not edip sayfayı yenileyin.'
            : 'Kayıt reddedildi. Ana sayfa kurulum SQL dosyasını ve seçili dosyaları kontrol edin.',
        )
      }
      // An interrupted response can conceal a commit; never remove files without certainty.
    }
    try {
      progress?.({ stage: 'verifying', completed: uploads.length, total: uploads.length })
      saved = await read()
      if (saved.request_id !== requestId) throw new Error('Uncertain result')
    } catch {
      throw new Error(
        'Kayıt sonucu doğrulanamadı. Yeniden kaydetmeden önce sayfayı yenileyip sonucu kontrol edin.',
      )
    }
    let cleanupPending = false
    try {
      progress?.({ stage: 'cleanup', completed: 0, total: 0 })
      cleanupPending = (await remote.cleanup()) > 0
    } catch {
      cleanupPending = true
    }
    return { settings: saved, cleanupPending }
  }
  return { isConfigured: !!transport, read, save, cleanup: () => required().cleanup() }
}
const client = dataSource === 'supabase' ? supabase : null
export const homepageMediaService = createHomepageMediaService(
  client
    ? {
        async read() {
          const { data, error } = await client
            .from('homepage_media')
            .select('*')
            .eq('id', 1)
            .single()
          if (error) throw error
          return data
        },
        publicUrl: (path) => client.storage.from(HOMEPAGE_BUCKET).getPublicUrl(path).data.publicUrl,
        async userId() {
          const { data, error } = await client.auth.getUser()
          if (error || !data.user) throw new Error('Yönetici oturumu gerekli.')
          return data.user.id
        },
        async upload(path, file) {
          const { error } = await client.storage
            .from(HOMEPAGE_BUCKET)
            .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
          if (error) throw error
        },
        async remove(paths) {
          const { error } = await client.storage.from(HOMEPAGE_BUCKET).remove(paths)
          if (error) throw error
        },
        async commit(input) {
          const { error } = await client.rpc('save_homepage_media', {
            p_version: input.version,
            p_request_id: input.requestId,
            p_mode: input.mode,
            p_poster_path: input.posterPath,
            p_video_path: input.videoPath,
          })
          if (error) throw error
        },
        async cleanup() {
          const queue = await client
            .from('homepage_media_cleanup')
            .select('*')
            .order('queued_at')
            .limit(100)
          if (queue.error) throw queue.error
          if (queue.data.length) {
            const paths = queue.data.map((item) => item.object_path)
            const removal = await client.storage.from(HOMEPAGE_BUCKET).remove(paths)
            if (removal.error) throw removal.error
            const ack = await client
              .from('homepage_media_cleanup')
              .delete()
              .in('object_path', paths)
            if (ack.error) throw ack.error
          }
          const result = await client
            .from('homepage_media_cleanup')
            .select('*', { count: 'exact', head: true })
          if (result.error) throw result.error
          return result.count ?? 0
        },
      }
    : null,
)
