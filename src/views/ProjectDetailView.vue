<script setup lang="ts">
import { PROJECT_STATUS_LABELS } from '../constants/projectStatuses'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import ProjectVideo from '../components/ui/ProjectVideo.vue'
import ImageViewer from '../components/ui/ImageViewer.vue'
import AsyncState from '../components/ui/AsyncState.vue'
import { useAsyncData } from '../composables/useAsyncData'
import { getProjectBySlug } from '../services/projectService'

const route = useRoute()
const {
  data: project,
  isLoading,
  hasError,
  reload,
} = useAsyncData(() => {
  const slug = route.params.slug
  return typeof slug === 'string' ? getProjectBySlug(slug) : Promise.resolve(null)
}, null)
const galleryViewer = ref<InstanceType<typeof ImageViewer> | null>(null)
const designs = computed(
  () =>
    project.value?.gallery.map((url, index) => {
      const media = project.value?.media.find((item) => item.kind === 'gallery' && item.url === url)
      return {
        url,
        title: media?.title || `Tasarım ${index + 1}`,
        description: media?.description ?? '',
      }
    }) ?? [],
)
const videoHero = computed(
  () => project.value?.heroMedia === 'youtube' && Boolean(project.value.youtubeVideoId),
)
const imageDialog = ref<HTMLDialogElement | null>(null)
let previousOverflow: string | null = null

function restoreScroll() {
  if (previousOverflow !== null) {
    document.body.style.overflow = previousOverflow
    previousOverflow = null
  }
}

function openImage() {
  if (!imageDialog.value || imageDialog.value.open) return
  imageDialog.value.showModal()
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

function closeImage() {
  imageDialog.value?.close()
  restoreScroll()
}

watch(
  () => route.params.slug,
  () => {
    closeImage()
    galleryViewer.value?.close()
    void reload()
  },
)
onBeforeUnmount(closeImage)
</script>

<template>
  <section v-if="isLoading || hasError" class="project-detail-page">
    <div class="section-container">
      <h1>Proje Detayı</h1>
      <AsyncState
        :loading="isLoading"
        :error="hasError"
        loading-text="Proje yükleniyor…"
        error-text="Proje bilgileri yüklenemedi."
        @retry="reload"
      />
      <RouterLink to="/projeler" class="project-back-link">← Projelere dön</RouterLink>
    </div>
  </section>
  <section v-else-if="project" class="project-detail-page">
    <div class="section-container">
      <RouterLink to="/projeler" class="project-back-link">
        <span aria-hidden="true">←</span> Tüm projeler
      </RouterLink>

      <div class="project-detail-layout">
        <div class="project-detail-header">
          <p class="section-kicker">
            {{ project.categories.map((category) => category.name).join(' · ') }}
          </p>
          <h1>{{ project.title }}</h1>
          <p class="project-detail-description">{{ project.description }}</p>
        </div>

        <div class="project-detail-visual">
          <dl class="project-meta">
            <div class="project-meta-item">
              <dt>Konum</dt>
              <dd>{{ project.location }}</dd>
            </div>
            <div class="project-meta-item">
              <dt>Yıl</dt>
              <dd>{{ project.year }}</dd>
            </div>
            <div class="project-meta-item">
              <dt>Durum</dt>
              <dd>
                <span class="project-status">{{ PROJECT_STATUS_LABELS[project.status] }}</span>
              </dd>
            </div>
            <div class="project-meta-item">
              <dt>Kategori</dt>
              <dd>{{ project.categories.map((category) => category.name).join(' · ') }}</dd>
            </div>
          </dl>

          <ProjectVideo
            v-if="videoHero"
            eager
            :youtube-id="project.youtubeVideoId"
            :title="project.title"
          />
          <figure v-else class="project-detail-image">
            <button
              type="button"
              class="project-image-trigger"
              :aria-label="`${project.title} görselini büyüt`"
              aria-haspopup="dialog"
              @click="openImage"
            >
              <img :src="project.image" :alt="project.title" />
              <span class="project-image-zoom" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path
                    d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"
                  />
                </svg>
              </span>
            </button>
            <figcaption>
              <span>Proje görseli</span>
              <span>Büyütmek için görsele tıklayın</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </div>

    <section
      v-if="designs.length"
      class="section-container design-gallery"
      aria-labelledby="design-gallery-title"
    >
      <h2 id="design-gallery-title">Tasarım galerisi</h2>
      <div class="design-gallery-grid">
        <figure v-for="item in designs" :key="item.url">
          <button
            type="button"
            :aria-label="`${item.title} görselini büyüt`"
            @click="galleryViewer?.open(item)"
          >
            <img :src="item.url" :alt="item.title" loading="lazy" />
          </button>
          <figcaption>
            <h3>{{ item.title }}</h3>
            <p v-if="item.description">{{ item.description }}</p>
          </figcaption>
        </figure>
      </div>
    </section>
    <section
      v-if="!videoHero && (project.youtubeVideoId || project.videoUrl)"
      class="section-container design-gallery"
      aria-labelledby="project-video-heading"
    >
      <h2 id="project-video-heading">Proje videosu</h2>
      <ProjectVideo
        :youtube-id="project.youtubeVideoId"
        :url="project.videoUrl"
        :poster="project.image"
        :title="project.title"
      />
    </section>
    <ImageViewer ref="galleryViewer" />
    <dialog
      ref="imageDialog"
      class="project-lightbox"
      aria-labelledby="project-lightbox-title"
      @click="closeImage"
      @close="restoreScroll"
      @cancel.prevent="closeImage"
    >
      <div class="project-lightbox-content" @click.stop>
        <div class="project-lightbox-toolbar">
          <h2 id="project-lightbox-title">{{ project.title }}</h2>
          <button type="button" autofocus aria-label="Görseli kapat" @click="closeImage">
            Kapat <span aria-hidden="true">×</span>
          </button>
        </div>
        <img :src="project.image" :alt="project.title" />
      </div>
    </dialog>
  </section>

  <section v-else class="project-detail-page">
    <div class="section-container">
      <h1>Proje bulunamadı</h1>
      <RouterLink to="/projeler" class="project-back-link">← Projelere dön</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.design-gallery {
  margin-top: 36px;
}
.design-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: 24px;
}
.design-gallery figure {
  margin: 0;
  min-width: 0;
}
.design-gallery button {
  width: 100%;
  border: 1px solid #ddd;
  padding: 10px;
  background: #f0efe9;
  border-radius: 8px;
  cursor: zoom-in;
}
.design-gallery img {
  width: 100%;
  height: 200px;
  object-fit: contain;
}
.design-gallery h3 {
  font-size: 17px;
  margin: 12px 0 6px;
  overflow-wrap: anywhere;
}
.design-gallery p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.6;
}

