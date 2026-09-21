<script setup lang="ts">
import { ref, watch } from 'vue'
import type { CategoryFilterItem } from '../../types/Category'

const props = defineProps<{
  search?: string
  selectedCategory: number | 'all'
  categories: readonly CategoryFilterItem[]
  totalProjects: number
}>()

const emit = defineEmits<{
  search: [query: string]
  change: [category: number | 'all']
}>()
const draft = ref(props.search ?? '')
watch(
  () => [props.search, props.selectedCategory] as const,
  ([value]) => {
    draft.value = value ?? ''
  },
)
function submitSearch() {
  draft.value = draft.value.trim()
  emit('search', draft.value)
}
</script>

<template>
  <aside class="category-sidebar">
    <form
      class="category-search"
      role="search"
      aria-label="Portföyde ara"
      @submit.prevent="submitSearch"
    >
      <label for="project-search">Proje adı ara</label>
      <div class="search-controls">
        <input id="project-search" v-model="draft" type="search" placeholder="Örn. Cam Balkon" />
        <button type="submit">Ara</button>
      </div>
    </form>

    <h3>Kategoriler</h3>

    <button
      class="category-sidebar-item"
      :class="{ active: props.selectedCategory === 'all' }"
      type="button"
      :aria-pressed="props.selectedCategory === 'all'"
      @click="emit('change', 'all')"
    >
      <span>Tüm Projeler</span>
      <span>{{ totalProjects }}</span>
    </button>

    <button
      v-for="category in categories"
      :key="category.id"
      type="button"
      :aria-pressed="props.selectedCategory === category.id"
      class="category-sidebar-item"
      :class="{
        active: props.selectedCategory === category.id,
      }"
      @click="emit('change', category.id)"
    >
      <span>{{ category.name }}</span>
      <span>{{ category.projectCount }}</span>
    </button>
  </aside>
</template>

<style scoped>
.category-sidebar {
  width: 280px;
  flex-shrink: 0;
}

.category-search {
  margin-bottom: 38px;
}

.category-search label {
  display: block;
  margin-bottom: 10px;
  font-size: 14px;
}
.search-controls {
  display: flex;
  gap: 8px;
}
.search-controls button {
  min-height: 48px;
  padding: 8px 14px;
  border: 1px solid var(--color-text);
  background: var(--color-text);
  color: var(--color-background);
  cursor: pointer;
}
.category-sidebar :is(input, button):focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 3px;
}
.category-search input {
  min-width: 0;
  width: 100%;
  height: 48px;

  padding: 0 16px;

  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);

  font-family: inherit;
  font-size: 14px;

  outline: none;
}

.category-search input:focus {
  border-color: var(--color-text);
}

.category-sidebar h3 {
  margin: 0 0 18px;

  color: var(--color-text);

  font-size: 18px;
  font-weight: 700;

  text-transform: uppercase;
}

.category-sidebar-item {
  width: 100%;

  padding: 14px 4px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  border: 0;
  border-bottom: 1px solid var(--color-border-light);

  background: transparent;

  color: #444444;

  font-family: inherit;
  font-size: 14px;

  cursor: pointer;
  text-align: left;

  transition: color 0.2s ease;
}

.category-sidebar-item:hover {
  color: var(--color-text);
}

.category-sidebar-item.active {
  color: var(--color-text);
  font-weight: 700;
}

@media (max-width: 900px) {
  .category-sidebar {
    width: 100%;
  }
}
</style>
