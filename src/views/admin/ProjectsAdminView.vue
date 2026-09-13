<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_OPTIONS } from '../../constants/projectStatuses'
import AsyncState from '../../components/ui/AsyncState.vue'
import ConfirmDeleteDialog from '../../components/admin/ConfirmDeleteDialog.vue'
import { useAsyncData } from '../../composables/useAsyncData'
import { listProjects } from '../../services/projectService'
import { listCategories } from '../../services/categoryService'
import { deleteProject } from '../../services/projectManagementService'
import type { Project } from '../../types/Project'
import type { Category } from '../../types/Category'
import { ProjectWriteError } from '../../services/projectWriteErrors'

const route = useRoute(),
  router = useRouter()
const { data, isLoading, hasError, reload } = useAsyncData(
  async () => {
    const [projects, categories] = await Promise.all([listProjects(), listCategories()])
    return { projects, categories }
  },
  { projects: [] as Project[], categories: [] as Category[] },
)
const search = ref(''),
  status = ref(''),
  category = ref(String(route.query.category ?? '')),
  sort = ref('recent')
const page = ref(1),
  pageSize = 10
const notice = ref(route.query.saved === '1' ? 'Proje başarıyla kaydedildi.' : '')
const cleanupPending = ref(route.query.cleanup === '1')
const error = ref(''),
  selected = ref<Project | null>(null),
  deleting = ref(false)
// Consume one-time feedback without adding it to the navigation history.
if (route.query.saved || route.query.cleanup)
  void router.replace({ query: { ...route.query, saved: undefined, cleanup: undefined } })
