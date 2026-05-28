import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabaseUser = createServerClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { newPassword } = await req.json()

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    const admin = createAdminClient() as any

    // Actualizar la clave en auth
    const { error: authError } = await admin.auth.admin.updateUserById(user.id, { password: newPassword })
    if (authError) throw authError

    // Limpiar el flag must_change_password
    await admin
      .from('profiles')
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[/api/cambiar-clave POST]', err)
    return NextResponse.json({ error: err.message ?? 'Error al cambiar la contraseña' }, { status: 500 })
  }
}
