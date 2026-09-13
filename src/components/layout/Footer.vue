<script setup lang="ts">
import { useAuth } from '../../composables/useAuth'

const { isAuthenticated } = useAuth()
</script>

<template>
  <footer class="footer">
    <div class="footer-container">
      <div class="footer-brand">
        <p class="footer-name">Pyramid3D Portfolio</p>
      </div>

      <nav class="footer-links" aria-label="Alt bilgi bağlantıları">
        <RouterLink to="/projeler">Projeler</RouterLink>
        <RouterLink to="/animasyonlar">Animasyonlar</RouterLink>
        <RouterLink to="/referanslar">Referanslar</RouterLink>
        <RouterLink to="/iletisim">İletişim</RouterLink>
        <RouterLink
          :to="{ name: isAuthenticated ? 'admin-dashboard' : 'admin-login' }"
          class="admin-link"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <rect x="5" y="10" width="14" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          {{ isAuthenticated ? 'Yönetim Paneli' : 'Yönetici Girişi' }}
        </RouterLink>
      </nav>
    </div>
    <p class="footer-copyright">© 2026 · Tüm hakları saklıdır.</p>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--color-border);
  background: var(--color-dark);
  color: var(--color-light);
}

.footer-container {
  max-width: var(--container-width);
  margin: 0 auto;
  padding: 6px var(--page-padding);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 24px;
}

.footer-brand {
  line-height: 1.5;
}

.footer-brand p {
  margin: 0;
}

.footer-name {
  font-size: 14px;
  font-weight: 600;
}

.footer-copyright {
  margin: 0;
  padding: 6px var(--page-padding);
  border-top: 1px solid #333333;
  color: #cccccc;
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 20px;
}

.footer-links a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  color: #cccccc;
  font-size: 13px;
  text-decoration: none;
}

.footer-links a:hover {
  color: var(--color-light);
  text-decoration: underline;
  text-underline-offset: 4px;
}

.footer-links a:focus-visible {
  outline: 2px solid var(--color-light);
  outline-offset: 4px;
  border-radius: 2px;
}

.footer-links .admin-link {
  color: var(--color-light);
}

@media (max-width: 700px) {
  .footer-container {
    align-items: flex-start;
  }

  .footer-links {
    gap: 0 16px;
  }
}
</style>
