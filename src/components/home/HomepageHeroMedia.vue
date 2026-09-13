<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { defaultHomepageMedia } from '../../services/homepageMediaService'
import type { HomepageMedia } from '../../types/HomepageMedia'
const props = defineProps<{ settings: HomepageMedia }>()
const emit = defineEmits<{ state: [value: { playing: boolean; failed: boolean }] }>()
const container = ref<HTMLElement | null>(null)
const player = ref<HTMLVideoElement | null>(null)
const enabled = ref(false)
const ready = ref(false)
const posterFailed = ref(false)
const playing = ref(false)
const failed = ref(false)
let visible = false
let manualPaused = false
let manualPlayback = false
let active = false
let generation = 0
let preference: MediaQueryList | undefined
let observer: IntersectionObserver | undefined
watch([playing, failed], () => emit('state', { playing: playing.value, failed: failed.value }), {
  immediate: true,
})
function pause() {
  generation++
  player.value?.pause()
  playing.value = false
}
async function start() {
  if (!active || props.settings.mode !== 'video' || !props.settings.videoUrl) return
  const current = ++generation
  enabled.value = true
  await nextTick()
  if (!active || current !== generation || !player.value) return
  player.value.muted = true
  try {
    await player.value.play()
  } catch {
    if (active && current === generation) {
      playing.value = false
      failed.value = true
    }
  }
}
function reconcile() {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    ?.saveData
  const allowed = manualPlayback || (!preference?.matches && !saveData)
  if (active && visible && !document.hidden && !manualPaused && !failed.value && allowed)
    void start()
  else pause()
}
async function toggle() {
  if (playing.value) {
    manualPaused = true
    manualPlayback = false
    pause()
  } else {
    if (failed.value) {
      enabled.value = false
      ready.value = false
      await nextTick()
    }
    manualPaused = false
    manualPlayback = true
    failed.value = false
    void start()
  }
}
function videoPlaying() {
  playing.value = true
  ready.value = true
}
function videoError() {
  ready.value = false
  failed.value = true
  pause()
}
watch(
  () => [props.settings.mode, props.settings.videoUrl],
  () => {
    pause()
    enabled.value = false
    ready.value = false
    failed.value = false
    manualPaused = false
    manualPlayback = false
    reconcile()
  },
)
watch(
  () => props.settings.posterUrl,
  () => {
    posterFailed.value = false
  },
)
onMounted(() => {
  active = true
  preference =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 700px), (prefers-reduced-motion: reduce)')
      : undefined
  preference?.addEventListener('change', reconcile)
  document.addEventListener('visibilitychange', reconcile)
  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.2)
        reconcile()
      },
      { threshold: [0, 0.2] },
    )
    if (container.value) observer.observe(container.value)
  } else {
    visible = true
    reconcile()
  }
})
onBeforeUnmount(() => {
  active = false
  pause()
  observer?.disconnect()
  preference?.removeEventListener('change', reconcile)
  document.removeEventListener('visibilitychange', reconcile)
})
defineExpose({ toggle })
</script>
<template>
  <div ref="container" class="hero-media">
    <img
      :src="posterFailed ? defaultHomepageMedia.posterUrl : settings.posterUrl"
      @error="posterFailed = true"
      alt="Mimari proje açılış görseli"
      fetchpriority="high"
      width="1600"
      height="1053"
    />
    <video
      v-if="enabled && settings.videoUrl"
      v-show="ready"
      ref="player"
      :src="settings.videoUrl"
      :poster="settings.posterUrl"
      muted
      loop
      playsinline
      preload="none"
      aria-hidden="true"
      tabindex="-1"
      @canplay="ready = true"
      @playing="videoPlaying"
      @pause="playing = false"
      @error="videoError"
    ></video>
  </div>
</template>
<style scoped>
.hero-media {
  position: absolute;
  inset: 0;
  z-index: -2;
}
img,
video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 58%;
}
@media (max-width: 700px) {
  img,
  video {
    object-position: 65% center;
  }
}
</style>
