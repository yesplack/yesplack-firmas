import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminNav from './AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Chequear must_change_password con el admin client (evita problemas de RLS)
  const admin = createAdminClient() as any
  const { data: profile } = await admin
    .from('profiles')
    .select('must_change_password')
    .eq('id', user.id)
    .single()

  // Si tiene clave temporal, redirigir a cambiar-clave (excepto si ya está ahí)
  if (profile?.must_change_password) {
    redirect('/cambiar-clave')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <AdminNav userEmail={user.email ?? ''} />
      <div style={{ position: 'fixed', top: 0, right: 0, width: '300px', height: '300px', background: 'radial-gradient(circle at top right, rgba(0,200,83,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <main style={{ position: 'relative', padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
