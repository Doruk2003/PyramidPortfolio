<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { AUTH_ERROR_MESSAGES } from '../constants/authMessages'
import { getAuthErrorCode } from '../services/authService'
import '../styles/admin.css'
const { isAuthenticated, isBusy, signOut, user } = useAuth()
const route = useRoute()
const signOutError = ref('')
const navigation = [
  { path: '/admin', label: 'Genel bakış', symbol: '◈' },
  { path: '/admin/ana-sayfa', label: 'Ana sayfa', symbol: '⌂' },
  { path: '/admin/projeler', label: 'Projeler', symbol: '▦' },
  { path: '/admin/kategoriler', label: 'Sistemler', symbol: '◇' },
  { path: '/admin/medya', label: 'Medya', symbol: '▧' },
]
const section = computed(
  () =>
    navigation.find((item) => item.path !== '/admin' && route.path.startsWith(item.path))?.label ??
    'Genel bakış',
)
async function handleSignOut() {
  if (isBusy.value) return
  signOutError.value = ''
  try {
    await signOut()
  } catch (error) {
    signOutError.value = AUTH_ERROR_MESSAGES[getAuthErrorCode(error)]
  }
}
</script>
<template>
  <div v-if="isAuthenticated" class="admin-layout">
    <aside class="admin-sidebar">
      <div class="admin-brand">
        <span class="admin-brand-mark" aria-hidden="true">P</span>
        <div><strong>Pyramid Admin</strong><small>PORTFÖY YÖNETİMİ</small></div>
      </div>
      <nav class="admin-nav" aria-label="Yönetim menüsü">
        <RouterLink
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          :class="{
            active:
              item.path === '/admin' ? route.path === item.path : route.path.startsWith(item.path),
          }"
          ><span aria-hidden="true">{{ item.symbol }}</span
          >{{ item.label }}</RouterLink
        >
      </nav>
      <div class="admin-sidebar-bottom">
        <RouterLink to="/">← Siteye dön</RouterLink
        ><button type="button" class="admin-sign-out" :disabled="isBusy" @click="handleSignOut">
          {{ isBusy ? 'Lütfen bekleyin…' : 'Çıkış yap' }}
        </button>
      </div>
      <p v-if="signOutError" role="alert">{{ signOutError }}</p>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar">
        <span
          >Pyramid / <strong>{{ section }}</strong></span
        >
        <div class="admin-account">
          <span class="admin-avatar" aria-hidden="true">{{
            user?.email?.[0]?.toLocaleUpperCase('tr-TR') || 'P'
          }}</span
          ><span>{{ user?.email || 'Yönetici' }}</span>
        </div>
      </header>
      <main class="admin-content"><RouterView :key="route.path" /></main>
    </div>
  </div>
  <main v-else class="admin-session-notice" role="status">
    <p>Yönetim paneline erişmek için giriş yapmanız gerekiyor.</p>
    <RouterLink to="/admin/login">Giriş sayfasına git</RouterLink>
  </main>
</template>
