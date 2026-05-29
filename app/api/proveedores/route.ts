import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/* GET — lista paginada (opcional, por si se necesita) */
export async function GET() {
  const supabase = createAdminClient() as any
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('numero', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/* POST — crear proveedor */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, cuit, telefono, email, contacto, direccion, localidad, provincia, nota } = body
    if (!nombre?.trim()) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })

    const supabase = createAdminClient() as any
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ nombre: nombre.trim().toUpperCase(), cuit, telefono, email, contacto, direccion, localidad, provincia, nota })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