.project-detail-page {
  padding: 40px 0 64px;
  background: #faf9f6;
}

.project-back-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 40px;
  color: var(--color-text-secondary);
  font-size: 14px;
  text-decoration: none;
}

.project-back-link:hover {
  color: var(--color-text);
}

.project-detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  align-items: center;
  gap: 48px;
}

.project-detail-header,
.project-detail-visual {
  min-width: 0;
}

.section-kicker {
  margin: 0 0 14px;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.project-detail-page h1 {
  margin: 0;
  color: var(--color-text);
  font-size: clamp(34px, 4vw, 54px);
  line-height: 1.08;
  letter-spacing: -1.8px;
}

.project-detail-description {
  margin: 24px 0 0;
  color: var(--color-text-secondary);
  font-size: 16px;
  line-height: 1.8;
}

.project-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 1.4fr);
  gap: 16px;
  margin: 0 0 24px;
  padding: 20px 0;
  border-block: 1px solid var(--color-border);
}

.project-meta-item dt {
  margin-bottom: 10px;
  color: var(--color-text-muted);
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.project-meta-item dd {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}

.project-status {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  background: #e9eddf;
  color: #49553b;
}

.project-detail-image {
  min-width: 0;
  margin: 0;
}

.project-image-trigger {
  position: relative;
  display: block;
  width: 100%;
  padding: 14px;
  overflow: hidden;
  border: 1px solid #e4e3dc;
  border-radius: 16px;
  background: #f0efe9;
  box-shadow: 0 16px 40px -24px #20231f4d;
  cursor: zoom-in;
}

.project-image-trigger img {
  width: 100%;
  height: auto;
  max-height: 420px;
  object-fit: contain;
  border-radius: 6px;
}

.project-image-zoom {
  position: absolute;
  right: 26px;
  bottom: 26px;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-light);
  color: var(--color-dark);
  box-shadow: 0 2px 12px #0002;
  transition: transform 0.2s ease;
}

.project-image-zoom svg {
  width: 18px;
  height: 18px;
}

.project-image-trigger:hover .project-image-zoom {
  transform: scale(1.08);
}

.project-detail-image figcaption {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.project-detail-image figcaption span:first-child {
  color: var(--color-text);
  font-weight: 600;
}

.project-lightbox {
  width: 100%;
  max-width: none;
  height: 100%;
  max-height: none;
  margin: 0;
  padding: 24px;
  border: 0;
  background: transparent;
  color: var(--color-light);
}

.project-lightbox[open] {
  display: grid;
  place-items: center;
}

.project-lightbox::backdrop {
  background: #0f120ff0;
}

.project-lightbox-content {
  width: min(1400px, 100%);
  min-width: 0;
}

.project-lightbox-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.project-lightbox-toolbar h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.project-lightbox-toolbar button {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid #ffffff50;
  border-radius: 24px;
  background: #ffffff12;
  color: var(--color-light);
  cursor: pointer;
}

.project-lightbox-toolbar button span {
  font-size: 24px;
}

.project-lightbox-content > img {
  width: 100%;
  height: auto;
  max-height: calc(100dvh - 140px);
  object-fit: contain;
}

.project-image-trigger:focus-visible,
.project-back-link:focus-visible {
  outline: 3px solid #677b50;
  outline-offset: 5px;
}

.project-lightbox button:focus-visible {
  outline: 2px solid white;
  outline-offset: 4px;
}

@media (max-width: 800px) {
  .project-detail-page {
    padding: 28px 0 48px;
  }

  .project-back-link {
    margin-bottom: 32px;
  }

  .project-detail-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 32px;
  }

  .project-image-trigger img {
    max-height: 340px;
  }

  .project-lightbox {
    padding: 16px;
  }
}

@media (max-width: 500px) {
  .project-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .project-image-zoom {
    transition: none;
  }
}
</style>
