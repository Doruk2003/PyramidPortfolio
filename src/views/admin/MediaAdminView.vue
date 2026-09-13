<script setup lang="ts">
import { computed, ref } from 'vue'
import AsyncState from '../../components/ui/AsyncState.vue'
import { useAsyncData } from '../../composables/useAsyncData'
import { listProjects } from '../../services/projectService'
import { cleanupProjectMedia } from '../../services/projectManagementService'
const { data, isLoading, hasError, reload } = useAsyncData(listProjects, [])
const search = ref(''),
  kind = ref(''),
  page = ref(1),
  cleaning = ref(false),
  message = ref('')
const allMedia = computed(() =>
  data.value.flatMap((project) =>
    project.media.map((item) => ({ ...item, projectId: project.id, projectTitle: project.title })),
  ),
)
const filtered = computed(() =>
  allMedia.value.filter(
    (item) =>
      (!kind.value || item.kind === kind.value) &&
      item.projectTitle
        .toLocaleLowerCase('tr-TR')
        .includes(search.value.trim().toLocaleLowerCase('tr-TR')),
  ),
)
const visible = computed(() => filtered.value.slice(0, page.value * 24))
async function cleanup() {
  if (cleaning.value) return
  cleaning.value = true
  message.value = ''
  try {
    const result = await cleanupProjectMedia()
    message.value = result.remaining
      ? `${result.remaining} dosya daha bekliyor. Temizlemeyi tekrar çalıştırabilirsiniz.`
      : 'Bekleyen dosya temizliği tamamlandı.'
  } catch {
    message.value = 'Dosyalar temizlenemedi. Kayıtlar korunuyor; tekrar deneyebilirsiniz.'
  } finally {
    cleaning.value = false
  }
}
</script>
<template>
  <section class="admin-panel">
    <header class="admin-page-heading">
      <div>
        <p class="admin-eyebrow">İÇERİK KÜTÜPHANESİ</p>
        <h1>Medya</h1>
        <p class="muted">Görselleri ve videoları bağlı oldukları projeden yönetin.</p>
      </div>
      <button class="admin-button secondary" :disabled="cleaning" @click="cleanup">
        {{ cleaning ? 'Temizleniyor…' : 'Bekleyen dosyaları temizle' }}
      </button>
    </header>
    <p v-if="message" class="admin-notice" role="status">{{ message }}</p>
    <div class="admin-toolbar">
      <label class="search-field"
        >Proje ara<input
          v-model="search"
          type="search"
          placeholder="Proje adı…"
          @input="page = 1" /></label
      ><label
        >Medya türü<select v-model="kind" @change="page = 1">
          <option value="">Tümü</option>
          <option value="main">Ana görsel</option>
          <option value="gallery">Galeri</option>
          <option value="application">Uygulama</option>
          <option value="video">Video</option>
        </select></label
      >
    </div>
    <AsyncState
      :loading="isLoading"
      :error="hasError"
      :empty="!filtered.length"
      error-text="Medya yüklenemedi."
      empty-text="Gösterilecek medya bulunamadı."
      @retry="reload"
    />
    <div v-if="!isLoading && !hasError" class="media-library">
      <article v-for="item in visible" :key="item.objectPath" class="media-library-card">
        <a
          :href="item.url"
          target="_blank"
          rel="noopener"
          :aria-label="`${item.projectTitle} medyasını aç`"
          ><div v-if="item.kind === 'video'" class="video-tile">▷ Video</div>
          <img v-else :src="item.url" :alt="item.projectTitle" loading="lazy"
        /></a>
        <div>
          <strong>{{ item.projectTitle }}</strong>
          <p class="muted">
            {{
              item.kind === 'main'
                ? 'Ana görsel'
                : item.kind === 'gallery'
                  ? 'Galeri'
                  : item.kind === 'application'
                    ? 'Uygulama'
                    : 'Video'
            }}
          </p>
          <RouterLink
            class="admin-button secondary"
            :to="{ name: 'admin-project-edit', params: { id: item.projectId } }"
            >Projede düzenle</RouterLink
          >
        </div>
      </article>
    </div>
    <button v-if="visible.length < filtered.length" class="admin-button secondary" @click="page++">
      Daha fazla göster
    </button>
  </section>
</template>
<style scoped>
.media-library {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: 18px;
  margin: 20px 0;
}
.media-library-card {
  background: #fff;
  border: 1px solid #e0e8eb;
  border-radius: 12px;
  overflow: hidden;
}
.media-library-card img,
.video-tile {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  background: #e7eeef;
}
.video-tile {
  display: grid;
  place-items: center;
  color: #416c65;
  font-size: 24px;
}
.media-library-card > div {
  padding: 16px;
}
.media-library-card strong {
  font-size: 14px;
  overflow-wrap: anywhere;
}
</style>
