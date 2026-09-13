<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ProjectFormData, GalleryEntry } from '../../../types/ProjectForm'
import { galleryFileKey } from '../../../validation/galleryLayout'
import { useMediaPreviews } from '../../../composables/useMediaPreviews'
import ImageViewer from '../../ui/ImageViewer.vue'
const props = defineProps<{ form: ProjectFormData }>()
const viewer = ref<InstanceType<typeof ImageViewer> | null>(null)
const previews = useMediaPreviews(() => [...props.form.galleryFiles])
const entries = computed(() =>
  (props.form.galleryLayout ?? []).map((item) => {
    const index = props.form.galleryFiles.findIndex((file) => galleryFileKey(file) === item.key)
    return {
      ...item,
      url:
        index >= 0
          ? (previews.value[index]?.url ?? '')
          : (props.form.retainedMedia.find((media) => media.objectPath === item.key)?.url ?? ''),
    }
  }),
)
function update(key: string, field: 'title' | 'description', event: Event) {
  const value = (event.target as HTMLInputElement).value
  props.form.galleryLayout = props.form.galleryLayout?.map((item) =>
    item.key === key ? { ...item, [field]: value } : item,
  )
}
function move(index: number, step: number) {
  const items = [...(props.form.galleryLayout ?? [])]
  const target = index + step
  if (target < 0 || target >= items.length) return
  const [item] = items.splice(index, 1)
  items.splice(target, 0, item!)
  props.form.galleryLayout = items
}
function remove(item: GalleryEntry) {
  viewer.value?.close()
  props.form.galleryFiles = props.form.galleryFiles.filter(
    (file) => galleryFileKey(file) !== item.key,
  )
  props.form.retainedMedia = props.form.retainedMedia.filter(
    (media) => media.objectPath !== item.key,
  )
}
</script>
<template>
  <p class="file-info">
    Her çizime başlık ve açıklama ekleyebilir, oklarla yayın sırasını değiştirebilirsiniz.
    Değişiklikler projeyi kaydettiğinizde uygulanır.
  </p>
  <ol class="design-list">
    <li v-for="(item, index) in entries" :key="item.key" class="design-entry">
      <button
        class="design-preview"
        type="button"
        :aria-label="`${item.title || `Tasarım ${index + 1}`} görselini büyüt`"
        @click="viewer?.open({ ...item, title: item.title || `Tasarım ${index + 1}` })"
      >
        <img :src="item.url" :alt="item.title || `Tasarım ${index + 1}`" /><span>Büyüt ↗</span>
      </button>
      <div class="design-fields">
        <label :for="`design-title-${index}`">{{ index + 1 }}. tasarım başlığı</label>
        <input
          :id="`design-title-${index}`"
          :value="item.title"
          maxlength="120"
          placeholder="Örn. Alternatif A · Üstten görünüş"
          @input="update(item.key, 'title', $event)"
        />
        <label :for="`design-description-${index}`">Açıklama</label>
        <textarea
          :id="`design-description-${index}`"
          :value="item.description"
          maxlength="1000"
          rows="2"
          placeholder="Bu tasarıma ait kısa not"
          @input="update(item.key, 'description', $event)"
        />
        <div class="design-actions">
          <button
            type="button"
            :disabled="index === 0"
            :aria-label="`${index + 1}. tasarımı yukarı taşı`"
            @click="move(index, -1)"
          >
            ↑ Yukarı
          </button>
          <button
            type="button"
            :disabled="index === entries.length - 1"
            :aria-label="`${index + 1}. tasarımı aşağı taşı`"
            @click="move(index, 1)"
          >
            ↓ Aşağı
          </button>
          <button type="button" @click="remove(item)">Kaldır</button>
        </div>
      </div>
    </li>
  </ol>
  <ImageViewer ref="viewer" />
</template>
<style scoped>
.design-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 14px;
}
.design-entry {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 16px;
  border: 1px solid #dce5e7;
  border-radius: 8px;
  padding: 14px;
}
.design-preview {
  align-self: start;
  border: 0;
  background: #f2f5f6;
  padding: 8px;
  cursor: zoom-in;
  color: #315e54;
}
.design-preview img {
  width: 100%;
  height: 120px;
  object-fit: contain;
}
.design-fields {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.design-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.design-actions button {
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid #dce5e7;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}
@media (max-width: 600px) {
  .design-entry {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
