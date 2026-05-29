import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { uploadSignedPDF } from '@/lib/storage'
import { signPDF } from '@/lib/pdf-sign'
import { logAction, checkRateLimit } from '@/lib/audit'

export const runtime     = 'nodejs'
export const maxDuration = 10

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

/* ── GET: consulta de estado para polling ── */
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = createAdminClient() as any
  const { data, error } = await supabase
    .from('price_lists')
    .select('status, signed_at, signed_pdf_url, expires_at')
    .eq('token', params.token)
    .single()

  if (error || !data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Verificar expiración
  if (data.expires_at && new Date(data.expires_at) < new Date() && data.status !== 'signed') {
    return NextResponse.json({ expired: true, status: 'expired' }, { status: 410 })
  }

  return NextResponse.json({
    status:         data.status,
    signed_at:      data.signed_at,
    signed_pdf_url: data.signed_pdf_url,
    expires_at:     data.expires_at,
  })
}

/* ── POST: firma el documento ── */
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const log = (msg: string) => console.log(`[firmar/${params.token}] ${msg}`)
  const ip  = getIP(req)
  const ua  = req.headers.get('user-agent') ?? null

  try {
    const { token } = params

    // ── Rate limiting: máx 10 intentos por IP en 10 minutos ──────────
    const allowed = await checkRateLimit(ip, 'firma_intento', 10, 10)
    if (!allowed) {
      await logAction({ action: 'firma_bloqueada', ip, userAgent: ua, metadata: { token } })
      return NextResponse.json(
        { error: 'Demasiados intentos. Intentá de nuevo en unos minutos.' },
        { status: 429 }
      )
    }

    const { signatureBase64 } = await req.json() as { signatureBase64: string }

    if (!signatureBase64?.startsWith('data:image/png;base64,')) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
    }

    const supabase = createAdminClient() as any
    log('Buscando lista...')

    const { data: listRaw, error: fetchError } = await supabase
      .from('price_lists')
      .select('*, clients(*)')
      .eq('token', token)
      .single()

    if (fetchError || !listRaw) {
      await logAction({ action: 'firma_token_invalido', ip, userAgent: ua, metadata: { token } })
      return NextResponse.json({ error: 'Link inválido o expirado' }, { status: 404 })
    }

    const list = listRaw as any

    // ── Verificar expiración ────────────────────────────────────────
    if (list.expires_at && new Date(list.expires_at) < new Date()) {
      await logAction({
        action: 'firma_link_expirado', ip, userAgent: ua,
        entityType: 'price_list', entityId: list.id,
        metadata: { token, expires_at: list.expires_at, client: list.clients?.nombre }
      })
      return NextResponse.json(
        { error: 'Este link de firma ha expirado. Contactá a la empresa para obtener uno nuevo.', expired: true },
        { status: 410 }
      )
    }

    if (list.status === 'signed') {
      return NextResponse.json({ success: true, alreadySigned: true })
    }

    // ── Registrar intento de firma ──────────────────────────────────
    await logAction({
      action: 'firma_intento', ip, userAgent: ua,
      entityType: 'price_list', entityId: list.id,
      metadata: { token, client: list.clients?.nombre, file: list.file_name }
    })

    const pdfUrl = list.conditions_pdf_url ?? list.pdf_url
    log(`Descargando PDF: ${pdfUrl}`)

    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), 7000)

    let pdfBuffer: Buffer
    try {
      const response = await fetch(pdfUrl, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      pdfBuffer = Buffer.from(await response.arrayBuffer())
      log(`Descargado: ${pdfBuffer.length} bytes`)
    } catch (e: any) {
      clearTimeout(timeoutId)
      const msg = e.name === 'AbortError' ? 'Timeout descargando PDF' : e.message
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    log('Firmando...')
    const signedBytes = await signPDF({
      pdfBuffer,
      signatureBase64,
      clientName: list.clients?.nombre ?? 'Cliente',
      signedAt:   new Date(),
      documentType: list.document_type ?? 'price_list',
    })

    log('Subiendo...')
    const baseName = list.conditions_pdf_url ? `condiciones_${list.file_name}` : list.file_name
    const result   = await uploadSignedPDF(signedBytes, baseName, list.client_id, list.id)

    const { error: updateError } = await supabase
      .from('price_lists')
      .update({
        status:                    'signed',
        signed_pdf_url:            result.url,
        signed_conditions_pdf_url: result.url,
        signed_at:                 new Date().toISOString(),
        signer_ip:                 ip,
        signer_ua:                 ua,
      })
      .eq('id', list.id)

    if (updateError) throw updateError

    // ── Registrar firma exitosa ─────────────────────────────────────
    await logAction({
      action: 'firma_exitosa', ip, userAgent: ua,
      entityType: 'price_list', entityId: list.id,
      metadata: {
        token,
        client_id:   list.client_id,
        client_name: list.clients?.nombre,
        file_name:   list.file_name,
        doc_type:    list.document_type,
        signed_url:  result.url,
      }
    })

    log('OK')
    return NextResponse.json({ success: true, signedPdfUrl: result.url })

  } catch (err: any) {
    console.error('[firmar POST]', err)
    await logAction({
      action: 'firma_error', ip, userAgent: ua,
      metadata: { token: params.token, error: err.message }
    })
    return NextResponse.json({ error: err.message ?? 'Error al firmar' }, { status: 500 })
  }
}
