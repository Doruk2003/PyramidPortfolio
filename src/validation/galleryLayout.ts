import type { ProjectFormData } from '../types/ProjectForm'

export function galleryFileKey(file: File): string {
  return `upload:${JSON.stringify([file.name, file.size, file.type, file.lastModified])}`
}
export function gallerySources(form: ProjectFormData) {
  return [
    ...form.retainedMedia
      .filter((item) => item.kind === 'gallery')
      .map((item) => ({
        key: item.objectPath,
        title: item.title ?? '',
        description: item.description ?? '',
      })),
    ...form.galleryFiles.map((file) => ({ key: galleryFileKey(file), title: '', description: '' })),
  ]
}
export function validGalleryLayout(form: ProjectFormData): boolean {
  if (!form.galleryLayout) return true
  const keys = gallerySources(form).map((item) => item.key)
  return (
    form.galleryLayout.length === keys.length &&
    new Set(form.galleryLayout.map((item) => item.key)).size === keys.length &&
    form.galleryLayout.every(
      (item) =>
        keys.includes(item.key) &&
        item.title.trim().length <= 120 &&
        item.description.trim().length <= 1000,
    )
  )
}
