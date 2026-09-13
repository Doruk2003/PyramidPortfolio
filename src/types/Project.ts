import type { ProjectStatus } from '../constants/projectStatuses'
import type { Category } from './Category'

export interface ProjectRecord {
  heroMedia?: 'image' | 'youtube'
  id: number
  title: string
  slug: string

  categoryIds: Category['id'][]

  description: string
  location: string
  year: number
  status: ProjectStatus

  image: string

  gallery: string[]
  applicationImages: string[]

  youtubeVideoId?: string
  videoUrl?: string
}

export interface Project extends ProjectRecord {
  // Read model: resolved by the service, never stored as a second category source.
  categories: Category[]
  version: number
  updatedAt?: string
  media: ProjectMedia[]
}

export interface ProjectMedia {
  title?: string
  description?: string
  objectPath: string
  kind: 'main' | 'gallery' | 'application' | 'video'
  position: number
  url: string
}
