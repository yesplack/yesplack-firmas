import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, tipo, vendedor, telefono, email, cuit, direccion, localidad, provincia, iva, nota } = body

    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    const supabase = createAdminClient() as any

    // Obtener el próximo ID disponible
    const { data: maxRow } = await supabase
      .from('clients')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single()

    const nextId = (maxRow?.id ?? 0) + 1

    const { data, error } = await supabase
      .from('clients')
      .insert({
        id:        nextId,
        nombre:    nombre.trim().toUpperCase(),
        tipo:      tipo      || 'SALON',
        vendedor:  vendedor  || null,
        telefono:  telefono  || null,
        email:     email     || null,
        cuit:      cuit      || null,
        direccion: direccion || null,
        localidad: localidad || null,
        provincia: provincia || null,
        iva:       iva       || null,
        nota:      nota      || null,
        estado:    'Pendiente',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('[/api/clientes POST]', err)
    return NextResponse.json({ error: err.message ?? 'Error al crear el cliente' }, { status: 500 })
  }
}
