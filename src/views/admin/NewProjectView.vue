<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { useProjectSubmission } from '../../composables/useProjectSubmission'
import { toCreateProjectInput, toUpdateProjectInput } from '../../validation/projectForm'

import MediaProgressStatus from '../../components/admin/projects/MediaProgressStatus.vue'
import ProjectBasicInfoForm from '../../components/admin/projects/ProjectBasicInfoForm.vue'
import ProjectMediaForm from '../../components/admin/projects/ProjectMediaForm.vue'
import { useProjectForm } from '../../composables/useProjectForm'
import AsyncState from '../../components/ui/AsyncState.vue'
import { useAsyncData } from '../../composables/useAsyncData'
import { listCategories } from '../../services/categoryService'
import { getProjectById } from '../../services/projectService'
import { cleanupProjectMedia } from '../../services/projectManagementService'
import type { Project } from '../../types/Project'

const route = useRoute()
const editing = route.params.id !== undefined
const projectId = Number(route.params.id)
const currentProject = ref<Project | null>(null)

const {
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

  handleMainImage,
  handleGalleryImages,
  handleApplicationImages,
  handleVideo,

  mainImagePreview,
  galleryPreviews,
  applicationPreviews,
} = useProjectForm(editing)

const {
  data: categories,
  isLoading,
  hasError,
  reload,
} = useAsyncData(async () => {
  const categories = await listCategories()
  if (editing) {
    if (!Number.isSafeInteger(projectId) || projectId <= 0) throw new Error('Invalid project ID')
    currentProject.value = await getProjectById(projectId)
    if (currentProject.value) loadProject(currentProject.value)
  }
  return categories
}, [])
const missing = computed(
  () => editing && !isLoading.value && !hasError.value && !currentProject.value,
)

const router = useRouter()
const auth = useAuth()
const { uploadProgress, isSubmitting, message, slugError, canSave, clearFeedback, submit } =
  useProjectSubmission()
const formElement = ref<HTMLFormElement | null>(null)
const localMessage = ref('')
let active = true

watch(
  form,
  () => {
    clearFeedback()
    localMessage.value = ''
  },
  { deep: true },
)

