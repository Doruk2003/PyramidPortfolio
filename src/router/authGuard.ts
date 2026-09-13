import { watch } from 'vue'
import type { RouteLocationNormalized, Router } from 'vue-router'
import type { useAuth } from '../composables/useAuth'
import { getSafeAdminRedirect } from './authRedirect'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }
}

type AuthGuardState = Pick<ReturnType<typeof useAuth>, 'initialize' | 'isAuthenticated' | 'status'>

function requiresAuth(route: RouteLocationNormalized): boolean {
  return route.matched.some((record) => record.meta.requiresAuth)
}

export function installAuthGuard(router: Router, auth: AuthGuardState): () => void {
  const loginTarget = (fullPath: string) => ({
    name: 'admin-login',
    query: { redirect: getSafeAdminRedirect(router, fullPath) },
    replace: true,
  })

  const removeBeforeEach = router.beforeEach(async (to) => {
    if (!requiresAuth(to) && to.name !== 'admin-login') return true

    try {
      await auth.initialize()
    } catch {
      // An unavailable or failed initialization never grants protected access.
      return requiresAuth(to) ? loginTarget(to.fullPath) : true
    }

    if (requiresAuth(to) && !auth.isAuthenticated.value) return loginTarget(to.fullPath)
    if (to.name === 'admin-login' && auth.isAuthenticated.value) {
      return { path: getSafeAdminRedirect(router, to.query.redirect), replace: true }
    }
    return true
  })

  // A session can end while other guards or async route components are resolving.
  const removeBeforeResolve = router.beforeResolve((to) => {
    if (requiresAuth(to) && !auth.isAuthenticated.value) return loginTarget(to.fullPath)
    return true
  })

  const stopWatching = watch(auth.status, () => {
    const current = router.currentRoute.value
    if (
      auth.isAuthenticated.value ||
      auth.status.value === 'idle' ||
      auth.status.value === 'initializing' ||
      !requiresAuth(current)
    ) {
      return
    }

    // Defer navigation outside the provider's synchronous session callback.
    void router.replace(loginTarget(current.fullPath)).catch(() => {
      // AdminLayout also hides protected content immediately on session loss.
      // Router errors are reported through Vue Router's error handling.
    })
  })

  return () => {
    removeBeforeEach()
    removeBeforeResolve()
    stopWatching()
  }
}
