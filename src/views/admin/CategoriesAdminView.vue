<script setup lang="ts">
import AsyncState from '../../components/ui/AsyncState.vue'
import { useAsyncData } from '../../composables/useAsyncData'
import { listProjects } from '../../services/projectService'
import { listCategories } from '../../services/categoryService'
const { data, isLoading, hasError, reload } = useAsyncData(async () => {
  const [projects, categories] = await Promise.all([listProjects(), listCategories()])
  return categories.map((category) => ({
    ...category,
    count: projects.filter((project) => project.categoryIds.includes(category.id)).length,
  }))
}, [])
</script>
<template>
  <section class="admin-panel">
    <header class="admin-page-heading">
      <div>
        <p class="admin-eyebrow">KATEGORİLER</p>
        <h1>Sistemler</h1>
        <p class="muted">
          Bir proje birden fazla sistemde yer alabilir. Sistem seçimini proje formundan yapın.
        </p>
      </div>
    </header>
    <AsyncState
      :loading="isLoading"
      :error="hasError"
      :empty="!data.length"
      error-text="Sistemler yüklenemedi."
      empty-text="Henüz sistem kategorisi yok."
      @retry="reload"
    />
    <div v-if="!isLoading && !hasError" class="admin-card-grid">
      <article v-for="category in data" :key="category.id" class="admin-card">
        <h2>{{ category.name }}</h2>
        <p class="muted">{{ category.count }} proje</p>
        <RouterLink
          class="admin-button secondary"
          :to="{ name: 'admin-projects', query: { category: String(category.id) } }"
          >Projeleri görüntüle →</RouterLink
        >
      </article>
    </div>
  </section>
</template>
