<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ProjectCard from '../components/projects/ProjectCard.vue'
import CategorySidebar from '../components/projects/CategorySidebar.vue'

import AsyncState from '../components/ui/AsyncState.vue'
import { useAsyncData } from '../composables/useAsyncData'
import { listProjects } from '../services/projectService'
import { listCategories } from '../services/categoryService'
import type { Project } from '../types/Project'
import type { Category, CategoryFilterItem } from '../types/Category'

const { data, isLoading, hasError, reload } = useAsyncData(
  async () => {
    const [projects, categories] = await Promise.all([listProjects(), listCategories()])
    return { projects, categories }
  },
  { projects: [] as Project[], categories: [] as Category[] },
)
const projects = computed(() => data.value.projects)
const categories = computed(() => data.value.categories)

const route = useRoute()
const router = useRouter()
const search = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''))
const selectedCategory = computed<number | 'all'>(() => {
  const value = route.query.category
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return 'all'
  const id = Number(value)
  return categories.value.some((category) => category.id === id) ? id : 'all'
})
const hasFilters = computed(() => Boolean(search.value) || selectedCategory.value !== 'all')
const normalizeSearch = (value: string) => value.normalize('NFC').toLocaleLowerCase('tr-TR')

const categoryFilters = computed<CategoryFilterItem[]>(() => {
  const counts = new Map<number, number>()

  for (const project of projects.value) {
    for (const id of project.categoryIds) counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  return categories.value.map((category) => ({
    ...category,
    projectCount: counts.get(category.id) ?? 0,
  }))
})

const filteredProjects = computed(() => {
  const query = normalizeSearch(search.value)
  return projects.value.filter(
    (project) =>
      (selectedCategory.value === 'all' || project.categoryIds.includes(selectedCategory.value)) &&
      normalizeSearch(project.title).includes(query),
  )
})
function updateFilters(query: string, category: number | 'all') {
  return router.push({
    path: route.path,
    hash: route.hash,
    query: {
      ...route.query,
      q: query.trim() || undefined,
      category: category === 'all' ? undefined : String(category),
    },
  })
}
function changeCategory(category: number | 'all') {
  void updateFilters(search.value, category)
}
function changeSearch(query: string) {
  void updateFilters(query, selectedCategory.value)
}
function clearFilters() {
  void updateFilters('', 'all')
}
</script>

<template>
  <section class="projects-page">
    <div class="section-container">
      <!-- Sayfa başlığı -->
      <div class="projects-page-header">
        <p class="section-kicker">Portföy</p>

        <h1>Projeler</h1>

        <p class="projects-page-description">
          Mimari tasarım, 3D görselleştirme ve animasyon çalışmalarımızı sistem kategorilerine göre
          inceleyebilirsiniz.
        </p>
      </div>

      <!-- Sol kategori paneli + projeler -->
      <AsyncState
        :loading="isLoading"
        :error="hasError"
        :empty="projects.length === 0"
        loading-text="Projeler ve kategoriler yükleniyor…"
        error-text="Proje listesi yüklenemedi."
        empty-text="Henüz yayımlanmış proje bulunmuyor."
        @retry="reload"
      />
      <div v-if="!isLoading && !hasError && projects.length" class="projects-layout">
        <CategorySidebar
          :selected-category="selectedCategory"
          :search="search"
          @search="changeSearch"
          :categories="categoryFilters"
          :total-projects="projects.length"
          @change="changeCategory"
        />

        <div class="projects-main">
          <div class="projects-results">
            <p role="status" aria-live="polite" aria-atomic="true">
              {{ filteredProjects.length }} proje bulundu<span v-if="search">
                · “{{ search }}”</span
              >
            </p>
            <button v-if="hasFilters" type="button" @click="clearFilters">
              Filtreleri temizle
            </button>
          </div>
          <div v-if="filteredProjects.length > 0" class="project-grid">
            <ProjectCard
              v-for="project in filteredProjects"
              :key="project.id"
              :title="project.title"
              :slug="project.slug"
              :category="project.categories.map((category) => category.name).join(' · ')"
              :image="project.image"
            />
          </div>

          <div v-else class="projects-empty">
            <h3>Aramanıza uygun proje bulunamadı.</h3>
            <p>Başka bir proje adı deneyin veya filtreleri temizleyerek tüm projeleri inceleyin.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.projects-page {
  padding: 90px 24px 110px;
  background: var(--color-background);
}

.projects-page-header {
  max-width: 760px;
  margin-bottom: 50px;
}

.projects-page-header h1 {
  margin: 0;

  color: var(--color-text);

  font-size: clamp(42px, 6vw, 72px);
  line-height: 1;
  letter-spacing: -2px;
}

.projects-page-description {
  max-width: 680px;

  margin-top: 24px;
  margin-bottom: 0;

  color: var(--color-text-secondary);

  font-size: 17px;
  line-height: 1.7;
}

.projects-layout {
  display: flex;
  align-items: flex-start;

  gap: 50px;
}

.projects-main {
  flex: 1;
  min-width: 0;
}

.projects-results {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}
.projects-results p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
  overflow-wrap: anywhere;
  min-width: 0;
}
.projects-results button {
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
}
.projects-results button:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 3px;
}
.project-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  gap: 24px;
}

.projects-empty {
  padding: 60px 30px;

  border: 1px solid var(--color-border-light);

  background: #fafafa;
}

.projects-empty h3 {
  margin: 0 0 12px;

  color: var(--color-text);

  font-size: 20px;
}

.projects-empty p {
  margin: 0;

  color: #777777;

  line-height: 1.6;
}

@media (max-width: 900px) {
  .projects-layout {
    flex-direction: column;
  }

  .projects-main {
    width: 100%;
  }

  .project-grid {
    grid-template-columns: 1fr;
  }
}
</style>
