<script setup lang="ts">
import Navbar from '../components/layout/Navbar.vue'
import Footer from '../components/layout/Footer.vue'
</script>

<template>
  <div class="app-layout">
    <Navbar />

    <main class="page-content">
      <RouterView />
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.app-layout {
  --color-background: #f8f7f3;
  --color-surface: #efefe8;
  --color-text: #242823;
  --color-text-secondary: #5f655a;
  --color-border: #d9dcd1;
  --color-dark: #232b22;
  background: var(--color-background);
}
</style>
