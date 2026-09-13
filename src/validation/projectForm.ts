import { youtubeVideoId } from './youtube'
import { validGalleryLayout } from './galleryLayout'
import { PROJECT_FORM_RULES as rules } from '../constants/projectFormRules'
import { isProjectStatus } from '../constants/projectStatuses'
import type { Category } from '../types/Category'
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFormData,
  ProjectFormErrors,
} from '../types/ProjectForm'

export function createProjectSlug(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function validateMediaFile(
  file: File,
  kind: 'image' | 'video',
  source = false,
): string | undefined {
  const formats: Record<string, RegExp> =
    kind === 'image'
      ? { 'image/jpeg': /\.jpe?g$/i, 'image/png': /\.png$/i, 'image/webp': /\.webp$/i }
      : { 'video/mp4': /\.mp4$/i, 'video/webm': /\.webm$/i }
  if (!formats[file.type]?.test(file.name)) {
    return kind === 'image' ? 'JPEG, PNG veya WebP görsel seçin.' : 'MP4 veya WebM video seçin.'
  }
  if (file.size === 0) return 'Boş dosya seçilemez.'
  if (
    file.size >
    (kind === 'image'
      ? source
        ? rules.imageSourceMaxBytes
        : rules.imageMaxBytes
      : rules.videoMaxBytes)
  ) {
    return kind === 'image'
      ? source
        ? 'Hazırlanacak görsel en fazla 100 MB olabilir.'
        : 'Her görsel en fazla 10 MB olabilir.'
      : 'Video en fazla 100 MB olabilir.'
  }
  return undefined
}

export function validateProjectForm(
  form: ProjectFormData,
  categories: readonly Category[],
): ProjectFormErrors {
  const errors: ProjectFormErrors = {}
  if (form.heroMedia && !['image', 'youtube'].includes(form.heroMedia))
    errors.heroMedia = 'Geçerli bir açılış içeriği seçin.'
  if (
    form.heroMedia === 'youtube' &&
    (form.videoSource !== 'youtube' || !youtubeVideoId(form.youtubeUrl ?? ''))
  )
    errors.heroMedia =
      'Video ile açılış için YouTube kaynağını seçip geçerli bir bağlantı girin veya ana fotoğrafa dönün.'
  if (!validGalleryLayout(form))
    errors.galleryFiles =
      'Tasarım başlığı en fazla 120, açıklaması 1000 karakter olmalı; galeri sırası seçili görsellerle eşleşmelidir.'
  if (!form.title.trim()) errors.title = 'Proje başlığını girin.'
  else if (form.title.trim().length > rules.titleMax)
    errors.title = 'Başlık en fazla 150 karakter olabilir.'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug) || form.slug.length > rules.slugMax) {
    errors.slug = 'Başlık, geçerli bir proje adresi oluşturacak harf veya rakam içermelidir.'
  }
  if (
    !form.categoryIds.length ||
    new Set(form.categoryIds).size !== form.categoryIds.length ||
    form.categoryIds.some((id) => !categories.some((category) => category.id === id))
  )
    errors.categoryIds = 'En az bir geçerli sistem kategorisi seçin.'
  if (!isProjectStatus(form.status)) errors.status = 'Geçerli bir proje durumu seçin.'
  if (
    typeof form.year !== 'number' ||
    !Number.isInteger(form.year) ||
    form.year < rules.yearMin ||
    form.year > rules.yearMax
  ) {
    errors.year = '2000 ile 2100 arasında tam sayı bir yıl girin.'
  }
  if (form.description.trim().length > rules.descriptionMax)
    errors.description = 'Açıklama en fazla 5000 karakter olabilir.'
  if (form.location.trim().length > rules.locationMax)
    errors.location = 'Konum en fazla 150 karakter olabilir.'
  if (!form.imageFile && !form.retainedMedia.some((item) => item.kind === 'main'))
    errors.imageFile = 'Bir ana görsel seçin.'
  else if (form.imageFile) errors.imageFile = validateMediaFile(form.imageFile, 'image')
  for (const field of ['galleryFiles', 'applicationFiles'] as const) {
    if (
      form[field].length +
        form.retainedMedia.filter(
          (item) => item.kind === (field === 'galleryFiles' ? 'gallery' : 'application'),
        ).length >
      rules.groupMaxFiles
    )
      errors[field] = 'Her grupta en fazla 12 görsel olabilir.'
    else {
      const invalid = form[field].map((file) => validateMediaFile(file, 'image')).find(Boolean)
      if (invalid) errors[field] = invalid
    }
  }
  if (form.videoSource && !['youtube', 'storage'].includes(form.videoSource))
    errors.videoSource = 'Geçerli bir video kaynağı seçin.'
  if (form.videoSource === 'youtube' && form.youtubeUrl?.trim() && !youtubeVideoId(form.youtubeUrl))
    errors.youtubeUrl = 'Geçerli bir YouTube video bağlantısı girin.'
  if (form.videoSource !== 'youtube' && form.videoFile)
    errors.videoFile = validateMediaFile(form.videoFile, 'video')
  const files = [
    form.imageFile,
    ...form.galleryFiles,
    ...form.applicationFiles,
    form.videoSource === 'youtube' ? null : form.videoFile,
  ]
  if (files.reduce((sum, file) => sum + (file?.size ?? 0), 0) > rules.totalMaxBytes) {
    errors.imageFile = 'Seçilen medyanın toplam boyutu 150 MB sınırını aşıyor.'
  }
  return Object.fromEntries(Object.entries(errors).filter(([, error]) => Boolean(error)))
}

