<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { useAsyncData } from '../../composables/useAsyncData'
import { useMediaPreviews } from '../../composables/useMediaPreviews'
import AsyncState from '../../components/ui/AsyncState.vue'
import MediaProgressStatus from '../../components/admin/projects/MediaProgressStatus.vue'
import {
  homepageMediaService,
  defaultHomepageMedia,
  HOMEPAGE_VIDEO_MAX_BYTES,
} from '../../services/homepageMediaService'
import { optimizeImage } from '../../services/imageOptimization'
import { validateMediaFile } from '../../validation/projectForm'
import { IMAGE_ACCEPT, VIDEO_ACCEPT } from '../../constants/projectFormRules'
import type { HomepageMedia, HomepageMediaInput } from '../../types/HomepageMedia'
import type { MediaProgress } from '../../types/MediaProgress'

const auth = useAuth()
const form = reactive<HomepageMediaInput>({
  mode: 'image',
  version: 1,
  posterPath: null,
  videoPath: null,
  posterFile: null,
  videoFile: null,
})
const saved = shallowRef({ ...form })
const current = shallowRef<HomepageMedia>(defaultHomepageMedia)
const busy = ref(false)
const progress = ref<MediaProgress | null>(null)
const error = ref('')
const message = ref('')
const preparationNote = ref('')
const cleanupPending = ref(false)
let active = true
const dirty = computed(() =>
  (Object.keys(form) as (keyof HomepageMediaInput)[]).some((key) => form[key] !== saved.value[key]),
)
function apply(settings: HomepageMedia) {
  current.value = settings
  Object.assign(form, {
    mode: settings.mode,
    version: settings.version,
    posterPath: settings.poster_path,
    videoPath: settings.video_path,
    posterFile: null,
    videoFile: null,
  })
  saved.value = { ...form }
}
const { isLoading, hasError, reload } = useAsyncData(async () => {
  const settings = await homepageMediaService.read()
  if (active) apply(settings)
  return settings
}, defaultHomepageMedia)
const posterPreviews = useMediaPreviews(() => (form.posterFile ? [form.posterFile] : []))
const videoPreviews = useMediaPreviews(() => (form.videoFile ? [form.videoFile] : []))
const poster = computed(
  () =>
    posterPreviews.value[0]?.url ??
    (form.posterPath ? current.value.posterUrl : defaultHomepageMedia.posterUrl),
)
const video = computed(
  () => videoPreviews.value[0]?.url ?? (form.videoPath ? current.value.videoUrl : null),
)
async function selectFile(event: Event, kind: 'poster' | 'video') {
  if (busy.value) return
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  error.value = ''
  message.value = ''
  const invalid = validateMediaFile(file, kind === 'poster' ? 'image' : 'video', true)
  if (invalid || (kind === 'video' && file.size > HOMEPAGE_VIDEO_MAX_BYTES)) {
    error.value = invalid || 'Açılış videosu en fazla 20 MB olabilir.'
    return
  }
  if (kind === 'video') {
    form.videoFile = file
    return
  }
  busy.value = true
  progress.value = { stage: 'preparing', completed: 0, total: 1, filename: file.name }
  try {
    const result = await optimizeImage(file, 'photo')
    if (!active) return
    if (validateMediaFile(result.file, 'image'))
      throw new Error('Kapak görseli 10 MB altına hazırlanamadı. Daha küçük bir görsel seçin.')
    form.posterFile = result.file
    preparationNote.value = `${(file.size / 1024 / 1024).toFixed(2)} MB → ${(result.file.size / 1024 / 1024).toFixed(2)} MB · ${result.note}`
  } catch (reason) {
    if (active) error.value = reason instanceof Error ? reason.message : 'Görsel hazırlanamadı.'
  } finally {
    if (active) {
      busy.value = false
      progress.value = null
    }
  }
}
function removePoster() {
  form.posterFile = null
  form.posterPath = null
  preparationNote.value = ''
}
function removeVideo() {
  form.videoFile = null
  form.videoPath = null
}
async function save() {
  if (busy.value || isLoading.value || hasError.value || !auth.isAuthenticated.value) return
  busy.value = true
  error.value = ''
  message.value = ''
  progress.value = { stage: 'checking', completed: 0, total: 0 }
  try {
    const result = await homepageMediaService.save({ ...form }, (value) => {
      if (active) progress.value = value
    })
    if (!active) return
    apply(result.settings)
    cleanupPending.value = result.cleanupPending
    message.value = 'Ana sayfa güncellendi.'
    preparationNote.value = ''
  } catch (reason) {
    if (active) error.value = reason instanceof Error ? reason.message : 'Kayıt tamamlanamadı.'
  } finally {
    if (active) {
      busy.value = false
      progress.value = null
    }
  }
}
async function cleanup() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  message.value = ''
  progress.value = { stage: 'cleanup', completed: 0, total: 0 }
  try {
    const remaining = await homepageMediaService.cleanup()
    if (active) {
      cleanupPending.value = remaining > 0
      message.value = remaining
        ? 'Temizlenecek dosyalar kaldı; işlemi tekrarlayabilirsiniz.'
        : 'Eski ana sayfa dosyaları temizlendi.'
    }
  } catch {
    if (active) {
      cleanupPending.value = true
      error.value = 'Temizlik tamamlanamadı; tekrar deneyebilirsiniz.'
    }
  } finally {
    if (active) {
      busy.value = false
      progress.value = null
    }
  }
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value || busy.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
onBeforeRouteLeave(
  () =>
    !auth.isAuthenticated.value ||
    (!dirty.value && !busy.value) ||
    window.confirm(
      'Kaydedilmemiş değişiklikler veya devam eden bir işlem var. Ayrılmak istiyor musunuz?',
    ),
)
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => {
  active = false
  window.removeEventListener('beforeunload', beforeUnload)
})
</script>
<template>
  <section class="admin-panel homepage-editor">
    <header class="admin-page-heading">
      <div>
        <p class="admin-eyebrow">İçerik yönetimi</p>
        <h1>Ana sayfa</h1>
        <p class="muted">Açılış fotoğrafını, videosunu ve video kapağını yönetin.</p>
      </div>
      <RouterLink to="/" target="_blank" class="admin-button secondary"
        >Ana sayfayı aç ↗</RouterLink
      >
    </header>
    <AsyncState
      :loading="isLoading"
      :error="hasError"
      loading-text="Ana sayfa ayarları yükleniyor…"
      error-text="Ana sayfa ayarları yüklenemedi. ana-sayfa-medya-kurulumu.sql dosyasını Supabase'de çalıştırıp tekrar deneyin."
      @retry="reload"
    />
    <form v-if="!isLoading && !hasError" @submit.prevent="save" :aria-busy="busy">
      <fieldset :disabled="busy">
        <legend>Açılış medyası</legend>
        <div class="form-group">
          <label for="homepage-mode">Gösterim türü</label
          ><select id="homepage-mode" v-model="form.mode">
            <option value="image">Fotoğraf</option>
            <option value="video">Video (Storage)</option>
          </select>
        </div>
        <p class="file-info">
          Fotoğraf modunda kayıt yapılırsa önceki açılış videosu kaldırılır. Video modu masaüstünde
          sessiz oynar; mobilde ve hareket azaltma tercihinde oynatmak ziyaretçinin seçimine
          bırakılır.
        </p>
        <div class="form-group">
          <label for="homepage-poster">Fotoğraf / video kapak görseli</label
          ><input
            id="homepage-poster"
            type="file"
            :accept="IMAGE_ACCEPT"
            @change="selectFile($event, 'poster')"
          />
          <p class="file-info">
            100 MB'a kadar kaynak görsel seçilebilir; yükleme için en fazla 10 MB'a hazırlanır.
            Dosya seçmezseniz mevcut kapak korunur.
          </p>
          <p v-if="preparationNote" class="file-info">{{ preparationNote }}</p>
          <button
            v-if="form.posterFile || form.posterPath"
            type="button"
            class="text-button"
            @click="removePoster"
          >
            Varsayılan fotoğrafa dön
          </button>
        </div>
        <div v-if="form.mode === 'video'" class="form-group">
          <label for="homepage-video">Açılış videosu</label
          ><input
            id="homepage-video"
            type="file"
            :accept="VIDEO_ACCEPT"
            @change="selectFile($event, 'video')"
          />
          <p class="file-info">
            MP4 veya WebM, en fazla 20 MB. Kısa (8–15 saniye), sıkıştırılmış bir kurgu önerilir. Bu
            alanda video sıkıştırması yapılmaz.
          </p>
          <p v-if="form.videoFile" class="file-info">
            {{ form.videoFile.name }} · {{ (form.videoFile.size / 1024 / 1024).toFixed(2) }} MB
          </p>
          <button v-if="video" type="button" class="text-button" @click="removeVideo">
            Videoyu kaldır
          </button>
        </div>
        <div class="homepage-preview">
          <video
            v-if="form.mode === 'video' && video"
            :src="video"
            :poster="poster"
            controls
            playsinline
            preload="none"
          ></video
          ><img v-else :src="poster" alt="Ana sayfa kapak önizlemesi" />
        </div>
        <p class="file-info">
          Önizlemede dosyanın tamamı gösterilir; ana sayfada ekran oranına göre kenarlardan
          kırpılabilir.
        </p>
      </fieldset>
      <p v-if="error" class="admin-notice error" role="alert">{{ error }}</p>
      <p v-if="message" class="admin-notice success" role="status">{{ message }}</p>
      <p v-if="cleanupPending" class="admin-notice">
        Ana sayfa kaydedildi; eski dosyaların temizliğini yeniden deneyebilirsiniz.
      </p>
      <div class="homepage-actions">
        <MediaProgressStatus v-if="progress" :progress="progress" subject="Ana sayfa" />
        <div>
          <button class="admin-button secondary" type="button" :disabled="busy" @click="cleanup">
            Eski dosyaları temizle</button
          ><button class="admin-button" type="submit" :disabled="busy">
            {{ busy ? 'İşlem sürüyor…' : 'Değişiklikleri kaydet' }}
          </button>
        </div>
      </div>
    </form>
  </section>
</template>
<style scoped>
.homepage-editor {
  max-width: 1000px;
}
fieldset {
  margin: 0;
  padding: 24px;
  border: 1px solid #dce5e7;
  border-radius: 12px;
  background: #fff;
  display: grid;
  gap: 16px;
  min-width: 0;
}
legend {
  padding: 0 8px;
  font-weight: 600;
}
.homepage-preview {
  background: #edf1ee;
}
.homepage-preview img,
.homepage-preview video {
  width: 100%;
  max-height: 360px;
  object-fit: contain;
}
.homepage-actions {
  position: sticky;
  bottom: 0;
  background: #fff;
  padding: 16px;
  border-top: 1px solid #dce5e7;
  display: grid;
  gap: 12px;
  margin-top: 20px;
}
.homepage-actions > div:last-child {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
