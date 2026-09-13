<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
const dialog = ref<HTMLDialogElement | null>(null)
const selected = ref({ url: '', title: '', description: '' })
let overflow: string | undefined
function restore() {
  if (overflow !== undefined) document.body.style.overflow = overflow
  overflow = undefined
}
function close() {
  if (dialog.value?.open) dialog.value.close()
  restore()
}
async function open(item: { url: string; title: string; description?: string }) {
  selected.value = { ...item, description: item.description ?? '' }
  await nextTick()
  if (!dialog.value || dialog.value.open) return
  overflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value.showModal()
}
onBeforeUnmount(close)
defineExpose({ open, close })
</script>
<template>
  <dialog
    ref="dialog"
    class="image-viewer"
    aria-label="Görsel önizleme"
    @cancel.prevent="close"
    @close="restore"
    @click.self="close"
  >
    <div class="viewer-toolbar">
      <h2>{{ selected.title }}</h2>
      <button autofocus type="button" @click="close">Kapat ×</button>
    </div>
    <img :src="selected.url || undefined" :alt="selected.title" />
    <p v-if="selected.description">{{ selected.description }}</p>
    <a :href="selected.url" target="_blank" rel="noopener">Tam boyutta yeni sekmede aç ↗</a>
  </dialog>
</template>
<style scoped>
.image-viewer {
  box-sizing: border-box;
  width: min(1400px, 96vw);
  max-width: 96vw;
  max-height: 94dvh;
  padding: 20px;
  border: 0;
  border-radius: 12px;
  background: #13282e;
  color: white;
}
.image-viewer::backdrop {
  background: #071215e8;
}
.viewer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}
h2 {
  margin: 0;
  font-size: 18px;
  overflow-wrap: anywhere;
}
button {
  min-height: 44px;
  padding: 8px 16px;
  color: white;
  background: transparent;
  border: 1px solid #93aaa8;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
}
img {
  display: block;
  width: 100%;
  max-height: 68dvh;
  object-fit: contain;
}
p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.6;
}
a {
  display: inline-block;
  padding: 12px 0;
  color: #bce5da;
}
</style>
