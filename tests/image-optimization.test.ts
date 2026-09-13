import { afterEach, describe, expect, it, vi } from 'vitest'
import { optimizeImage } from '../src/services/imageOptimization'
import { useProjectForm } from '../src/composables/useProjectForm'
import { deferred, inScope } from './helpers'
import type { OptimizedImage } from '../src/services/imageOptimization'

function encoder(width = 5000, height = 2500, bytes = 100) {
  const close = vi.fn()
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width, height, close }))
  const drawImage = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D)
  let dimensions: number[] = []
  const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback,
    type,
  ) {
    dimensions = [this.width, this.height]
    callback(new Blob([new Uint8Array(bytes)], { type }))
  })
  return { close, encode, dimensions: () => dimensions }
}
const file = () =>
  new File([new Uint8Array(1000)], 'cover.jpg', { type: 'image/jpeg', lastModified: 42 })
function selection(files: File[]) {
  return { target: { files, value: '' } } as unknown as Event
}
afterEach(() => vi.restoreAllMocks())

describe('Image preparation', () => {
  it('resizes photos proportionally, uses a matching WebP filename and frees the bitmap', async () => {
    const codec = encoder()
    const result = await optimizeImage(file(), 'photo')
    expect(codec.dimensions()).toEqual([2560, 1280])
    expect(result.file.name).toBe('cover.webp')
    expect(result.file.type).toBe('image/webp')
    expect(result.originalBytes).toBe(1000)
    expect(result.file.size).toBe(100)
    expect(result.file.lastModified).toBe(42)
    expect(codec.close).toHaveBeenCalledOnce()
  })
  it('preserves drawing resolution and uses lossless PNG encoding', async () => {
    const codec = encoder()
    const result = await optimizeImage(
      new File([new Uint8Array(1000)], 'drawing.png', { type: 'image/png' }),
      'design',
    )
    expect(codec.dimensions()).toEqual([5000, 2500])
    expect(result.file.type).toBe('image/png')
  })
  it('does not enlarge small images and retains originals when encoding increases size', async () => {
    const codec = encoder(640, 480, 2000)
    const original = file()
    expect((await optimizeImage(original, 'photo')).file).toBe(original)
    expect(codec.dimensions()).toEqual([640, 480])
  })
  it('preserves the original on decode failure', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')))
    const original = file()
    const result = await optimizeImage(original, 'photo')
    expect(result.file).toBe(original)
    expect(result.note).toContain('Önizlemeyi kontrol edin')
  })
  it('avoids a second raster allocation for huge images', async () => {
    const codec = encoder(20000, 10000)
    const original = file()
    expect((await optimizeImage(original, 'photo')).file).toBe(original)
    expect(codec.encode).not.toHaveBeenCalled()
    expect(codec.close).toHaveBeenCalledOnce()
  })
  it('keeps form state intact while preparing and ignores completion after disposal', async () => {
    const pending = deferred<OptimizedImage>()
    const optimize = vi.fn().mockReturnValue(pending.promise)
    const { value: state, stop } = inScope(() => useProjectForm(false, optimize))
    const original = file()
    const first = state.handleMainImage(selection([original]))
    expect(state.isPreparingMedia.value).toBe(true)
    expect(state.isDirty.value).toBe(true)
    await state.handleMainImage(selection([original]))
    expect(optimize).toHaveBeenCalledOnce()
    expect(state.form.imageFile).toBeNull()
    stop()
    pending.resolve({ file: original, originalBytes: original.size, note: '' })
    await first
    expect(state.form.imageFile).toBeNull()
  })
  it('deduplicates original selections even after conversion and updates size information on removal', async () => {
    const converted = new File(['small'], 'cover.webp', { type: 'image/webp' })
    const optimize = vi
      .fn()
      .mockResolvedValue({ file: converted, originalBytes: 1000, note: 'WebP' })
    const { value: state } = inScope(() => useProjectForm(false, optimize))
    const original = file()
    await state.handleGalleryImages(selection([original]))
    await state.handleGalleryImages(selection([original]))
    expect(optimize).toHaveBeenCalledExactlyOnceWith(original, 'design')
    expect(state.form.galleryFiles).toEqual([converted])
    expect(state.mediaPreparation.value[0]?.bytes).toBe(5)
    state.removeMedia('galleryFiles', 0)
    expect(state.mediaPreparation.value).toEqual([])
  })
})

describe('Large image sources', () => {
  function largePng() {
    const image = new File(['png'], 'large.png', { type: 'image/png' })
    Object.defineProperty(image, 'size', { value: 50 * 1024 * 1024, configurable: true })
    return image
  }
  it('tries WebP and smaller dimensions when PNG and full-size WebP exceed 10 MB', async () => {
    const codec = encoder(6000, 4000)
    const sizes: number[][] = []
    codec.encode.mockImplementation(function (this: HTMLCanvasElement, callback, type) {
      sizes.push([this.width, this.height])
      const blob = new Blob(['encoded'], { type })
      Object.defineProperty(blob, 'size', {
        value: this.width > 4500 ? 12 * 1024 * 1024 : 8 * 1024 * 1024,
      })
      callback(blob)
    })
    const result = await optimizeImage(largePng(), 'design')
    expect(result.file.type).toBe('image/webp')
    expect(result.note).toContain('4500 × 3000')
    expect(sizes).toEqual([
      [6000, 4000],
      [6000, 4000],
      [4500, 3000],
    ])
    expect(codec.close).toHaveBeenCalledOnce()
  })
  it('accepts a 50 MB source in the form after preparation', async () => {
    const image = largePng()
    const small = new File(['encoded'], 'large.webp', { type: 'image/webp' })
    const optimize = vi
      .fn()
      .mockResolvedValue({ file: small, originalBytes: image.size, note: 'WebP' })
    const { value: state } = inScope(() => useProjectForm(false, optimize))
    await state.handleMainImage(selection([image]))
    expect(optimize).toHaveBeenCalledWith(image, 'photo')
    expect(state.form.imageFile).toBe(small)
    expect(state.errors.imageFile).toBeUndefined()
  })
  it('rejects oversized preparation results and preserves the previous gallery', async () => {
    const image = largePng()
    const optimize = vi.fn().mockResolvedValue({ file: image, originalBytes: image.size, note: '' })
    const { value: state } = inScope(() => useProjectForm(false, optimize))
    const previous = file()
    state.form.galleryFiles = [previous]
    await state.handleGalleryImages(selection([image]))
    expect(state.form.galleryFiles).toEqual([previous])
    expect(state.errors.galleryFiles).toContain('10 MB')
    expect(state.isPreparingMedia.value).toBe(false)
  })
  it('rejects sources over 100 MB before decoding', async () => {
    const image = largePng()
    Object.defineProperty(image, 'size', { value: 101 * 1024 * 1024 })
    const optimize = vi.fn()
    const { value: state } = inScope(() => useProjectForm(false, optimize))
    await state.handleMainImage(selection([image]))
    expect(optimize).not.toHaveBeenCalled()
    expect(state.errors.imageFile).toContain('100 MB')
  })
})
