import { shallowRef, watch } from 'vue'
import type { MediaPreview } from '../types/ProjectForm'

export function useMediaPreviews(files: () => File[]) {
  const previews = shallowRef<MediaPreview[]>([])
  watch(
    files,
    (selected, _previous, onCleanup) => {
      const urls: string[] = []
      onCleanup(() => urls.forEach((url) => URL.revokeObjectURL(url)))
      previews.value = selected.map((file) => {
        const url = URL.createObjectURL(file)
        urls.push(url)
        return { name: file.name, url }
      })
    },
    { immediate: true },
  )
  return previews
}
