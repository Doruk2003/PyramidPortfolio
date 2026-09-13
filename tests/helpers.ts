import { onTestFinished, vi } from 'vitest'
import { effectScope } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { AuthService, AuthSession, AuthSessionListener } from '../src/types/Auth'
import type { CreateProjectInput } from '../src/types/ProjectForm'

export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

export function inScope<T>(setup: () => T): { value: T; stop: () => void } {
  const scope = effectScope()
  onTestFinished(() => scope.stop())
  return { value: scope.run(setup)!, stop: () => scope.stop() }
}

export const session: AuthSession = { user: { id: 'test-admin', email: 'admin@example.test' } }
export function authServiceFixture() {
  let listener: AuthSessionListener = () => {}
  const unsubscribe = vi.fn()
  const service = {
    isConfigured: true,
    getSession: vi.fn<AuthService['getSession']>().mockResolvedValue(null),
    signIn: vi.fn<AuthService['signIn']>().mockResolvedValue(session),
    signOut: vi.fn<AuthService['signOut']>().mockResolvedValue(undefined),
    subscribe: vi.fn((callback: AuthSessionListener) => {
      listener = callback
      return unsubscribe
    }),
  } satisfies AuthService
  return { service, unsubscribe, emit: (value: AuthSession | null) => listener(value) }
}

export function testRouter() {
  const component = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component },
      { path: '/admin/login', name: 'admin-login', component },
      { path: '/admin', name: 'admin-dashboard', component, meta: { requiresAuth: true } },
      { path: '/admin/projects', name: 'admin-projects', component, meta: { requiresAuth: true } },
    ],
  })
}

export function projectInput(): CreateProjectInput {
  return {
    title: 'Cam Balkon',
    slug: 'cam-balkon',
    categoryIds: [1],
    retainedMedia: [],
    description: '',
    location: '',
    year: 2026,
    status: 'design',
    imageFile: new File(['image'], 'cover.jpg', { type: 'image/jpeg' }),
    galleryFiles: [],
    applicationFiles: [],
    videoFile: null,
  }
}
