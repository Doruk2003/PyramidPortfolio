import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, CategoryRow, ProjectRow, MediaRow } from '../../types/Database'
import type { Project } from '../../types/Project'
import { isProjectStatus } from '../../constants/projectStatuses'
import type { CatalogReader } from './types'

export const PROJECT_MEDIA_BUCKET = 'project-media'
export type ProjectWithRelations = ProjectRow & {
  categories: { category: CategoryRow | null }[]
  media: MediaRow[]
}
const selection = '*, categories:project_categories(category:categories(*)), media:project_media(*)'
const PAGE_SIZE = 100

export function mapProject(
  row: ProjectWithRelations,
  publicUrl: (path: string) => string,
): Project {
  const categories = row.categories.map((link) => link.category)
  if (
    !categories.length ||
    categories.some((category) => !category) ||
    !isProjectStatus(row.status)
  ) {
    throw new Error('Invalid project record')
  }
  const media = [...row.media].sort((a, b) => a.position - b.position)
  const main = media.filter((item) => item.kind === 'main')
  if (main.length !== 1) throw new Error('Project requires one main image')
  const images = (kind: string) =>
    media.filter((item) => item.kind === kind).map((item) => publicUrl(item.object_path))
  const video = images('video')[0]
  return {
    ...(row.youtube_video_id ? { youtubeVideoId: row.youtube_video_id } : {}),
    heroMedia: row.hero_media ?? 'image',
    id: row.id,
    title: row.title,
    slug: row.slug,
    categoryIds: categories.map((category) => category!.id),
    categories: categories.map((category) => ({ ...category! })),
    version: row.version,
    updatedAt: row.updated_at,
    media: media.map((item) => {
      if (!['main', 'gallery', 'application', 'video'].includes(item.kind))
        throw new Error('Invalid media kind')
      return {
        title: item.title ?? '',
        description: item.description ?? '',
        objectPath: item.object_path,
        kind: item.kind as Project['media'][number]['kind'],
        position: item.position,
        url: publicUrl(item.object_path),
      }
    }),
    description: row.description,
    location: row.location,
    year: row.year,
    status: row.status,
    image: publicUrl(main[0]!.object_path),
    gallery: images('gallery'),
    applicationImages: images('application'),
    ...(video ? { videoUrl: video } : {}),
  }
}

export function createSupabaseCatalog(client: SupabaseClient<Database>) {
  const publicUrl = (path: string) =>
    client.storage.from(PROJECT_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
  const map = (row: ProjectWithRelations) => mapProject(row, publicUrl)
  async function find(
    field: 'slug' | 'request_id' | 'id',
    value: string | number,
  ): Promise<Project | null> {
    const { data, error } = await client
      .from('projects')
      .select(selection)
      .eq(field, value)
      .returns<ProjectWithRelations[]>()
      .maybeSingle()
    if (error) throw error
    return data ? map(data) : null
  }
  const reader = {
    async listCategories() {
      const result: CategoryRow[] = []
      let cursor: number | null = null
      for (;;) {
        let query = client.from('categories').select('*').order('id').limit(PAGE_SIZE)
        if (cursor !== null) query = query.gt('id', cursor)
        const { data, error } = await query
        if (error) throw error
        result.push(...data)
        if (data.length < PAGE_SIZE) return result
        cursor = data[data.length - 1]!.id
      }
    },
    async listProjects() {
      const result: Project[] = []
      let cursor: number | null = null
      for (;;) {
        let query = client
          .from('projects')
          .select(selection)
          .order('id', { ascending: false })
          .limit(PAGE_SIZE)
        if (cursor !== null) query = query.lt('id', cursor)
        const { data, error } = await query.returns<ProjectWithRelations[]>()
        if (error) throw error
        result.push(...data.map(map))
        if (data.length < PAGE_SIZE) return result
        cursor = data[data.length - 1]!.id
      }
    },
    getProjectById: (id: number) => find('id', id),
    getProjectBySlug: (slug: string) => find('slug', slug),
    getProjectByRequest: (id: string) => find('request_id', id),
  } satisfies CatalogReader & { getProjectByRequest(id: string): Promise<Project | null> }
  return reader
}
