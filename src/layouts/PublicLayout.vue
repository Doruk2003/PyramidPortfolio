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
