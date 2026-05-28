import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar sesión activa
    const supabaseUser = createServerClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword) return NextResponse.json({ error: 'Contraseña actual requerida' }, { status: 400 })
    if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' }, { status: 400 })

    // 2. Verificar contraseña actual — cliente temporal sin cookies
    const verifyClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error: verifyError } = await verifyClient.auth.signInWithPassword({
      email:    user.email!,
      password: currentPassword,
    })

    if (verifyError) {
      return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 })
    }

    // 3. Actualizar contraseña
    const admin = createAdminClient() as any
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    })
    if (updateError) throw updateError

    // 4. Asegurarse de que must_change_password quede en false
    await admin
      .from('profiles')
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[/api/cambiar-clave-propia POST]', err)
    return NextResponse.json({ error: err.message ?? 'Error al cambiar la contraseña' }, { status: 500 })
  }
}
