<script setup lang="ts">
import type { CategoryFilterItem } from '../../types/Category'

const props = defineProps<{
  selectedCategory: number | 'all'
  categories: readonly CategoryFilterItem[]
  totalProjects: number
}>()

const emit = defineEmits<{
  change: [category: number | 'all']
}>()
</script>

<template>
  <aside class="category-sidebar">
    <div class="category-search">
      <input type="text" placeholder="Proje ara..." />
    </div>

    <h3>Kategoriler</h3>

    <button
      class="category-sidebar-item"
      :class="{ active: props.selectedCategory === 'all' }"
      @click="emit('change', 'all')"
    >
      <span>Tüm Projeler</span>
      <span>{{ totalProjects }}</span>
    </button>

    <button
      v-for="category in categories"
      :key="category.id"
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

.category-search input {
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
