import type { Router } from 'vue-router'

export function getSafeAdminRedirect(router: Router, value: unknown): string {
  const fallback = '/admin'
  if (typeof value !== 'string' || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback

  // Restrict the path before resolving it; queries and hashes may contain encoded text.
  const path = value.split(/[?#]/, 1)[0] ?? ''
  if (!/^\/admin(?:\/[a-z0-9-]+)*\/?$/i.test(path)) return fallback

  const target = router.resolve(value)
  if (target.name === 'admin-login' || !target.matched.some((record) => record.meta.requiresAuth)) {
    return fallback
  }

  return target.fullPath
}
