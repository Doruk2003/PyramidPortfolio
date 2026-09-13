import { PROJECT_FORM_RULES } from '../constants/projectFormRules'
export type ImagePurpose = 'photo' | 'design'
export interface OptimizedImage {
  file: File
  originalBytes: number
  note: string
}

/** Prepare locally; the upload validator remains the final 10 MB boundary. */
export async function optimizeImage(file: File, purpose: ImagePurpose): Promise<OptimizedImage> {
  const original = (note: string): OptimizedImage => ({ file, originalBytes: file.size, note })
  if (file.size > PROJECT_FORM_RULES.imageSourceMaxBytes)
    return original('Kaynak görsel 100 MB sınırını aşıyor.')
  if (typeof createImageBitmap !== 'function') {
    return original('Bu tarayıcıda otomatik hazırlama desteklenmiyor; özgün dosya kullanılacak.')
  }
  let bitmap: ImageBitmap | undefined
  let canvas: HTMLCanvasElement | undefined
  try {
    bitmap = await createImageBitmap(file)
    // The first decode still depends on browser memory. Bound subsequent canvas allocations.
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 100_000_000) {
      return original('Görselin piksel sayısı çok büyük; özgün dosya kullanılacak.')
    }
    let scale = Math.min(
      1,
      Math.sqrt(40_000_000 / (bitmap.width * bitmap.height)),
      (purpose === 'design' ? 8192 : 2560) / Math.max(bitmap.width, bitmap.height),
    )
    canvas = document.createElement('canvas')
    const quality = purpose === 'design' ? 0.95 : 0.88
    for (let attempt = 0; attempt < 7; attempt++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d')
      if (!context) return original('Görsel hazırlanamadı; özgün dosya kullanılacak.')
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      // Try lossless PNG first. Oversized PNG may switch to WebP, preserving transparency.
      const formats =
        file.type === 'image/png' && attempt === 0 ? ['image/png', 'image/webp'] : ['image/webp']
      for (const mime of formats) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas!.toBlob(resolve, mime, quality),
        )
        if (!blob || blob.type !== mime || !blob.size) continue
        if (blob.size <= PROJECT_FORM_RULES.imageMaxBytes) {
          if (blob.size >= file.size)
            return original('Daha küçük bir dosya üretilemedi; özgün dosya kullanılacak.')
          const result = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '') + (mime === 'image/png' ? '.png' : '.webp'),
            { type: mime, lastModified: file.lastModified },
          )
          return {
            file: result,
            originalBytes: file.size,
            note: `${canvas.width} × ${canvas.height} px · ${mime === 'image/png' ? 'PNG' : 'WebP'}${scale < 1 ? ' · Çözünürlük küçültüldü' : ''}`,
          }
        }
        // Small PNG originals do not need a lossy conversion solely to meet the upload limit.
        if (file.size <= PROJECT_FORM_RULES.imageMaxBytes && mime === 'image/png')
          return original('Özgün PNG dosyası kullanılacak.')
      }
      if (file.size <= PROJECT_FORM_RULES.imageMaxBytes) break
      scale *= 0.75
    }
    return original('Görsel 10 MB altına indirilemedi; daha küçük bir görsel seçin.')
  } catch {
    return original('Görsel hazırlanamadı; özgün dosya kullanılacak. Önizlemeyi kontrol edin.')
  } finally {
    bitmap?.close()
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
  }
}
