<script setup lang="ts">
import { computed, ref, watch } from 'vue'
const props = defineProps<{
  eager?: boolean
  youtubeId?: string
  url?: string
  poster?: string
  title: string
}>()
const playing = ref(Boolean(props.eager))
const validId = computed(() =>
  props.youtubeId && /^[A-Za-z0-9_-]{11}$/.test(props.youtubeId) ? props.youtubeId : null,
)
watch(
  () => [props.youtubeId, props.url, props.eager],
  () => {
    playing.value = Boolean(props.eager)
  },
)
</script>
<template>
  <div v-if="validId || url" class="project-video">
    <template v-if="validId">
      <iframe
        v-if="playing"
        :src="`https://www.youtube-nocookie.com/embed/${validId}?rel=0&playsinline=1`"
        :title="`${title} videosu`"
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
      ></iframe>
      <button v-else type="button" class="video-cover" @click="playing = true">
        <img v-if="poster" :src="poster" alt="" />
        <span>▶ Videoyu izle <small>YouTube oynatıcısını aç</small></span>
      </button>
      <a :href="`https://www.youtube.com/watch?v=${validId}`" target="_blank" rel="noopener"
        >YouTube'da aç ↗</a
      >
    </template>
    <video v-else controls playsinline preload="none" :poster="poster" :src="url">
      Tarayıcınız video oynatmayı desteklemiyor.
    </video>
  </div>
</template>
<style scoped>
.project-video {
  width: 100%;
  max-width: 960px;
}
iframe,
video,
.video-cover {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  min-height: 200px;
  border: 0;
  border-radius: 10px;
  background: #14292f;
}
video {
  object-fit: contain;
}
.video-cover {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  color: white;
}
.video-cover img {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
  object-fit: cover;
  opacity: 0.5;
}
.video-cover span {
  position: relative;
  display: inline-block;
  padding: 16px 24px;
  background: #102a32df;
  border-radius: 8px;
  font-size: 18px;
}
small {
  display: block;
  margin-top: 8px;
  font-size: 12px;
}
a {
  display: inline-block;
  padding: 12px 0;
  color: #31695f;
}
</style>
