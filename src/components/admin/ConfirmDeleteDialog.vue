<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
const props = defineProps<{ title: string | null; busy: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
function sync() {
  if (props.title && !dialog.value?.open) dialog.value?.showModal()
  else if (!props.title && dialog.value?.open) dialog.value.close()
}
watch(() => props.title, sync)
onMounted(sync)
</script>
<template>
  <dialog
    ref="dialog"
    class="delete-dialog"
    aria-labelledby="delete-title"
    aria-describedby="delete-description"
    @cancel.prevent="!busy && emit('cancel')"
    @close="!busy && title && emit('cancel')"
  >
    <h2 id="delete-title">Proje silinsin mi?</h2>
    <p id="delete-description">
      <strong>{{ title }}</strong> portföyden kalıcı olarak kaldırılacak. Bu işlem geri alınamaz.
    </p>
    <p class="muted">Projeye bağlı görseller ve video da temizlenecek.</p>
    <div class="dialog-actions">
      <button
        class="admin-button secondary"
        type="button"
        autofocus
        :disabled="busy"
        @click="emit('cancel')"
      >
        Vazgeç
      </button>
      <button class="admin-button danger" type="button" :disabled="busy" @click="emit('confirm')">
        {{ busy ? 'Siliniyor…' : 'Projeyi sil' }}
      </button>
    </div>
  </dialog>
</template>
<style scoped>
.delete-dialog {
  width: min(460px, calc(100% - 32px));
  padding: 28px;
  border: 1px solid #e1e5e9;
  border-radius: 16px;
  color: #18272e;
  box-shadow: 0 24px 80px #0003;
}
.delete-dialog::backdrop {
  background: #0d1e2e99;
}
h2 {
  margin: 0 0 16px;
  font-size: 22px;
}
p {
  line-height: 1.65;
  overflow-wrap: anywhere;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}
</style>
