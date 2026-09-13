<script setup lang="ts">
import { computed, ref } from 'vue'
import HomepageHeroMedia from '../components/home/HomepageHeroMedia.vue'
import { homepageMediaService, defaultHomepageMedia } from '../services/homepageMediaService'
import AsyncState from '../components/ui/AsyncState.vue'
import { useAsyncData } from '../composables/useAsyncData'
import { listProjects } from '../services/projectService'

const { data: projects, isLoading, hasError, reload } = useAsyncData(listProjects, [])
const heroPlayer = ref<InstanceType<typeof HomepageHeroMedia> | null>(null)
const videoState = ref({ playing: false, failed: false })
const { data: homepageMedia } = useAsyncData(async () => {
  if (!homepageMediaService.isConfigured) return defaultHomepageMedia
  try {
    return await homepageMediaService.read()
  } catch {
    return defaultHomepageMedia
  }
}, defaultHomepageMedia)
const featuredProjects = computed(() => projects.value.slice(0, 3))
</script>

<template>
  <div class="home-page">
    <section class="hero" aria-labelledby="home-title">
      <HomepageHeroMedia ref="heroPlayer" :settings="homepageMedia" @state="videoState = $event" />
      <div class="hero-shade" aria-hidden="true"></div>
      <div class="hero-inner">
        <p class="eyebrow hero-eyebrow">Mimari tasarım & görselleştirme</p>
        <div class="hero-main">
          <h1 id="home-title">Hayalden<br /><em>gerçeğe.</em></h1>
          <p>
            Mekânın potansiyelini görünür kılan<br class="desktop-break" />
            tasarımlar, görseller ve filmler.
          </p>
          <RouterLink to="/projeler" class="hero-link"
            >Projeleri keşfet <span aria-hidden="true">↗</span></RouterLink
          >
        </div>
        <div class="hero-bottom">
          <button
            v-if="homepageMedia.mode === 'video' && homepageMedia.videoUrl"
            class="hero-video-control"
            type="button"
            :aria-pressed="videoState.playing"
            @click="heroPlayer?.toggle()"
          >
            {{
              videoState.failed
                ? 'Videoyu tekrar dene'
                : videoState.playing
                  ? 'Ⅱ Videoyu duraklat'
                  : '▶ Videoyu oynat'
            }}
          </button>
          <span
            >PYRAMID 3D <span class="hero-divider" aria-hidden="true">/</span> Tasarımın yeni
            perspektifi</span
          >
          <a href="#secilen-projeler" aria-label="Seçili çalışmalara git"
            >Çalışmalara göz at <span aria-hidden="true">↓</span></a
          >
        </div>
      </div>
    </section>

    <section
      id="secilen-projeler"
      class="selected-work home-container"
      aria-labelledby="selected-title"
    >
      <div class="section-heading">
        <div>
          <p class="eyebrow">Portföy / Seçili çalışmalar</p>
          <h2 id="selected-title">Her projenin bir <em>hikâyesi var.</em></h2>
        </div>
        <RouterLink to="/projeler" class="text-link"
          >Tüm projeler <span aria-hidden="true">↗</span></RouterLink
        >
      </div>
      <AsyncState
        :loading="isLoading"
        :error="hasError"
        :empty="projects.length === 0"
        loading-text="Projeler yükleniyor…"
        error-text="Projeler yüklenemedi."
        empty-text="Yeni çalışmalar yakında burada."
        @retry="reload"
      />
      <div v-if="!isLoading && !hasError && featuredProjects.length" class="work-grid">
        <RouterLink
          v-for="(project, index) in featuredProjects"
          :key="project.id"
          :to="`/projeler/${project.slug}`"
          class="work-link"
          :class="{ 'work-lead': index === 0 }"
        >
          <article>
            <div class="work-image">
              <img :src="project.image" :alt="project.title" loading="lazy" /><span
                class="work-open"
                aria-hidden="true"
                >↗</span
              >
            </div>
            <div class="work-info">
              <span class="work-number" aria-hidden="true">{{
                String(index + 1).padStart(2, '0')
              }}</span>
              <div>
                <p class="work-category">
                  {{ project.categories.map((category) => category.name).join(' · ') }}
                </p>
                <h3>{{ project.title }}</h3>
              </div>
              <span class="work-place">{{
                [project.location, project.year].filter(Boolean).join(' / ')
              }}</span>
            </div>
          </article>
        </RouterLink>
      </div>
    </section>

    <section class="approach" aria-labelledby="approach-title">
      <div class="home-container approach-grid">
        <p class="eyebrow">Yaklaşımımız</p>
        <div>
          <h2 id="approach-title">Bir fikirden,<br /><em>mekânın hissine.</em></h2>
          <p class="approach-description">
            Işığı, malzemeyi ve mekânı birlikte ele alıyoruz. Tasarım fikirlerini anlaşılır
            görsellere, hareketli anlatımlara ve uygulama örneklerine dönüştürüyoruz.
          </p>
          <div class="disciplines">
            <span>01 / Mimari tasarım</span><span>02 / 3D görselleştirme</span
            ><span>03 / Animasyon</span>
          </div>
          <RouterLink to="/hakkimizda" class="text-link"
            >Bizi tanıyın <span aria-hidden="true">↗</span></RouterLink
          >
        </div>
      </div>
    </section>

    <section class="home-container contact-invitation" aria-labelledby="contact-title">
      <div>
        <p class="eyebrow">Birlikte tasarlayalım</p>
        <h2 id="contact-title">Sıradaki hikâye <em>sizin projeniz.</em></h2>
      </div>
      <RouterLink to="/iletisim" class="contact-link"
        >Projenizi konuşalım <span aria-hidden="true">↗</span></RouterLink
      >
    </section>
  </div>
