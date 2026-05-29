'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import SupplierUploadModal from './SupplierUploadModal'
import LinkModal from '@/app/admin/clientes/[id]/LinkModal'

type DocType = 'op' | 'oc'

interface Doc {
  id:             string
  file_name:      string
  description:    string | null
  status:         'pending' | 'signed'
  pdf_url:        string
  signed_pdf_url: string | null
  token:          string
  uploaded_at:    string
  signed_at:      string | null
  document_type:  DocType
}

interface Props {
  supplierId:   number
  supplierName: string
  initial:      Doc[]
}

const DOC_TYPE_CONFIG: Record<DocType, { label: string; color: string; bg: string; border: string }> = {
  op: { label: 'Orden de Pago',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  oc: { label: 'Orden de Compra', color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.3)' },
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function SupplierDocsLive({ supplierId, supplierName, initial }: Props) {
  const [docs,     setDocs]     = useState<Doc[]>(initial)
  const [flash,    setFlash]    = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { setDocs(initial) }, [initial])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const channel = supabase
      .channel(`price_lists_supplier_${supplierId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'price_lists',
        filter: `supplier_id=eq.${supplierId}`,
      }, (payload) => {
        if      (payload.eventType === 'INSERT') setDocs(prev => [payload.new as Doc, ...prev])
        else if (payload.eventType === 'UPDATE') {
          setDocs(prev => prev.map(d => d.id === payload.new.id ? payload.new as Doc : d))
          if ((payload.new as any).status === 'signed') {
            setFlash(payload.new.id)
            setTimeout(() => setFlash(null), 3000)
          }
        }
        else if (payload.eventType === 'DELETE') setDocs(prev => prev.filter(d => d.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supplierId])

  async function handleDelete(doc: Doc) {
    if (!confirm(`¿Eliminar "${doc.file_name}"?`)) return
    setDeleting(doc.id)
    try {
      const res  = await fetch('/api/listas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: doc.id }) })
      const json = await res.json()
      if (!res.ok) { alert(json.error ?? 'Error al eliminar'); return }
      setDocs(prev => prev.filter(d => d.id !== doc.id))
    } finally { setDeleting(null) }
  }

  const signed  = docs.filter(d => d.status === 'signed').length
  const pending = docs.filter(d => d.status === 'pending').length

  return (
    <>
      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ padding: '10px 18px', background: 'var(--bg-card)', border: '1.5px solid rgba(0,200,83,0.25)', borderRadius: '12px', textAlign: 'center', minWidth: '80px' }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '24px', color: 'var(--ombu-green)' }}>{signed}</div>
          <div className="section-label" style={{ fontSize: '10px' }}>Firmados</div>
        </div>
        <div style={{ padding: '10px 18px', background: 'var(--bg-card)', border: '1.5px solid rgba(255,170,0,0.25)', borderRadius: '12px', textAlign: 'center', minWidth: '80px' }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '24px', color: '#ffaa00' }}>{pending}</div>
          <div className="section-label" style={{ fontSize: '10px' }}>Pendientes</div>
        </div>
        <div style={{ padding: '10px 18px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '12px', textAlign: 'center', minWidth: '80px' }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '24px', color: 'var(--text-secondary)' }}>{docs.length}</div>
          <div className="section-label" style={{ fontSize: '10px' }}>Total</div>
        </div>
      </div>

      {/* Card documentos */}
      <div className="xbox-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,215,0,0.03)' }}>
          <div>
            <div className="section-label" style={{ fontSize: '10px', marginBottom: '1px' }}>Historial</div>
            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '0.06em' }}>
              ÓRDENES PARA FIRMA
            </h2>
          </div>
          <SupplierUploadModal supplierId={supplierId} supplierName={supplierName} />
        </div>

        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {docs.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sin órdenes cargadas aún.</p>
            </div>
          )}

          {docs.map(doc => {
            const docCfg = DOC_TYPE_CONFIG[doc.document_type] ?? DOC_TYPE_CONFIG['op']
            return (
              <div key={doc.id} style={{
                background: flash === doc.id ? 'rgba(0,200,83,0.08)' : 'var(--bg-card)',
                border: `1.5px solid ${flash === doc.id ? 'rgba(0,200,83,0.6)' : 'var(--border)'}`,
                borderRadius: '12px', padding: '13px 15px',
                display: 'flex', alignItems: 'center', gap: '12px',
                transition: 'all 0.4s ease',
                opacity: deleting === doc.id ? 0.5 : 1,
              }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0, background: docCfg.bg, border: `1px solid ${docCfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" fill="none" stroke={docCfg.color} strokeWidth={1.8} viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {doc.file_name}
                  </div>
                  {doc.description && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', fontWeight: 700, background: docCfg.bg, border: `1px solid ${docCfg.border}`, color: docCfg.color, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em' }}>
                      {docCfg.label}
                    </span>
                    <span className={`badge ${doc.status === 'signed' ? 'badge-signed' : 'badge-pending'}`}>
                      {doc.status === 'signed' ? '✓ Firmado' : 'Pendiente'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fmtDate(doc.uploaded_at)}</span>
                    {doc.signed_at && <span style={{ fontSize: '11px', color: 'var(--ombu-green)' }}>· Firmado {fmtDate(doc.signed_at)}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                  {doc.status === 'pending' && (
                    <LinkModal token={doc.token} clientName={supplierName} fileName={doc.file_name} />
                  )}
                  {doc.signed_pdf_url && (
                    <a href={doc.signed_pdf_url} target="_blank" rel="noopener noreferrer" className="btn-xbox" style={{ fontSize: '11px', padding: '5px 10px', color: 'var(--ombu-green)' }}>
                      PDF firmado
                    </a>
                  )}
                  <a href={doc.pdf_url} target="_blank" rel="noopener noreferrer" className="btn-xbox" style={{ fontSize: '11px', padding: '5px 10px' }}>Ver</a>
                  <button onClick={() => handleDelete(doc)} disabled={deleting === doc.id} title="Eliminar"
                    style={{ padding: '5px 8px', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.35)', background: 'rgba(220,38,38,0.07)', color: '#f87171', cursor: deleting === doc.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
