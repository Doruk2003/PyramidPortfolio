import type { MediaProgress } from '../types/MediaProgress'
import { computed, onScopeDispose, reactive, ref, shallowRef, watch } from 'vue'
import { DEFAULT_PROJECT_STATUS } from '../constants/projectStatuses'
import { PROJECT_FORM_RULES } from '../constants/projectFormRules'
import type { Project } from '../types/Project'
import type { Category } from '../types/Category'
import type { ProjectFormData, ProjectFormErrors } from '../types/ProjectForm'
import {
  createProjectSlug,
  validateMediaFile,
  validateProjectForm,
} from '../validation/projectForm'
import { optimizeImage, type OptimizedImage } from '../services/imageOptimization'
import { gallerySources } from '../validation/galleryLayout'
import { useMediaPreviews } from './useMediaPreviews'

export function useProjectForm(editing = false, optimize = optimizeImage) {
  const form = reactive<ProjectFormData>({
    heroMedia: 'image',
    videoSource: 'youtube',
    youtubeUrl: '',
    galleryLayout: [],
    title: '',
    slug: '',
    categoryIds: [],
    retainedMedia: [],
    description: '',
    location: '',
    year: new Date().getFullYear(),
    status: DEFAULT_PROJECT_STATUS,
    imageFile: null,
    galleryFiles: [],
    applicationFiles: [],
    videoFile: null,
  })
  watch(
    () => [form.galleryFiles, form.retainedMedia],
    () => {
      const sources = gallerySources(form)
      form.galleryLayout = [
        ...(form.galleryLayout ?? []).filter((entry) =>
          sources.some((source) => source.key === entry.key),
        ),
        ...sources.filter(
          (source) => !form.galleryLayout?.some((entry) => entry.key === source.key),
        ),
      ]
    },
    { flush: 'sync' },
  )
  const preparationProgress = ref<MediaProgress | null>(null)
  const isPreparingMedia = ref(false)
  let active = true
  onScopeDispose(() => {
    active = false
  })
  const prepared = new WeakMap<File, OptimizedImage>()
  const originals = new WeakMap<File, File>()
  const mediaPreparation = computed(() =>
    [form.imageFile, ...form.galleryFiles, ...form.applicationFiles]
      .filter((file): file is File => file !== null)
      .flatMap((file) => {
        const result = prepared.get(file)
        return result
          ? [
              {
                name: file.name,
                originalBytes: result.originalBytes,
                bytes: file.size,
                note: result.note,
              },
            ]
          : []
      }),
  )
  async function prepare(files: File[], design: boolean) {
    isPreparingMedia.value = true
    try {
      const results: File[] = []
      for (const [index, file] of files.entries()) {
        if (!active) return []
        preparationProgress.value = {
          stage: 'preparing',
          completed: index,
          total: files.length,
          filename: file.name,
        }
        const result = await optimize(file, design ? 'design' : 'photo')
        if (validateMediaFile(result.file, 'image'))
          throw new Error(
            `${file.name}: Görsel yüklemeye hazırlanamadı veya 10 MB altına indirilemedi. Daha küçük bir görsel seçin.`,
          )
        prepared.set(result.file, result)
        originals.set(result.file, file)
        results.push(result.file)
        if (active)
          preparationProgress.value = {
            stage: 'preparing',
            completed: index + 1,
            total: files.length,
            filename: file.name,
          }
      }
      return results
    } finally {
      isPreparingMedia.value = false
      preparationProgress.value = null
    }
  }
  const errors = reactive<ProjectFormErrors>({})
  const snapshot = () => ({
    ...form,
    galleryLayout: form.galleryLayout?.map((item) => ({ ...item })),
    categoryIds: [...form.categoryIds],
    retainedMedia: [...form.retainedMedia],
    galleryFiles: [...form.galleryFiles],
    applicationFiles: [...form.applicationFiles],
  })
  const saved = shallowRef(snapshot())
  const isDirty = computed(
    () =>
      isPreparingMedia.value ||
      (Object.keys(form) as (keyof ProjectFormData)[]).some((key) => {
        if (key === 'galleryLayout')
          return JSON.stringify(form.galleryLayout) !== JSON.stringify(saved.value.galleryLayout)
        const current = form[key],
          original = saved.value[key]
        if (Array.isArray(current) && Array.isArray(original)) {
          return (
            current.length !== original.length ||
            current.some((file, index) => file !== original[index])
          )
        }
        return current !== original
      }),
  )
  const markSaved = () => {
    saved.value = snapshot()
  }

  watch(
    () => form.title,
    (title) => {
      if (!editing) form.slug = createProjectSlug(title)
    },
    { flush: 'sync' },
  )

  function validate(categories: readonly Category[]) {
    for (const key of Object.keys(errors) as (keyof ProjectFormData)[]) delete errors[key]
    Object.assign(errors, validateProjectForm(form, categories))
    return Object.keys(errors).length === 0
  }

  function readFiles(event: Event) {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files ?? [])
    input.value = '' // Allows choosing the same file again after removal/rejection.
    return files
  }

  async function selectSingle(event: Event, field: 'imageFile' | 'videoFile') {
    if (isPreparingMedia.value || !active) return
    const file = readFiles(event)[0]
    if (!file) return
    const error = validateMediaFile(file, field === 'imageFile' ? 'image' : 'video', true)
    if (error) {
      errors[field] = error
      return
    }
    let selected: File | undefined
    try {
      selected = field === 'imageFile' ? (await prepare([file], false))[0] : file
    } catch (error) {
      if (active) errors[field] = error instanceof Error ? error.message : 'Görsel hazırlanamadı.'
      return
    }
    if (!active || !selected) return
    delete errors[field]
    form.retainedMedia = form.retainedMedia.filter(
      (item) => item.kind !== (field === 'imageFile' ? 'main' : 'video'),
    )
    form[field] = selected
  }

  async function selectMany(event: Event, field: 'galleryFiles' | 'applicationFiles') {
    if (isPreparingMedia.value || !active) return
    const incoming = readFiles(event)
    if (!incoming.length) return
    const next = [...form[field]]
    for (const file of incoming) {
      const error = validateMediaFile(file, 'image', true)
      if (error) {
        errors[field] = error
        return
      }
      if (
        !next.some((stored) => {
          const existing = originals.get(stored) ?? stored
          return (
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified &&
            existing.type === file.type
          )
        })
      )
        next.push(file)
    }
    if (
      next.length +
        form.retainedMedia.filter(
          (item) => item.kind === (field === 'galleryFiles' ? 'gallery' : 'application'),
        ).length >
      PROJECT_FORM_RULES.groupMaxFiles
    ) {
      errors[field] = 'Her grupta en fazla 12 görsel olabilir.'
      return
    }
    delete errors[field]
    let added: File[]
    try {
      added = await prepare(next.slice(form[field].length), field === 'galleryFiles')
    } catch (error) {
      if (active)
        errors[field] = error instanceof Error ? error.message : 'Görseller hazırlanamadı.'
      return
    }
    if (!active) return
    form[field] = [...form[field], ...added]
  }

  function removeMedia(
    field: 'imageFile' | 'videoFile' | 'galleryFiles' | 'applicationFiles',
    index = 0,
  ) {
    if (isPreparingMedia.value) return
    if (field === 'imageFile' || field === 'videoFile') {
      form[field] = null
      form.retainedMedia = form.retainedMedia.filter(
        (item) => item.kind !== (field === 'imageFile' ? 'main' : 'video'),
      )
    } else form[field] = form[field].filter((_, position) => position !== index)
    delete errors[field]
  }

  const mainPreviews = useMediaPreviews(() => (form.imageFile ? [form.imageFile] : []))
  const galleryPreviews = useMediaPreviews(() => [...form.galleryFiles])
  const applicationPreviews = useMediaPreviews(() => [...form.applicationFiles])

  function loadProject(project: Project) {
    Object.assign(form, {
      heroMedia: project.heroMedia ?? 'image',
      videoSource: project.youtubeVideoId || !project.videoUrl ? 'youtube' : 'storage',
      youtubeUrl: project.youtubeVideoId
        ? `https://www.youtube.com/watch?v=${project.youtubeVideoId}`
        : '',
      title: project.title,
      slug: project.slug,
      categoryIds: [...project.categoryIds],
      description: project.description,
      location: project.location,
      year: project.year,
      status: project.status,
      imageFile: null,
      videoFile: null,
      galleryFiles: [],
      applicationFiles: [],
      retainedMedia: project.media.map((item) => ({ ...item })),
    })
    markSaved()
  }
  return {
    preparationProgress,
    isPreparingMedia,
    mediaPreparation,
    loadProject,
    form,
    errors,
    isDirty,
    validate,
    markSaved,
    removeMedia,
    handleMainImage: (event: Event) => selectSingle(event, 'imageFile'),
    handleVideo: (event: Event) => selectSingle(event, 'videoFile'),
    handleGalleryImages: (event: Event) => selectMany(event, 'galleryFiles'),
    handleApplicationImages: (event: Event) => selectMany(event, 'applicationFiles'),
    mainImagePreview: computed(
      () =>
        mainPreviews.value[0]?.url ??
        form.retainedMedia.find((item) => item.kind === 'main')?.url ??
        '',
    ),
    galleryPreviews,
    applicationPreviews,
  }
}
