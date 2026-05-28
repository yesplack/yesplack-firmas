import { createServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import SigningClient from './SigningClient'

export default async function FirmarPage({ params }: { params: { token: string } }) {
  const supabase = createServerClient()

  const { data: listRaw } = await (supabase as any)
    .from('price_lists')
    .select('*, clients(*)')
    .eq('token', params.token)
    .single()

  const list = listRaw as any
  if (!list) notFound()

  if (list.status === 'signed') {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: '#fff', borderRadius: '20px', padding: '40px 32px', maxWidth: '380px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
          <div style={{ width: '64px', height: '64px', background: '#e8f5e9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="32" height="32" fill="none" stroke="#00952e" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a2e1a', marginBottom: '8px' }}>Documento ya firmado</h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            El documento ya fue firmado el{' '}
            {new Date(list.signed_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <SigningClient
      token={params.token}
      pdfUrl={list.pdf_url}
      conditionsPdfUrl={list.conditions_pdf_url ?? null}
      fileName={list.file_name}
      description={list.description}
      clientName={(list.clients as any)?.nombre ?? 'Cliente'}
    />
  )
}
