<script setup lang="ts">
import type { Project } from '../../types/Project'

defineProps<Pick<Project, 'title' | 'image' | 'slug'> & { category: string }>()
</script>

<template>
  <RouterLink :to="`/projeler/${slug}`" class="project-card-link">
    <article class="project-card">
      <div class="project-image" :style="{ backgroundImage: `url(${image})` }"></div>

      <div class="project-info">
        <p class="project-category">
          {{ category }}
        </p>

        <h3>
          {{ title }}
        </h3>
      </div>
    </article>
  </RouterLink>
</template>

<style scoped>
.project-card-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.project-card {
  overflow: hidden;
  background: var(--color-surface);
}

.project-image {
  aspect-ratio: 4 / 3;
  background-size: cover;
  background-position: center;
  transition: transform 0.4s ease;
}

.project-card:hover .project-image {
  transform: scale(1.04);
}

.project-info {
  padding: 22px;
}

.project-category {
  margin: 0 0 8px;

  color: var(--color-text-muted);

  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.project-info h3 {
  margin: 0;

  color: var(--color-text);

  font-size: 21px;
}
</style>