async function focusError() {
  await nextTick()
  if (active) formElement.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

async function handleSubmit() {
  if (isPreparingMedia.value || isSubmitting.value || !auth.isAuthenticated.value) return
  clearFeedback()
  if (!validate(categories.value)) {
    await focusError()
    return
  }
  const input =
    editing && currentProject.value
      ? toUpdateProjectInput(
          form,
          categories.value,
          currentProject.value.id,
          currentProject.value.version,
        )
      : toCreateProjectInput(form, categories.value)
  const project = await submit(input)
  if (!active) return
  if (slugError.value) {
    errors.slug = slugError.value
    await focusError()
  }
  if (project) {
    markSaved()
    try {
      let cleanupPending = false
      if (editing) {
        try {
          cleanupPending = (await cleanupProjectMedia()).remaining > 0
        } catch {
          cleanupPending = true
        }
      }
      if (!active) return
      await router.push({
        name: 'admin-projects',
        query: { saved: '1', ...(cleanupPending ? { cleanup: '1' } : {}) },
      })
    } catch {
      localMessage.value =
        'Proje kaydedildi; liste açılamadı. Projeler bağlantısından devam edebilirsiniz.'
    }
  }
}

function beforeUnload(event: BeforeUnloadEvent) {
  if (!isDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(() => {
  if (!auth.isAuthenticated.value || !isDirty.value) return true
  return window.confirm(
    isSubmitting.value
      ? 'İşlem devam ediyor. Ayrılırsanız işlem arka planda tamamlanabilir. Ayrılmak istiyor musunuz?'
      : 'Kaydedilmemiş değişiklikleriniz var. Ayrılırsanız bu değişiklikler kaybolacak. Ayrılmak istiyor musunuz?',
  )
})
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => {
  active = false
  window.removeEventListener('beforeunload', beforeUnload)
})
</script>

<template>
  <section class="new-project-page">
    <div class="form-header">
      <div>
        <p class="admin-kicker">İçerik Yönetimi</p>

        <RouterLink class="back-link" :to="{ name: 'admin-projects' }">← Projelere dön</RouterLink>
        <h1>{{ editing ? 'Projeyi düzenle' : 'Yeni proje' }}</h1>

        <p class="form-description">
          {{
            editing
              ? 'Bilgileri ve sistem kategorilerini güncelleyin. Mevcut medya, siz kaldırmadıkça korunur; proje adresi değişmez.'
              : 'Proje bilgilerini girin, kullanılan sistemleri seçin ve görselleri ekleyin.'
          }}
        </p>
      </div>
    </div>

    <AsyncState
      :loading="isLoading"
      :error="hasError"
      :empty="categories.length === 0"
      loading-text="Form seçenekleri yükleniyor…"
      error-text="Proje formu yüklenemedi."
      empty-text="Proje ekleyebilmek için önce bir kategori tanımlanmalıdır."
      @retry="reload"
    />
    <p v-if="missing" role="status">
      Bu proje bulunamadı. <RouterLink :to="{ name: 'admin-projects' }">Projelere dön</RouterLink>
    </p>
    <form
      v-if="!isLoading && !hasError && !missing && categories.length"
      ref="formElement"
      class="project-form"
      novalidate
      :aria-busy="isSubmitting || isPreparingMedia"
      @submit.prevent="handleSubmit"
    >
      <p v-if="!canSave" class="form-notice" role="status">
        Proje kaydı henüz kullanıma açılmadı. Formu kontrol edebilirsiniz; bilgiler
        kaydedilmeyecektir.
      </p>
      <fieldset class="project-form-fields" :disabled="isSubmitting || isPreparingMedia">
        <legend class="form-legend">Proje bilgileri ve medya</legend>
        <ProjectBasicInfoForm :form="form" :categories="categories" :errors="errors" />

        <ProjectMediaForm
          :preparation="mediaPreparation"
          :form="form"
          :errors="errors"
          :main-image-preview="mainImagePreview"
          :gallery-previews="galleryPreviews"
          :application-previews="applicationPreviews"
          @main-image-change="handleMainImage"
          @gallery-images-change="handleGalleryImages"
          @application-images-change="handleApplicationImages"
          @video-change="handleVideo"
          @remove-media="removeMedia"
        />
      </fieldset>
      <p v-if="message || localMessage" class="form-notice" role="status">
        {{ localMessage || message }}
      </p>
      <div class="form-actions">
        <MediaProgressStatus
          v-if="preparationProgress || uploadProgress"
          :progress="(preparationProgress || uploadProgress)!"
        />
        <RouterLink to="/admin/projeler" class="cancel-button"> İptal </RouterLink>

        <button type="submit" class="save-button" :disabled="isSubmitting || isPreparingMedia">
          {{
            isPreparingMedia
              ? 'Görseller hazırlanıyor…'
              : isSubmitting
                ? canSave
                  ? 'Kaydediliyor…'
                  : 'Kontrol ediliyor…'
                : canSave
                  ? editing
                    ? 'Değişiklikleri Kaydet'
                    : 'Projeyi Kaydet'
                  : 'Formu Kontrol Et'
          }}
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.project-form-fields {
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}
.form-legend {
  margin-bottom: 16px;
  font-weight: 600;
}
.form-notice {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  line-height: 1.6;
}
.save-button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.new-project-page {
  width: 100%;
  max-width: 1100px;
  margin-inline: auto;
}

.form-header {
  margin-bottom: 32px;
}

.admin-kicker {
  margin: 0 0 8px;
  color: #777777;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.form-header h1 {
  margin: 0;
  color: #111111;
  font-size: clamp(26px, 3vw, 36px);
}

.form-description {
  max-width: 700px;
  margin-top: 16px;
  margin-bottom: 0;
  color: #666666;
  line-height: 1.7;
}
</style>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: 16px;
  color: #386b61;
  font-size: 14px;
  text-decoration: none;
}
.form-actions {
  flex-wrap: wrap;
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: #ffffff;
  padding: 16px;
  border-top: 1px solid #e2e8ed;
  box-shadow: 0 -4px 20px #0d263008;
}
</style>

<style scoped>
.form-actions > .media-progress-status {
  flex-basis: 100%;
}
</style>
