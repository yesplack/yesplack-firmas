import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase-server'
import { uploadPDF } from '@/lib/storage'
import { logAction } from '@/lib/audit'

export const runtime     = 'nodejs'
export const maxDuration = 30

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUser = createServerClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const form        = await req.formData()
    const listFile    = form.get('file')           as File | null
    const condFile    = form.get('conditionsFile') as File | null
    const clientId    = form.get('clientId')       as string | null
    const supplierId  = form.get('supplierId')     as string | null   // ← nuevo
    const desc        = (form.get('description')   as string) ?? ''
    const docType     = (form.get('documentType')  as string) ?? (form.get('document_type') as string) ?? 'price_list'
    const expiresDays = parseInt((form.get('expiryDays') as string) ?? (form.get('expires_days') as string) ?? '30', 10)

    if (!listFile) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }
    if (!clientId && !supplierId) {
      return NextResponse.json({ error: 'Se requiere clientId o supplierId' }, { status: 400 })
    }
    if (listFile.type !== 'application/pdf') {
      return NextResponse.json({ error: 'El archivo debe ser un PDF' }, { status: 400 })
    }
    if (listFile.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'El PDF no puede superar 20 MB' }, { status: 400 })
    }

    const cid       = clientId   ? parseInt(clientId, 10)   : null
    const sid       = supplierId ? parseInt(supplierId, 10) : null
    const entityId  = cid ?? sid!
    const folder    = supplierId ? 'proveedores' : 'listas'
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString()

    const listBuffer = Buffer.from(await listFile.arrayBuffer())
    const listResult = await uploadPDF(listBuffer, listFile.name, entityId, folder)

    let condUrl: string | null = null
    if (condFile && condFile.type === 'application/pdf') {
      const condBuffer = Buffer.from(await condFile.arrayBuffer())
      const condResult = await uploadPDF(condBuffer, condFile.name, entityId, 'condiciones')
      condUrl = condResult.url
    }

    const supabase = createAdminClient() as any
    const { data, error } = await supabase
      .from('price_lists')
      .insert({
        client_id:          cid,
        supplier_id:        sid,          // ← nuevo
        file_name:          listFile.name,
        description:        desc || null,
        pdf_url:            listResult.url,
        conditions_pdf_url: condUrl,
        document_type:      docType,
        expires_at:         expiresAt,
      })
      .select()
      .single()

    if (error) throw error

    await logAction({
      action: 'documento_subido', entityType: 'price_list', entityId: data.id,
      userId: user.id, ip: getIP(req), userAgent: req.headers.get('user-agent'),
      metadata: { client_id: cid, supplier_id: sid, file_name: listFile.name, doc_type: docType, expires_at: expiresAt },
    })

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('[/api/listas POST]', err)
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabaseUser = createServerClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const admin = createAdminClient() as any

    const { data: list, error: fetchErr } = await admin
      .from('price_lists')
      .select('pdf_url, conditions_pdf_url, signed_pdf_url, signed_conditions_pdf_url, file_name, client_id, supplier_id, document_type')
      .eq('id', id)
      .single()

    if (fetchErr || !list) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    const urlToPath = (url: string | null): string | null => {
      if (!url) return null
      try {
        const match = url.match(/\/public\/pdfs\/(.+)/)
        return match ? match[1] : null
      } catch { return null }
    }

    const pathsToDel = [
      urlToPath(list.pdf_url),
      urlToPath(list.conditions_pdf_url),
      urlToPath(list.signed_pdf_url),
      urlToPath(list.signed_conditions_pdf_url),
    ].filter(Boolean) as string[]

    if (pathsToDel.length > 0) {
      const { error: storageErr } = await admin.storage.from('pdfs').remove(pathsToDel)
      if (storageErr) console.error('[DELETE lista] storage error:', storageErr.message)
    }

    const { error: deleteErr } = await admin.from('price_lists').delete().eq('id', id)
    if (deleteErr) throw deleteErr

    await logAction({
      action: 'documento_eliminado', entityType: 'price_list', entityId: id,
      userId: user.id, ip: getIP(req), userAgent: req.headers.get('user-agent'),
      metadata: { file_name: list.file_name, client_id: list.client_id, supplier_id: list.supplier_id, doc_type: list.document_type, files_deleted: pathsToDel.length },
    })

    return NextResponse.json({ success: true, deleted_files: pathsToDel.length })
  } catch (err: any) {
    console.error('[/api/listas DELETE]', err)
    return NextResponse.json({ error: err.message ?? 'Error al eliminar' }, { status: 500 })
  }
}
