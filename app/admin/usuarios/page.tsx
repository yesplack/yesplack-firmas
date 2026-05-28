import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import UsuariosClientPage from './UsuariosClientPage'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  // Client normal para verificar que el usuario está autenticado
  const supabase = createServerClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Cliente admin (service role) para leer profiles sin que RLS bloquee
  const admin = createAdminClient() as any
  const { data: profile } = await admin
    .from('profiles')
    .select('role, can_create_users')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'master' && !(profile.role === 'admin' && profile.can_create_users))) {
    redirect('/admin/clientes')
  }

  return (
    <UsuariosClientPage
      currentRole={profile.role}
      currentUserId={user.id}
      currentCanCreate={profile.can_create_users ?? false}
    />
  )
}
