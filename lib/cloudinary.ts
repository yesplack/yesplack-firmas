import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface UploadResult {
  url:      string
  publicId: string
  bytes:    number
}

/**
 * Sube un PDF a Cloudinary como archivo público.
 * Guarda la URL exacta que devuelve Cloudinary sin modificarla.
 */
export async function uploadPDF(
  buffer: Buffer,
  fileName: string,
  clientId: number,
  subfolder?: string,
): Promise<UploadResult> {
  const dataURI  = `data:application/pdf;base64,${buffer.toString('base64')}`
  // Sanitizar nombre pero conservar la extensión original intacta
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const folder   = subfolder
    ? `ombu-firmas/clients/${clientId}/${subfolder}`
    : `ombu-firmas/clients/${clientId}`

  const result = await cloudinary.uploader.upload(dataURI, {
    resource_type: 'raw',
    public_id:     `${folder}/${Date.now()}_${safeName}`,
    overwrite:     false,
    access_mode:   'public',
    type:          'upload',
  })

  // Usar la URL exacta de Cloudinary sin modificar
  return {
    url:      result.secure_url,
    publicId: result.public_id,
    bytes:    result.bytes,
  }
}

export async function uploadSignedPDF(
  pdfBytes: Uint8Array,
  originalFileName: string,
  clientId: number,
  listId: string,
): Promise<UploadResult> {
  const buffer   = Buffer.from(pdfBytes)
  const dataURI  = `data:application/pdf;base64,${buffer.toString('base64')}`
  const safeName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const publicId = `ombu-firmas/clients/${clientId}/signed/${listId}_${safeName}_FIRMADO.pdf`

  const result = await cloudinary.uploader.upload(dataURI, {
    resource_type: 'raw',
    public_id:     publicId,
    overwrite:     true,
    access_mode:   'public',
    type:          'upload',
  })

  return {
    url:      result.secure_url,
    publicId: result.public_id,
    bytes:    result.bytes,
  }
}

export async function downloadPDF(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Error descargando PDF: ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}
