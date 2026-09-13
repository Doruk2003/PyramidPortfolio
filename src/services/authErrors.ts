import type { AuthErrorCode } from '../types/Auth'

export class AuthServiceError extends Error {
  readonly code: AuthErrorCode

  constructor(code: AuthErrorCode) {
    super(code)
    this.name = 'AuthServiceError'
    this.code = code
  }
}

export function getAuthErrorCode(error: unknown): AuthErrorCode {
  return error instanceof AuthServiceError ? error.code : 'unknown'
}
