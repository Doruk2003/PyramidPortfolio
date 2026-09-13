import { computed, onScopeDispose, ref, shallowRef } from 'vue'

export function useAsyncData<T>(loader: () => Promise<T>, initialValue: T) {
  const data = shallowRef<T>(initialValue)
  const status = ref<'loading' | 'success' | 'error'>('loading')
  let requestId = 0
  let disposed = false

  async function reload(): Promise<void> {
    if (disposed) return

    const currentRequest = ++requestId
    status.value = 'loading'

    try {
      const result = await loader()
      if (disposed || currentRequest !== requestId) return

      data.value = result
      status.value = 'success'
    } catch {
      if (disposed || currentRequest !== requestId) return
      status.value = 'error'
    }
  }

  onScopeDispose(() => {
    disposed = true
    requestId++
  })

  void reload()

  return {
    data,
    isLoading: computed(() => status.value === 'loading'),
    hasError: computed(() => status.value === 'error'),
    reload,
  }
}
