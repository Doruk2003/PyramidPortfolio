import type { MediaProgress } from '../types/MediaProgress'
import { onScopeDispose, readonly, ref } from 'vue'
import { getProjectBySlug } from '../services/projectService'
import { projectWriteService, ProjectWriteError } from '../services/projectWriteService'
import type { CreateProjectInput, UpdateProjectInput } from '../types/ProjectForm'

export function useProjectSubmission(writer = projectWriteService, findProject = getProjectBySlug) {
  const uploadProgress = ref<MediaProgress | null>(null)
  const reportProgress = (progress: MediaProgress) => {
    if (active) uploadProgress.value = progress
  }
  const isSubmitting = ref(false)
  const message = ref('')
  const slugError = ref('')
  let active = true
  onScopeDispose(() => {
    active = false
  })

  function clearFeedback() {
    message.value = ''
    slugError.value = ''
  }

  async function submit(input: CreateProjectInput | UpdateProjectInput) {
    if (!active || isSubmitting.value) return null
    isSubmitting.value = true
    clearFeedback()
    reportProgress({ stage: 'checking', completed: 0, total: 0 })
    try {
      const existing = await findProject(input.slug)
      if (!active) return null
      if (existing && (!('id' in input) || existing.id !== input.id)) {
        slugError.value = 'Bu proje adresi kullanılıyor. Farklı bir başlık girin.'
        return null
      }
      if (!writer.isConfigured) {
        message.value =
          'Form kontrolü başarılı. Kayıt hizmeti henüz hazır olmadığı için proje kaydedilmedi.'
        return null
      }
      const project = await ('id' in input
        ? writer.update(input, reportProgress)
        : writer.create(input, reportProgress))
      if (!active) return null
      return project
    } catch (error) {
      if (!active) return null
      if (error instanceof ProjectWriteError && error.code === 'duplicate_slug') {
        slugError.value = 'Bu proje adresi kullanılıyor. Farklı bir başlık girin.'
      } else if (error instanceof ProjectWriteError && error.code === 'conflict') {
        message.value =
          'Bu proje başka bir işlemde güncellendi. Değişikliklerinizi not edip sayfayı yenileyin; eski bilgilerle kayıt yapılmadı.'
      } else if (error instanceof ProjectWriteError && error.code === 'not_found') {
        message.value = 'Bu proje artık mevcut değil. Projeler listesine dönün.'
      } else if (error instanceof ProjectWriteError && error.code === 'gallery_setup_required') {
        message.value =
          'Proje medya veritabanı kurulumu eksik. İlgili kurulum SQL dosyaları uygulandıktan sonra yeniden kaydedin.'
      } else if (error instanceof ProjectWriteError && error.code === 'outcome_unknown') {
        message.value =
          'Kayıt sonucu doğrulanamadı. Yeniden göndermeden önce Projeler listesini kontrol edin; bilgileriniz formda duruyor.'
      } else if (error instanceof ProjectWriteError && error.code === 'cleanup_failed') {
        message.value =
          'Proje kaydedilemedi; yüklenen bazı dosyalar temizlenemedi. Storage içindeki kullanılmayan dosyaların kontrol edilmesi gerekiyor.'
      } else {
        message.value = 'İşlem tamamlanamadı. Bilgileriniz formda duruyor; tekrar deneyebilirsiniz.'
      }
      return null
    } finally {
      if (active) {
        isSubmitting.value = false
        uploadProgress.value = null
      }
    }
  }

  return {
    uploadProgress: readonly(uploadProgress),
    isSubmitting: readonly(isSubmitting),
    message: readonly(message),
    slugError: readonly(slugError),
    canSave: writer.isConfigured,
    clearFeedback,
    submit,
  }
}
