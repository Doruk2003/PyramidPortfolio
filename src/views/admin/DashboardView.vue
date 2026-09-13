<script setup lang="ts">
import { PROJECT_STATUS_LABELS } from '../../constants/projectStatuses'
import { computed } from 'vue'

import AsyncState from '../../components/ui/AsyncState.vue'
import { useAsyncData } from '../../composables/useAsyncData'
import { listProjects } from '../../services/projectService'
import { listCategories } from '../../services/categoryService'
import type { Project } from '../../types/Project'
import type { Category } from '../../types/Category'

const { data, isLoading, hasError, reload } = useAsyncData(
  async () => {
    const [projects, categories] = await Promise.all([listProjects(), listCategories()])
    return { projects, categories }
  },
  { projects: [] as Project[], categories: [] as Category[] },
)
const projects = computed(() => data.value.projects)
const categories = computed(() => data.value.categories)

const totalProjects = computed(() => projects.value.length)

const totalCategories = computed(() => categories.value.length)

const totalImages = computed(() => {
  return projects.value.reduce((total, project) => {
    return total + 1 + project.gallery.length + project.applicationImages.length
  }, 0)
})

const totalVideos = computed(() => {
  return projects.value.filter(
    (project) => project.youtubeVideoId || (project.videoUrl && project.videoUrl.trim() !== ''),
  ).length
})
</script>
<template>
  <section class="admin-panel dashboard-overview">
    <header class="admin-page-heading">
      <div>
        <p class="admin-eyebrow">PYRAMID ADMIN</p>
        <h1>Genel bakış</h1>
        <p class="muted">Portföyünüzün güncel durumu ve son projeleriniz.</p>
      </div>
      <RouterLink class="admin-button" :to="{ name: 'admin-project-new' }">+ Yeni proje</RouterLink>
    </header>
    <AsyncState
      :loading="isLoading"
      :error="hasError"
      :empty="!projects.length"
      loading-text="Yönetim özeti yükleniyor…"
      error-text="Yönetim özeti yüklenemedi."
      empty-text="Portföyünüz hazır. İlk projenizi ekleyerek başlayın."
      @retry="reload"
    />
    <template v-if="!isLoading && !hasError">
      <div class="admin-stat-grid">
        <article class="admin-stat">
          <span>Toplam proje</span><strong>{{ totalProjects }}</strong>
        </article>
        <article class="admin-stat">
          <span>Sistem kategorisi</span><strong>{{ totalCategories }}</strong>
        </article>
        <article class="admin-stat">
          <span>Görsel</span><strong>{{ totalImages }}</strong>
        </article>
        <article class="admin-stat">
          <span>Video</span><strong>{{ totalVideos }}</strong>
        </article>
      </div>
      <div class="list-summary">
        <h2>Son projeler</h2>
        <RouterLink class="admin-button secondary" :to="{ name: 'admin-projects' }"
          >Tüm projeler →</RouterLink
        >
      </div>
      <div class="admin-card-grid">
        <article
          v-for="project in [...projects]
            .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '') || b.id - a.id)
            .slice(0, 6)"
          :key="project.id"
          class="admin-card recent-project"
        >
          <img :src="project.image" :alt="project.title" loading="lazy" /><span
            class="admin-status"
            :class="project.status"
            >{{ PROJECT_STATUS_LABELS[project.status] }}</span
          >
          <h2>{{ project.title }}</h2>
          <p class="muted">{{ project.categories.map((category) => category.name).join(' · ') }}</p>
          <RouterLink
            class="admin-button secondary"
            :to="{ name: 'admin-project-edit', params: { id: project.id } }"
            >Projeyi düzenle →</RouterLink
          >
        </article>
      </div>
    </template>
  </section>
</template>
<style scoped>
.list-summary h2 {
  margin: 0;
  color: #203840;
  font-size: 18px;
}
.dashboard-overview .admin-page-heading {
  margin-bottom: 16px;
}
.dashboard-overview .admin-page-heading h1 {
  font-size: 28px;
}
.dashboard-overview .admin-stat-grid {
  gap: 12px;
  margin-bottom: 16px;
}
.dashboard-overview .admin-stat {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.dashboard-overview .admin-stat strong {
  margin: 0;
  font-size: 26px;
}
.dashboard-overview .admin-card-grid {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 270px), 340px));
  gap: 14px;
}
.recent-project {
  padding: 14px;
  min-width: 0;
}
.recent-project > img {
  display: block;
  width: 100%;
  height: clamp(110px, 20vh, 160px);
  object-fit: contain;
  background: #f3f6f7;
  border-radius: 6px;
  margin-bottom: 10px;
}
.recent-project h2 {
  margin: 10px 0 6px;
  font-size: 16px;
  overflow-wrap: anywhere;
}
.recent-project p {
  margin: 0 0 10px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
@media (min-width: 761px) {
  .dashboard-overview .admin-stat-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .dashboard-overview .admin-card-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
