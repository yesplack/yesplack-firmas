import { NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ role: null })

    const admin = createAdminClient() as any
    const { data: profile } = await admin.from('profiles').select('role, username, nickname, can_create_users').eq('id', user.id).single()

    return NextResponse.json(profile ?? { role: 'master' }) // fallback para el usuario inicial sin perfil
  } catch {
    return NextResponse.json({ role: 'master' })
  }
}
