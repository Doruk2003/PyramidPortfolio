import type { ProjectMedia } from './Project'
import type { ProjectStatus } from '../constants/projectStatuses'

export interface GalleryEntry {
  key: string
  title: string
  description: string
}

export interface ProjectFormData {
  heroMedia?: 'image' | 'youtube'
  videoSource?: 'youtube' | 'storage'
  youtubeUrl?: string
  galleryLayout?: GalleryEntry[]
  title: string
  slug: string

  categoryIds: number[]
  retainedMedia: ProjectMedia[]

  description: string
  location: string
  year: number | ''
  status: ProjectStatus

  imageFile: File | null
  galleryFiles: File[]
  applicationFiles: File[]
  videoFile: File | null
}

export interface MediaPreview {
  name: string
  url: string
}

export type ProjectFormErrors = Partial<Record<keyof ProjectFormData, string>>

export interface CreateProjectInput extends Omit<ProjectFormData, 'year' | 'imageFile'> {
  year: number
  imageFile: File
}

export interface UpdateProjectInput extends Omit<CreateProjectInput, 'imageFile'> {
  id: number
  version: number
  imageFile: File | null
}
