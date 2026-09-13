<script setup lang="ts">
import { computed } from 'vue'
import { youtubeVideoId } from '../../../validation/youtube'
import ProjectVideo from '../../ui/ProjectVideo.vue'
import DesignGalleryEditor from './DesignGalleryEditor.vue'
import { IMAGE_ACCEPT, VIDEO_ACCEPT } from '../../../constants/projectFormRules'
import type { MediaPreview, ProjectFormData, ProjectFormErrors } from '../../../types/ProjectForm'

const props = defineProps<{
  preparation: { name: string; originalBytes: number; bytes: number; note: string }[]
  errors: ProjectFormErrors
  form: ProjectFormData

  mainImagePreview: string

  galleryPreviews: MediaPreview[]
  applicationPreviews: MediaPreview[]
}>()

const youtubeId = computed(() => youtubeVideoId(props.form.youtubeUrl ?? '') ?? undefined)
const emit = defineEmits<{
  'main-image-change': [event: Event]
  'gallery-images-change': [event: Event]
  'application-images-change': [event: Event]
  'video-change': [event: Event]
  'remove-media': [
    field: 'imageFile' | 'videoFile' | 'galleryFiles' | 'applicationFiles',
    index?: number,
  ]
}>()
</script>

<template>
  <div class="form-section">
    <h2>Medya</h2>
    <div class="form-group">
      <label for="hero-media">Proje açılışında göster</label>
      <select
        id="hero-media"
        v-model="form.heroMedia"
        :aria-invalid="Boolean(errors.heroMedia)"
        :aria-describedby="errors.heroMedia ? 'hero-media-error' : 'hero-media-help'"
      >
        <option value="image">Ana fotoğraf</option>
        <option value="youtube">YouTube videosu</option>
      </select>
      <p id="hero-media-help" class="file-info">
        Proje detayının üst alanını belirler. Ana fotoğraf, proje listelerindeki kapak olarak
        kullanılmaya devam eder. Video seçerseniz aşağıdan YouTube bağlantısını girin.
      </p>
      <p v-if="errors.heroMedia" id="hero-media-error" class="form-error" role="alert">
        {{ errors.heroMedia }}
      </p>
    </div>
    <p class="file-info">
      Görseller: JPEG, PNG veya WebP. Kaynak dosya en fazla 100 MB; yüklemeden önce 10 MB altına
      otomatik hazırlanır. Her galeride en fazla 12 görsel. Video: MP4 veya WebM, en fazla 100 MB.
      Toplam medya: en fazla 150 MB. Yeni galeri seçimleri mevcut görsellere eklenir.
    </p>

    <p class="file-info">
      Fotoğraflar gerektiğinde en uzun kenarı 2560 piksele küçültülür. Büyük tasarımlar yükleme
      sınırına ulaşmak için kademeli küçültülebilir. PNG önce PNG olarak denenir; büyük dosyalarda
      şeffaflığı destekleyen WebP formatına geçilebilir. İnce yazıları kaydetmeden önce önizlemede
      kontrol edin. Bilgisayarınızdaki özgün dosyalar değişmez.
    </p>
    <ul v-if="preparation.length" class="file-info" aria-label="Hazırlanan görsel boyutları">
      <li v-for="(item, index) in preparation" :key="index">
        {{ item.name }}: {{ (item.originalBytes / 1024 / 1024).toFixed(2) }} MB →
        {{ (item.bytes / 1024 / 1024).toFixed(2) }} MB ({{
          Math.round((1 - item.bytes / item.originalBytes) * 100)
        }}% küçülme).
        {{ item.note }}
      </li>
    </ul>
    <div
      v-if="form.retainedMedia.some((item) => item.kind !== 'main' && item.kind !== 'gallery')"
      class="media-preview-grid saved-media"
    >
      <div
        v-for="item in form.retainedMedia.filter(
          (item) => item.kind !== 'main' && item.kind !== 'gallery',
        )"
        :key="item.objectPath"
        class="media-preview-item"
      >
        <a v-if="item.kind === 'video'" :href="item.url" target="_blank" rel="noopener"
          >Mevcut videoyu aç ↗</a
        >
        <img
          v-else
          :src="item.url"
          :alt="item.kind === 'gallery' ? 'Kayıtlı galeri görseli' : 'Kayıtlı uygulama görseli'"
          loading="lazy"
        />
        <span>{{
          item.kind === 'gallery' ? 'Galeri' : item.kind === 'application' ? 'Uygulama' : 'Video'
        }}</span>
        <button
          type="button"
          class="remove-media-button"
          @click="
            form.retainedMedia = form.retainedMedia.filter(
              (media) => media.objectPath !== item.objectPath,
            )
          "
        >
          Projeden kaldır
        </button>
      </div>
    </div>
    <div class="form-grid">
      <div class="form-group full-width">
        <label for="main-image"> Ana Görsel </label>

        <input
          id="main-image"
          :aria-invalid="Boolean(errors.imageFile)"
          :aria-describedby="errors.imageFile ? 'main-image-error' : undefined"
          type="file"
          :accept="IMAGE_ACCEPT"
          @change="emit('main-image-change', $event)"
        />
        <p v-if="errors.imageFile" id="main-image-error" class="form-error" role="alert">
          {{ errors.imageFile }}
        </p>

        <button
          v-if="form.imageFile || form.retainedMedia.some((item) => item.kind === 'main')"
          type="button"
          class="remove-media-button"
          @click="emit('remove-media', 'imageFile')"
        >
          Ana görseli kaldır
        </button>
        <span v-if="form.imageFile" class="file-info">
          {{ form.imageFile.name }}
        </span>

        <div v-if="mainImagePreview" class="media-preview">
          <img :src="mainImagePreview" alt="Ana görsel önizleme" />
        </div>
      </div>

      <div class="form-group full-width">
        <label for="gallery-images"> 3D Render Galerisi </label>

        <input
          id="gallery-images"
          :aria-invalid="Boolean(errors.galleryFiles)"
          :aria-describedby="errors.galleryFiles ? 'gallery-images-error' : undefined"
          type="file"
          :accept="IMAGE_ACCEPT"
          multiple
          @change="emit('gallery-images-change', $event)"
        />
        <p v-if="errors.galleryFiles" id="gallery-images-error" class="form-error" role="alert">
          {{ errors.galleryFiles }}
        </p>

        <span v-if="form.galleryFiles.length" class="file-info">
          {{ form.galleryFiles.length }} görsel seçildi
        </span>

        <DesignGalleryEditor :form="form" />
      </div>

      <div class="form-group full-width">
        <label for="application-images"> Gerçek Uygulama Fotoğrafları </label>

        <input
          id="application-images"
          :aria-invalid="Boolean(errors.applicationFiles)"
          :aria-describedby="errors.applicationFiles ? 'application-images-error' : undefined"
          type="file"
          :accept="IMAGE_ACCEPT"
          multiple
          @change="emit('application-images-change', $event)"
        />
        <p
          v-if="errors.applicationFiles"
          id="application-images-error"
          class="form-error"
          role="alert"
        >
          {{ errors.applicationFiles }}
        </p>

        <span v-if="form.applicationFiles.length" class="file-info">
          {{ form.applicationFiles.length }} fotoğraf seçildi
        </span>

        <div v-if="applicationPreviews.length" class="media-preview-grid">
          <div
            v-for="(preview, index) in applicationPreviews"
            :key="preview.url"
            class="media-preview-item"
          >
            <img :src="preview.url" :alt="preview.name" />

            <span>
              {{ preview.name }}
            </span>
            <button
              type="button"
              class="remove-media-button"
              :aria-label="`${preview.name} görselini kaldır`"
              @click="emit('remove-media', 'applicationFiles', index)"
            >
              Kaldır
            </button>
          </div>
        </div>
      </div>

      <div class="form-group full-width">
        <label for="video-source">Mimari Animasyon / Video</label>
        <select id="video-source" v-model="form.videoSource">
          <option value="youtube">YouTube bağlantısı</option>
          <option value="storage">Dosya yükle (Storage)</option>
        </select>
        <template v-if="form.videoSource === 'youtube'">
          <label for="youtube-url">YouTube video bağlantısı (isteğe bağlı)</label>
          <input
            id="youtube-url"
            v-model="form.youtubeUrl"
            type="url"
            placeholder="https://www.youtube.com/watch?v=…"
            :aria-invalid="Boolean(errors.youtubeUrl)"
            :aria-describedby="errors.youtubeUrl ? 'youtube-error' : undefined"
          />
          <p v-if="errors.youtubeUrl" id="youtube-error" class="form-error" role="alert">
            {{ errors.youtubeUrl }}
          </p>
          <p class="file-info">
            Herkese açık veya liste dışı, yerleştirmeye izin verilen bir video kullanın. Videoyu
            kaldırmak için bağlantıyı boşaltın.
          </p>
          <ProjectVideo
            v-if="youtubeId"
            :key="youtubeId"
            :youtube-id="youtubeId"
            :poster="mainImagePreview"
            :title="form.title || 'Proje'"
          />
        </template>
        <template v-else>
          <input
            id="video"
            :aria-invalid="Boolean(errors.videoFile)"
            :aria-describedby="errors.videoFile ? 'video-error' : undefined"
            type="file"
            :accept="VIDEO_ACCEPT"
            @change="emit('video-change', $event)"
          />
          <p v-if="errors.videoFile" id="video-error" class="form-error" role="alert">
            {{ errors.videoFile }}
          </p>

          <button
            v-if="form.videoFile || form.retainedMedia.some((item) => item.kind === 'video')"
            type="button"
            class="remove-media-button"
            @click="emit('remove-media', 'videoFile')"
          >
            Videoyu kaldır
          </button>
          <span v-if="form.videoFile" class="file-info">
            {{ form.videoFile.name }}
          </span>
        </template>
      </div>
    </div>
  </div>
</template>