watch(
  () => route.query.category,
  (value) => {
    category.value = String(value ?? '')
  },
)
watch([search, status, category, sort], () => {
  page.value = 1
})
const filtered = computed(() => {
  const text = search.value.trim().toLocaleLowerCase('tr-TR')
  const rows = data.value.projects.filter(
    (project) =>
      (!status.value || project.status === status.value) &&
      (!category.value || project.categoryIds.includes(Number(category.value))) &&
      (!text ||
        [
          project.title,
          project.location,
          project.slug,
          ...project.categories.map((item) => item.name),
        ]
          .join(' ')
          .toLocaleLowerCase('tr-TR')
          .includes(text)),
  )
  return rows.sort((a, b) =>
    sort.value === 'title'
      ? a.title.localeCompare(b.title, 'tr')
      : sort.value === 'year'
        ? b.year - a.year || b.id - a.id
        : (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '') || b.id - a.id,
  )
})
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
watch(pages, (value) => {
  page.value = Math.min(page.value, value)
})
const visible = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)
function resetFilters() {
  search.value = ''
  category.value = ''
  status.value = ''
  sort.value = 'recent'
}
async function confirmDelete() {
  if (!selected.value || deleting.value) return
  deleting.value = true
  error.value = ''
  notice.value = ''
  const project = selected.value
  try {
    const result = await deleteProject(project.id, project.version)
    data.value = {
      ...data.value,
      projects: data.value.projects.filter((item) => item.id !== project.id),
    }
    notice.value = `“${project.title}” silindi.`
    cleanupPending.value = result.cleanupPending
  } catch (cause) {
    error.value =
      cause instanceof ProjectWriteError && cause.code === 'conflict'
        ? 'Proje başka bir işlemde güncellendi. Liste yenilendi; son halini inceleyip tekrar deneyin.'
        : 'Silme sonucu doğrulanamadı. Listeyi kontrol edin ve gerekirse tekrar deneyin.'
    await reload()
  } finally {
    selected.value = null
    deleting.value = false
  }
}
</script>
<template>
  <section class="admin-panel">
    <header class="admin-page-heading">
      <div>
        <p class="admin-eyebrow">PORTFÖY YÖNETİMİ</p>
        <h1>Projeler</h1>
        <p class="muted">Projeleri bulun, sistem kategorilerini ve içeriklerini yönetin.</p>
      </div>
      <RouterLink :to="{ name: 'admin-project-new' }" class="admin-button">+ Yeni proje</RouterLink>
    </header>
    <p v-if="notice" class="admin-notice success" role="status">{{ notice }}</p>
    <p v-if="error" class="admin-notice error" role="alert">{{ error }}</p>
    <p v-if="cleanupPending" class="admin-notice" role="status">
      Kayıt işlemi tamamlandı. Bazı dosyaların temizliği bekliyor.
      <RouterLink :to="{ name: 'admin-media' }">Medya yönetimine git</RouterLink>
    </p>
    <div class="admin-toolbar">
      <label class="search-field"
        >Proje ara<input v-model="search" type="search" placeholder="Başlık, konum veya sistem…"
      /></label>
      <label
        >Sistem<select v-model="category">
          <option value="">Tüm sistemler</option>
          <option v-for="item in data.categories" :key="item.id" :value="String(item.id)">
            {{ item.name }}
          </option>
        </select></label
      >
      <label
        >Durum<select v-model="status">
          <option value="">Tüm durumlar</option>
          <option v-for="item in PROJECT_STATUS_OPTIONS" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select></label
      >
      <label
        >Sıralama<select v-model="sort">
          <option value="recent">Son güncellenen</option>
          <option value="title">Proje adı A–Z</option>
          <option value="year">Proje yılı</option>
        </select></label
      >
    </div>
    <AsyncState
      :loading="isLoading"
      :error="hasError"
      :empty="!data.projects.length"
      loading-text="Projeler yükleniyor…"
      error-text="Projeler yüklenemedi."
      empty-text="İlk projenizi ekleyerek portföyünüzü oluşturmaya başlayın."
      @retry="reload"
    />
    <template v-if="!isLoading && !hasError && data.projects.length">
      <div class="list-summary">
        <span>{{ filtered.length }} / {{ data.projects.length }} proje</span
        ><button class="text-button" @click="reload" :disabled="deleting">Listeyi yenile</button>
      </div>
      <div v-if="!filtered.length" class="admin-empty">
        <h2>Eşleşen proje yok</h2>
        <p>Arama veya filtreleri değiştirin.</p>
        <button class="admin-button secondary" @click="resetFilters">Filtreleri temizle</button>
      </div>
      <div v-else class="admin-table-scroll" tabindex="0" role="region" aria-label="Proje listesi">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Proje</th>
              <th>Sistemler</th>
              <th>Konum / yıl</th>
              <th>Durum</th>
              <th><span class="visually-hidden">İşlemler</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="project in visible" :key="project.id">
              <td>
                <RouterLink
                  class="project-row-title"
                  :to="{ name: 'admin-project-edit', params: { id: project.id } }"
                  ><img :src="project.image" alt="" loading="lazy" /><span
                    ><strong>{{ project.title }}</strong
                    ><small>/{{ project.slug }}</small></span
                  ></RouterLink
                >
              </td>
              <td>
                <div class="admin-tags">
                  <span v-for="item in project.categories" :key="item.id">{{ item.name }}</span>
                </div>
              </td>
              <td>
                {{ project.location || '—' }}<small>{{ project.year }}</small>
              </td>
              <td>
                <span class="admin-status" :class="project.status">{{
                  PROJECT_STATUS_LABELS[project.status]
                }}</span>
              </td>
              <td>
                <div class="row-actions">
                  <RouterLink
                    :to="{ name: 'project-detail', params: { slug: project.slug } }"
                    target="_blank"
                    rel="noopener"
                    :aria-label="`${project.title} projesini sitede aç`"
                    >Gör ↗</RouterLink
                  ><RouterLink :to="{ name: 'admin-project-edit', params: { id: project.id } }"
                    >Düzenle</RouterLink
                  ><button
                    class="text-button danger-text"
                    :disabled="deleting"
                    :aria-label="`${project.title} projesini sil`"
                    @click="selected = project"
                  >
                    Sil
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav v-if="filtered.length" class="admin-pagination" aria-label="Proje sayfaları">
        <span>Sayfa {{ page }} / {{ pages }}</span
        ><button class="admin-button secondary" :disabled="page === 1" @click="page--">
          Önceki</button
        ><button class="admin-button secondary" :disabled="page === pages" @click="page++">
          Sonraki
        </button>
      </nav>
    </template>
    <ConfirmDeleteDialog
      :title="selected?.title ?? null"
      :busy="deleting"
      @cancel="selected = null"
      @confirm="confirmDelete"
    />
  </section>
</template>
