import { createAdminClient } from './supabase-server'

const BUCKET = 'pdfs'

export interface UploadResult {
  url:   string
  path:  string
  bytes: number
}

export async function uploadPDF(
  buffer: Buffer,
  fileName: string,
  clientId: number,
  subfolder?: string,
): Promise<UploadResult> {
  const supabase = createAdminClient() as any
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const folder   = subfolder ? `clients/${clientId}/${subfolder}` : `clients/${clientId}`
  const path     = `${folder}/${Date.now()}_${safeName}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType:  'application/pdf',
    cacheControl: '3600',
    upsert:       false,
  })
  if (error) throw new Error(`Error subiendo PDF: ${error.message}`)

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: urlData.publicUrl, path, bytes: buffer.length }
}

export async function uploadSignedPDF(
  pdfBytes: Uint8Array,
  originalFileName: string,
  clientId: number,
  listId: string,
): Promise<UploadResult> {
  const supabase = createAdminClient() as any
  const buffer   = Buffer.from(pdfBytes)
  const baseName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path     = `clients/${clientId}/signed/${listId}_${baseName}_FIRMADO.pdf`

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType:  'application/pdf',
    cacheControl: '3600',
    upsert:       true,
  })
  if (error) throw new Error(`Error subiendo PDF firmado: ${error.message}`)

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: urlData.publicUrl, path, bytes: buffer.length }
}

/**
 * Descarga un PDF desde una URL pública con timeout de 8 segundos.
 */
export async function downloadPDF(url: string): Promise<Buffer> {
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!response.ok) throw new Error(`HTTP ${response.status} descargando PDF`)
    return Buffer.from(await response.arrayBuffer())
  } catch (e: any) {
    clearTimeout(timeoutId)
    throw new Error(e.name === 'AbortError' ? 'Timeout descargando PDF' : e.message)
  }
}
