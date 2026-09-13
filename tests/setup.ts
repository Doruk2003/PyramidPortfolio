import { afterEach, beforeEach, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'

enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('Network requests are forbidden in unit tests')
    }),
  )
  let nextUrl = 0
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:test-${++nextUrl}`)
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

afterEach(() => vi.unstubAllGlobals())

// jsdom does not implement the browser's object URL API.
if (!URL.createObjectURL) URL.createObjectURL = () => ''
if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {}
