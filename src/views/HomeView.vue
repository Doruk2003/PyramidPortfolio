<script setup lang="ts">
import { computed } from 'vue'

import ProjectCard from '../components/projects/ProjectCard.vue'
import AsyncState from '../components/ui/AsyncState.vue'
import { useAsyncData } from '../composables/useAsyncData'
import { listProjects } from '../services/projectService'

const { data: projects, isLoading, hasError, reload } = useAsyncData(listProjects, [])

const featuredProjects = computed(() => projects.value.slice(0, 3))
</script>

<template>
  <section class="hero">
    <div class="hero-overlay"></div>

    <div class="hero-content">
      <p class="hero-kicker">Mimari Tasarım • 3D Görselleştirme • Animasyon</p>

      <h1>Hayalden <span>Gerçeğe</span></h1>

      <p class="hero-description">
        Mimari projeleri 3D görselleştirme, animasyon ve uygulama örnekleriyle etkileyici bir sunuma
        dönüştürüyoruz.
      </p>

      <div class="hero-actions">
        <RouterLink to="/projeler" class="hero-button primary"> Projeleri İncele </RouterLink>

        <RouterLink to="/iletisim" class="hero-button secondary"> İletişime Geç </RouterLink>
      </div>
    </div>
  </section>

  <section class="featured-projects">
    <div class="section-container">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Portföy</p>

          <h2>Öne Çıkan Projeler</h2>
        </div>

        <RouterLink to="/projeler" class="section-link"> Tüm Projeleri Gör </RouterLink>
      </div>

      <AsyncState
        :loading="isLoading"
        :error="hasError"
        :empty="projects.length === 0"
        loading-text="Öne çıkan projeler yükleniyor…"
        error-text="Öne çıkan projeler yüklenemedi."
        empty-text="Henüz yayımlanmış proje bulunmuyor."
        @retry="reload"
      />
      <div v-if="!isLoading && !hasError && featuredProjects.length" class="project-grid">
        <ProjectCard
          v-for="project in featuredProjects"
          :key="project.id"
          :title="project.title"
          :slug="project.slug"
          :category="project.categories.map((category) => category.name).join(' · ')"
          :image="project.image"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;

  min-height: calc(100vh - 65px);

  display: flex;
  align-items: center;

  overflow: hidden;

  background-image:
    linear-gradient(rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.65)), url('../assets/images/hero.jpeg');

  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.hero-overlay {
  position: absolute;
  inset: 0;

  background: radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.08), transparent 35%);
}

.hero-content {
  position: relative;
  z-index: 1;

  width: 100%;
  max-width: var(--container-width);

  margin: 0 auto;
  padding: 100px var(--page-padding);

  color: var(--color-light);
}

.hero-kicker {
  margin: 0 0 20px;

  color: #cccccc;

  font-size: 14px;
  font-weight: 600;

  letter-spacing: 2px;
  text-transform: uppercase;
}

.hero h1 {
  max-width: 800px;

  margin: 0;

  font-size: clamp(52px, 8vw, 110px);
  font-weight: 700;
  line-height: 0.95;

  letter-spacing: -3px;
}

.hero h1 span {
  display: block;
  color: #bcbcbc;
}

.hero-description {
  max-width: 650px;

  margin-top: 30px;
  margin-bottom: 0;

  color: #d3d3d3;

  font-size: 18px;
  line-height: 1.7;
}

.hero-actions {
  margin-top: 40px;

  display: flex;
  flex-wrap: wrap;

  gap: 16px;
}

.hero-button {
  min-height: 50px;

  padding: 0 26px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  border: 1px solid transparent;

  font-size: 15px;
  font-weight: 600;

  text-decoration: none;

  transition: 0.25s ease;
}

.hero-button.primary {
  background: var(--color-light);
  color: var(--color-text);
}

.hero-button.primary:hover {
  background: #e7e7e7;
}

.hero-button.secondary {
  border-color: #777777;

  color: var(--color-light);
}

.hero-button.secondary:hover {
  border-color: var(--color-light);

  background: rgba(255, 255, 255, 0.06);
}

.featured-projects {
  padding: 100px 24px;

  background: var(--color-background);
}

.section-heading {
  margin-bottom: 40px;

  display: flex;
  align-items: end;
  justify-content: space-between;

  gap: 30px;
}

.section-kicker {
  margin: 0 0 10px;

  color: #777777;

  font-size: 13px;
  font-weight: 600;

  letter-spacing: 2px;
  text-transform: uppercase;
}

.section-heading h2 {
  margin: 0;

  color: var(--color-text);

  font-size: clamp(32px, 4vw, 48px);
  line-height: 1.1;
}

.section-link {
  padding-bottom: 4px;

  color: var(--color-text);

  border-bottom: 1px solid var(--color-text);

  font-size: 14px;
  font-weight: 600;

  text-decoration: none;
}

.project-grid {
  display: grid;

  grid-template-columns: repeat(3, minmax(0, 1fr));

  gap: 24px;
}

@media (max-width: 900px) {
  .project-grid {
    grid-template-columns: 1fr;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