export function toCreateProjectInput(
  form: ProjectFormData,
  categories: readonly Category[],
): CreateProjectInput {
  if (
    Object.keys(validateProjectForm(form, categories)).length ||
    form.year === '' ||
    !form.imageFile
  ) {
    throw new Error('Invalid project form')
  }
  return {
    ...form,
    videoFile: form.videoSource === 'youtube' ? null : form.videoFile,
    youtubeUrl: form.videoSource === 'youtube' ? (form.youtubeUrl ?? '').trim() : '',
    title: form.title.trim(),
    description: form.description.trim(),
    location: form.location.trim(),
    categoryIds: [...form.categoryIds],
    galleryLayout: form.galleryLayout?.map((item) => ({
      ...item,
      title: item.title.trim(),
      description: item.description.trim(),
    })),
    retainedMedia: form.retainedMedia
      .filter((item) => form.videoSource !== 'youtube' || item.kind !== 'video')
      .map((item) => ({ ...item })),
    year: form.year,
    imageFile: form.imageFile,
    galleryFiles: [...form.galleryFiles],
    applicationFiles: [...form.applicationFiles],
  }
}

export function toUpdateProjectInput(
  form: ProjectFormData,
  categories: readonly Category[],
  id: number,
  version: number,
): UpdateProjectInput {
  if (Object.keys(validateProjectForm(form, categories)).length || form.year === '')
    throw new Error('Invalid project form')
  return {
    ...form,
    videoFile: form.videoSource === 'youtube' ? null : form.videoFile,
    youtubeUrl: form.videoSource === 'youtube' ? (form.youtubeUrl ?? '').trim() : '',
    id,
    version,
    title: form.title.trim(),
    description: form.description.trim(),
    location: form.location.trim(),
    year: form.year,
    categoryIds: [...form.categoryIds],
    galleryLayout: form.galleryLayout?.map((item) => ({
      ...item,
      title: item.title.trim(),
      description: item.description.trim(),
    })),
    retainedMedia: form.retainedMedia
      .filter((item) => form.videoSource !== 'youtube' || item.kind !== 'video')
      .map((item) => ({ ...item })),
    galleryFiles: [...form.galleryFiles],
    applicationFiles: [...form.applicationFiles],
  }
}
