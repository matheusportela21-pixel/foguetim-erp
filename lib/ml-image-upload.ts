/**
 * Client-side utility for uploading images to Mercado Livre via our API route.
 * Flow: validate → multipart POST → server handles Supabase temp + ML.
 */

const MIN_DIMENSION = 500

export interface UploadResult {
  success:    boolean
  pictureId?: string
  error?:     string
}

/** Validates image dimensions in-browser before upload. */
async function validateDimensions(file: File): Promise<{ ok: boolean; error?: string }> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.width < MIN_DIMENSION || img.height < MIN_DIMENSION) {
        resolve({
          ok:    false,
          error: `Imagem muito pequena: ${img.width}×${img.height}px. Mínimo ${MIN_DIMENSION}×${MIN_DIMENSION}px.`,
        })
      } else {
        resolve({ ok: true })
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ ok: false, error: 'Imagem inválida ou corrompida' })
    }

    img.src = url
  })
}

/**
 * Upload an image file to Mercado Livre for the given item.
 * Validates dimensions client-side, then POSTs to our server route.
 *
 * @param file   - The image File object
 * @param itemId - ML item ID (e.g. MLB123456789)
 * @param onProgress - Optional progress callback (0–100)
 */
export async function uploadImageToML(
  file:        File,
  itemId:      string,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  // 1. Client-side dimension check
  const dim = await validateDimensions(file)
  if (!dim.ok) return { success: false, error: dim.error }

  // 2. Build multipart form
  const form = new FormData()
  form.append('file', file)

  try {
    // Use XMLHttpRequest for upload progress support
    const result = await new Promise<UploadResult>((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `/api/mercadolivre/items/${itemId}/upload-image`)

      if (onProgress) {
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100))
          }
        }
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText) as { ok?: boolean; pictureId?: string; error?: string }
          if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
            resolve({ success: true, pictureId: data.pictureId })
          } else {
            resolve({ success: false, error: data.error ?? `Erro HTTP ${xhr.status}` })
          }
        } catch {
          resolve({ success: false, error: 'Resposta inválida do servidor' })
        }
      }

      xhr.onerror = () => resolve({ success: false, error: 'Erro de rede' })
      xhr.send(form)
    })

    return result
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
