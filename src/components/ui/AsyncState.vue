<script setup lang="ts">
withDefaults(
  defineProps<{
    loading: boolean
    error: boolean
    empty?: boolean
    loadingText?: string
    errorText?: string
    emptyText?: string
  }>(),
  {
    empty: false,
    loadingText: 'İçerik yükleniyor…',
    errorText: 'İçerik yüklenemedi. Lütfen tekrar deneyin.',
    emptyText: 'Henüz içerik bulunmuyor.',
  },
)

defineEmits<{ retry: [] }>()
</script>

<template>
  <div v-if="loading" class="async-state" role="status" aria-live="polite">
    <p>{{ loadingText }}</p>
  </div>
  <div v-else-if="error" class="async-state" role="alert">
    <p>{{ errorText }}</p>
    <button type="button" @click="$emit('retry')">Tekrar dene</button>
  </div>
  <div v-else-if="empty" class="async-state" role="status">
    <p>{{ emptyText }}</p>
  </div>
</template>

<style scoped>
.async-state {
  padding: 24px;
  margin-block: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-secondary);
  background: var(--color-background);
}

.async-state p {
  margin: 0;
  line-height: 1.6;
}

.async-state button {
  min-height: 44px;
  margin-top: 16px;
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
}

.async-state button:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 3px;
}
</style>