</template>

<style scoped>
.home-page {
  --home-accent: #6b7253;
  background: #f8f7f3;
  color: #242823;
}
.home-container {
  width: min(100%, 1344px);
  padding-inline: clamp(20px, 4vw, 64px);
  margin-inline: auto;
}
.eyebrow {
  margin: 0 0 16px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  line-height: 1.6;
}
.hero {
  position: relative;
  min-height: 440px;
  height: clamp(440px, 74svh, 760px);
  color: #fff;
  background: #30372f;
  isolation: isolate;
}
.hero-image,
.hero-shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.hero-image {
  object-fit: cover;
  object-position: center 58%;
  z-index: -2;
}
.hero-shade {
  background:
    linear-gradient(90deg, #111a18c9 0%, #17211a42 58%, #17211a0d 100%),
    linear-gradient(0deg, #15221da1, transparent 40%);
  z-index: -1;
}
.hero-inner {
  max-width: 1344px;
  margin-inline: auto;
  height: 100%;
  padding: 32px clamp(20px, 4vw, 64px) 24px;
  display: flex;
  flex-direction: column;
}
.hero-eyebrow {
  color: #eeeee5;
}
.hero-main {
  margin-block: auto;
  padding-block: 20px;
}
h1 {
  margin: 0;
  font-size: clamp(54px, 6.7vw, 98px);
  font-weight: 400;
  letter-spacing: -3.5px;
  line-height: 1.02;
}
em {
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 400;
}
.hero-main p {
  font-size: clamp(14px, 1.25vw, 17px);
  line-height: 1.7;
  color: #eceee8;
  margin: 22px 0 24px;
}
.hero-link {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  gap: 40px;
  padding: 13px 20px;
  background: #f8f7f3;
  color: #242823;
  text-decoration: none;
  font-size: 13px;
}
.hero-link:hover {
  background: #e3e7d9;
}
.hero-link span,
.text-link span {
  font-size: 21px;
}
.hero-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  border-top: 1px solid #ffffff45;
  padding-top: 16px;
  font-size: 10px;
  letter-spacing: 0.7px;
  line-height: 1.5;
}
.hero-divider {
  padding-inline: 14px;
  color: #ddd;
}
.hero-video-control {
  border: 1px solid #ffffff80;
  border-radius: 4px;
  padding: 8px 12px;
  min-height: 44px;
  background: #17211aa6;
  color: white;
  cursor: pointer;
  font-size: 12px;
}
.hero-video-control:focus-visible {
  outline: 3px solid #dbe2c9;
  outline-offset: 3px;
}
.hero-bottom a {
  display: inline-flex;
  align-items: center;
  gap: 22px;
  min-height: 32px;
  color: #fff;
  text-decoration: none;
}
.hero-bottom a span {
  font-size: 20px;
}
.selected-work {
  padding-block: 48px 80px;
  scroll-margin-top: 24px;
}
.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 32px;
}
.section-heading .eyebrow,
.approach .eyebrow,
.contact-invitation .eyebrow {
  color: #646b58;
}
h2 {
  margin: 0;
  font-size: clamp(28px, 3.2vw, 46px);
  line-height: 1.16;
  font-weight: 400;
  letter-spacing: -1.1px;
}
h2 em {
  display: inline;
}
.text-link {
  display: inline-flex;
  gap: 26px;
  align-items: center;
  min-height: 44px;
  padding-block: 8px;
  border-bottom: 1px solid #888e7c;
  text-decoration: none;
  white-space: nowrap;
  font-size: 13px;
}
.work-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 36px 28px;
}
.work-link {
  color: inherit;
  text-decoration: none;
  min-width: 0;
}
.work-lead {
  grid-column: 1 / -1;
}
.work-image {
  position: relative;
  overflow: hidden;
  background: #e6e7df;
  aspect-ratio: 4 / 3;
}
.work-lead .work-image {
  aspect-ratio: 2.35 / 1;
  max-height: 490px;
}
.work-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 400ms ease;
}
.work-link:hover img {
  transform: scale(1.025);
}
.work-open {
  position: absolute;
  right: 16px;
  bottom: 16px;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: #f8f7f3;
  font-size: 22px;
}
.work-info {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  padding-block: 18px;
  border-bottom: 1px solid #d9dcd1;
}
.work-number {
  font-size: 11px;
  color: #69715e;
  padding-top: 3px;
}
.work-category {
  margin: 0 0 7px;
  font-size: 10px;
  line-height: 1.5;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: #626958;
}
h3 {
  font-size: clamp(18px, 2vw, 25px);
  margin: 0;
  font-weight: 400;
  letter-spacing: -0.4px;
  overflow-wrap: anywhere;
}
.work-place {
  margin-left: auto;
  padding-top: 3px;
  font-size: 11px;
  line-height: 1.6;
  text-align: right;
  color: #646a5d;
  flex-shrink: 0;
}
.approach {
  background: #eeeee6;
  border-block: 1px solid #dedfd5;
  padding-block: 72px;
}
.approach-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 48px;
}
.approach-description {
  max-width: 580px;
  margin-block: 24px 30px;
  font-size: 16px;
  line-height: 1.85;
  color: #5e6558;
}
.disciplines {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  padding-block: 22px;
  margin-bottom: 16px;
  border-block: 1px solid #cfd2c3;
  font-size: 12px;
  color: #555f48;
}
.contact-invitation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  padding-block: 72px;
}
.contact-invitation h2 {
  max-width: 640px;
}
.contact-link {
  display: inline-flex;
  align-items: center;
  gap: 32px;
  min-height: 52px;
  padding: 14px 22px;
  background: #394332;
  color: #fff;
  text-decoration: none;
  font-size: 13px;
  white-space: nowrap;
}
.contact-link span {
  font-size: 22px;
}
a:focus-visible {
  outline: 3px solid #909f70;
  outline-offset: 5px;
}
@media (max-width: 700px) {
  .hero {
    min-height: 480px;
    height: auto;
  }
  .hero-inner {
    min-height: 480px;
    padding-top: 24px;
  }
  .hero-image {
    object-position: 65% center;
  }
  .hero-shade {
    background:
      linear-gradient(90deg, #14201bd9, #14201b38),
      linear-gradient(0deg, #14201bad, transparent 70%);
  }
  h1 {
    letter-spacing: -2px;
    font-size: clamp(52px, 13vw, 72px);
  }
  .hero-main {
    padding-block: 26px 32px;
  }
  .hero-bottom > span {
    display: none;
  }
  .hero-bottom {
    justify-content: flex-end;
    padding-top: 6px;
  }
  .hero-eyebrow {
    font-size: 9px;
    letter-spacing: 1.4px;
  }
  .selected-work {
    padding-block: 36px 48px;
  }
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }
  .section-heading .eyebrow {
    margin-bottom: 10px;
  }
  .work-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
  .work-lead .work-image {
    aspect-ratio: 4 / 3;
  }
  .work-info {
    gap: 12px;
    flex-wrap: wrap;
  }
  .work-info > div {
    flex: 1;
    min-width: 0;
  }
  .work-place {
    flex-basis: 100%;
    margin-left: 26px;
    padding-top: 0;
    text-align: left;
  }
  .approach {
    padding-block: 44px;
  }
  .approach-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  .approach-description {
    font-size: 15px;
  }
  .contact-invitation {
    padding-block: 44px;
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .work-image img {
    transition: none;
  }
}
</style>
