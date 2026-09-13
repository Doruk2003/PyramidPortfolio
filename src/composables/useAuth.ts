import { computed, readonly, ref } from 'vue'
import { authService, AuthServiceError, getAuthErrorCode } from '../services/authService'
import type {
  AuthErrorCode,
  AuthService,
  AuthSession,
  AuthStatus,
  SignInCredentials,
} from '../types/Auth'

export function createAuthState(service: AuthService) {
  const session = ref<AuthSession | null>(null)
  const publicSession = readonly(session)
  const status = ref<AuthStatus>('idle')
  const errorCode = ref<AuthErrorCode | null>(null)
  const operation = ref<'sign-in' | 'sign-out' | null>(null)
  let initialization: Promise<void> | null = null
  let unsubscribe: (() => void) | null = null
  let revision = 0
  let subscriptionId = 0
  let disposed = false

  function applySession(value: AuthSession | null) {
    // Copy only UI fields; provider tokens and mutable objects never escape here.
    session.value = value ? { user: { id: value.user.id, email: value.user.email } } : null
    status.value = value ? 'authenticated' : 'unauthenticated'
    errorCode.value = null
  }

  function initialize(): Promise<void> {
    if (disposed) return Promise.reject(new AuthServiceError('disposed'))
    if (initialization) return initialization
    if (status.value === 'authenticated' || status.value === 'unauthenticated') {
      return Promise.resolve()
    }
    if (!service.isConfigured) {
      status.value = 'unavailable'
      errorCode.value = 'not_configured'
      return Promise.resolve()
    }

    status.value = 'initializing'
    errorCode.value = null
    const startedAt = revision

    initialization = Promise.resolve()
      .then(async () => {
        if (disposed) return
        try {
          const currentSubscription = ++subscriptionId
          unsubscribe = service.subscribe((value) => {
            if (disposed || currentSubscription !== subscriptionId) return
            revision++
            applySession(value)
          })
          const value = await service.getSession()
          if (!disposed && revision === startedAt) applySession(value)
        } catch (error) {
          if (disposed || revision !== startedAt) return
          subscriptionId++
          unsubscribe?.()
          unsubscribe = null
          session.value = null
          status.value = 'error'
          errorCode.value = getAuthErrorCode(error)
        }
      })
      .finally(() => {
        initialization = null
      })

    return initialization
  }

  async function runOperation(
    kind: 'sign-in' | 'sign-out',
    execute: () => Promise<AuthSession | null>,
  ): Promise<void> {
    if (disposed) throw new AuthServiceError('disposed')
    if (operation.value) throw new AuthServiceError('busy')
    operation.value = kind

    try {
      await initialize()
      if (disposed) throw new AuthServiceError('disposed')
      if (status.value !== 'authenticated' && status.value !== 'unauthenticated') {
        throw new AuthServiceError(errorCode.value ?? 'unknown')
      }
      errorCode.value = null
      const startedAt = revision
      const result = await execute()
      if (disposed) throw new AuthServiceError('disposed')
      if (revision === startedAt) applySession(result)
    } catch (error) {
      const code = getAuthErrorCode(error)
      if (!disposed) errorCode.value = code
      throw new AuthServiceError(code)
    } finally {
      operation.value = null
    }
  }

  function signIn(credentials: SignInCredentials): Promise<void> {
    return runOperation('sign-in', () => service.signIn(credentials))
  }

  function signOut(): Promise<void> {
    return runOperation('sign-out', async () => {
      await service.signOut()
      return null
    })
  }

  function dispose() {
    if (disposed) return
    disposed = true
    revision++
    subscriptionId++
    unsubscribe?.()
    unsubscribe = null
    session.value = null
    status.value = 'idle'
    errorCode.value = null
  }

  return {
    session: publicSession,
    status: readonly(status),
    errorCode: readonly(errorCode),
    operation: readonly(operation),
    isConfigured: service.isConfigured,
    user: computed(() => publicSession.value?.user ?? null),
    isAuthenticated: computed(() => status.value === 'authenticated'),
    isInitializing: computed(() => status.value === 'initializing'),
    isBusy: computed(() => operation.value !== null),
    initialize,
    signIn,
    signOut,
    dispose,
  }
}

// One state and one provider subscription for the lifetime of this SPA.
const sharedAuth = createAuthState(authService)

export function useAuth() {
  return sharedAuth
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => sharedAuth.dispose())
}
