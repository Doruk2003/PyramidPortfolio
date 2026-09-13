<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const links = [
  { path: '/', label: 'Ana Sayfa' },
  { path: '/projeler', label: 'Projeler' },
  { path: '/animasyonlar', label: 'Animasyonlar' },
  { path: '/referanslar', label: 'Referanslar' },
  { path: '/hakkimizda', label: 'Hakkımızda' },
  { path: '/iletisim', label: 'İletişim' },
]
function isCurrent(path: string) {
  const current = route.path.replace(/\/+$/, '') || '/'
  return current === path || (path !== '/' && current.startsWith(`${path}/`))
}
const menuOpen = ref(false)
const toggle = ref<HTMLButtonElement | null>(null)
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)
function closeMenu() {
  if (menuOpen.value) {
    menuOpen.value = false
    toggle.value?.focus()
  }
}
</script>
<template>
  <header class="navbar" @keydown.esc="closeMenu">
    <div class="navbar-container">
      <RouterLink to="/" class="brand" aria-label="Pyramid 3D ana sayfa">
        <span class="brand-name">Pyramid<span class="brand-dimension">3D</span></span>
      </RouterLink>
      <button
        ref="toggle"
        type="button"
        class="menu-toggle"
        :aria-expanded="menuOpen"
        aria-controls="public-navigation"
        @click="menuOpen = !menuOpen"
      >
        {{ menuOpen ? 'Kapat' : 'Menü' }}
        <span aria-hidden="true">{{ menuOpen ? '×' : '☰' }}</span>
      </button>
      <nav
        id="public-navigation"
        class="nav-links"
        :class="{ 'is-open': menuOpen }"
        aria-label="Ana menü"
        @click="menuOpen = false"
      >
        <RouterLink
          v-for="link in links"
          :key="link.path"
          :to="link.path"
          :class="{ 'is-current': isCurrent(link.path) }"
          :aria-current="
            isCurrent(link.path) ? (route.path === link.path ? 'page' : 'location') : undefined
          "
          >{{ link.label }}</RouterLink
        >
      </nav>
    </div>
  </header>
</template>
<style scoped>
.navbar {
  width: 100%;
  border-bottom: 1px solid #dedfd7;
  background: #f8f7f3;
  color: #242823;
}
.navbar-container {
  max-width: 1344px;
  margin: 0 auto;
  padding: 14px clamp(20px, 4vw, 64px);
  min-height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.brand {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  color: #30392e;
  text-decoration: none;
  white-space: nowrap;
}
.brand-name {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 36px;
  font-weight: 400;
  letter-spacing: -1px;
  line-height: 1;
}
.brand-dimension {
  display: inline-block;
  margin-left: 7px;
  vertical-align: top;
  padding-top: 3px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10px;
  letter-spacing: 1px;
  color: #68715e;
}
.nav-links {
  display: flex;
  align-items: center;
  gap: clamp(16px, 2vw, 28px);
}
.nav-links a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  gap: 20px;
  color: #555d50;
  text-decoration: none;
  font-size: 12px;
  white-space: nowrap;
}
.nav-links a:hover,
.nav-links a.is-current {
  color: #242823;
  text-decoration: underline;
  text-underline-offset: 7px;
  text-decoration-thickness: 1px;
}
.menu-toggle {
  display: none;
}
a:focus-visible,
button:focus-visible {
  outline: 2px solid #687852;
  outline-offset: 4px;
}
@media (max-width: 960px) {
  .navbar-container {
    flex-wrap: wrap;
    gap: 0;
    min-height: 72px;
  }
  .brand-name {
    font-size: 32px;
  }
  .menu-toggle {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 12px;
    padding: 8px 0 8px 16px;
  }
  .menu-toggle span {
    font-size: 19px;
  }
  .nav-links {
    display: none;
    width: 100%;
    padding-top: 14px;
    margin-top: 12px;
    border-top: 1px solid #dedfd7;
  }
  .nav-links.is-open {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 20px;
  }
  .nav-links a {
    font-size: 14px;
  }
}
</style>
