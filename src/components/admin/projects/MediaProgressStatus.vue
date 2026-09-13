<script setup lang="ts">
import { computed } from 'vue'
import type { MediaProgress } from '../../../types/MediaProgress'
const props = defineProps<{ progress: MediaProgress; subject?: string }>()
const labels = {
  preparing: 'Görseller hazırlanıyor…',
  checking: 'Proje bilgileri kontrol ediliyor…',
  uploading: 'Dosyalar yükleniyor…',
  saving: 'Proje kaydediliyor…',
  verifying: 'Kayıt doğrulanıyor…',
  cleanup: 'Yüklenen dosyalar temizleniyor…',
}
const countable = computed(
  () => ['preparing', 'uploading'].includes(props.progress.stage) && props.progress.total > 0,
)
</script>
<template>
  <div class="media-progress-status" role="status" aria-live="polite" aria-atomic="true">
    <span class="progress-spinner" aria-hidden="true"></span>
    <div class="progress-description">
      <strong>{{ labels[progress.stage].replace('Proje', subject || 'Proje') }}</strong>
      <span v-if="countable"
        >{{ progress.completed }} / {{ progress.total }} dosya tamamlandı<span
          v-if="progress.filename"
        >
          · {{ progress.filename }}</span
        ></span
      >
      <span v-else>Lütfen işlem tamamlanana kadar bekleyin.</span>
      <progress
        v-if="countable"
        :value="progress.completed"
        :max="progress.total"
        aria-label="Tamamlanan dosyalar"
      ></progress>
    </div>
  </div>
</template>
<style scoped>
.media-progress-status {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-width: 0;
  padding: 14px 16px;
  background: #edf6f2;
  border: 1px solid #c9e4da;
  border-radius: 8px;
  color: #23594c;
}
.progress-description {
  display: grid;
  gap: 6px;
  min-width: 0;
  flex: 1;
}
.progress-description strong {
  font-size: 14px;
}
.progress-description span {
  font-size: 12px;
  overflow-wrap: anywhere;
}
progress {
  display: block;
  width: 100%;
  height: 7px;
  accent-color: #146b5d;
}
.progress-spinner {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border: 3px solid #c9e4da;
  border-top-color: #146b5d;
  border-radius: 50%;
  animation: progress-spin 0.9s linear infinite;
}
@keyframes progress-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .progress-spinner {
    animation: none;
  }
}
</style>
