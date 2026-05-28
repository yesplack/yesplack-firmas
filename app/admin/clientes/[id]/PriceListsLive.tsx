'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import UploadModal from './UploadModal'
import LinkModal   from './LinkModal'

type DocType = 'price_list' | 'invoice' | 'remito'

interface PriceList {
  id:                        string
  file_name:                 string
  description:               string | null
  status:                    'pending' | 'signed'
  pdf_url:                   string
  signed_pdf_url:            string | null
  conditions_pdf_url:        string | null
  signed_conditions_pdf_url: string | null
  token:                     string
  uploaded_at:               string
  signed_at:                 string | null
  document_type:             DocType
}

interface Props {
  clientId:   number
  clientName: string
  initial:    PriceList[]
}

const DOC_TYPE_CONFIG: Record<DocType, { label: string; color: string; bg: string; border: string }> = {
  price_list: { label: 'Lista de precios', color: '#00c853',  bg: 'rgba(0,200,83,0.1)',    border: 'rgba(0,200,83,0.3)'    },
  invoice:    { label: 'Factura',          color: '#60a5fa',  bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.3)'  },
  remito:     { label: 'Remito',           color: '#c084fc',  bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.3)' },
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function PriceListsLive({ clientId, clientName, initial }: Props) {
  const [lists,    setLists]    = useState<PriceList[]>(initial)
  const [flash,    setFlash]    = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { setLists(initial) }, [initial])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const channel = supabase
      .channel(`price_lists_client_${clientId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'price_lists',
        filter: `client_id=eq.${clientId}`,
      }, (payload) => {
        if      (payload.eventType === 'INSERT') setLists(prev => [payload.new as PriceList, ...prev])
        else if (payload.eventType === 'UPDATE') {
          setLists(prev => prev.map(l => l.id === payload.new.id ? payload.new as PriceList : l))
          if ((payload.new as any).status === 'signed') {
            setFlash(payload.new.id)
            setTimeout(() => setFlash(null), 3000)
          }
        } else if (payload.eventType === 'DELETE') {
          setLists(prev => prev.filter(l => l.id !== payload.old.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clientId])

  async function handleDelete(list: PriceList) {
    if (!confirm(`¿Eliminar "${list.file_name}"? También se borrarán los PDFs del storage.`)) return
    setDeleting(list.id)
    try {
      const res  = await fetch('/api/listas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: list.id }) })
      const json = await res.json()
      if (!res.ok) { alert(json.error ?? 'Error al eliminar'); return }
      setLists(prev => prev.filter(l => l.id !== list.id))
    } finally { setDeleting(null) }
  }

  const signed  = lists.filter(l => l.status === 'signed').length
  const pending = lists.filter(l => l.status === 'pending').length

  return (
    <>
      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ padding: '10px 18px', background: 'var(--bg-card)', border: '1.5px solid rgba(0,200,83,0.25)', borderRadius: '12px', textAlign: 'center', minWidth: '80px' }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '24px', color: 'var(--ombu-green)', textShadow: '0 0 12px var(--ombu-glow)' }}>{signed}</div>
          <div className="section-label" style={{ fontSize: '10px' }}>Firmados</div>
        </div>
        <div style={{ padding: '10px 18px', background: 'var(--bg-card)', border: '1.5px solid rgba(255,170,0,0.25)', borderRadius: '12px', textAlign: 'center', minWidth: '80px' }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '24px', color: '#ffaa00' }}>{pending}</div>
          <div className="section-label" style={{ fontSize: '10px' }}>Pendientes</div>
        </div>
        <div style={{ padding: '10px 18px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '12px', textAlign: 'center', minWidth: '80px' }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '24px', color: 'var(--text-secondary)' }}>{lists.length}</div>
          <div className="section-label" style={{ fontSize: '10px' }}>Total</div>
        </div>
      </div>

      {/* Card de documentos */}
      <div className="xbox-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,200,83,0.04)' }}>
          <div>
            <div className="section-label" style={{ fontSize: '10px', marginBottom: '1px' }}>Historial</div>
            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '0.06em' }}>
              DOCUMENTOS PARA FIRMA
            </h2>
          </div>
          <UploadModal clientId={clientId} clientName={clientName} />
        </div>

        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {lists.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>📄</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sin documentos cargados aún.</p>
            </div>
          )}

          {lists.map(list => {
            const docCfg = DOC_TYPE_CONFIG[list.document_type ?? 'price_list']
            return (
              <div key={list.id} style={{
                background: flash === list.id ? 'rgba(0,200,83,0.08)' : 'var(--bg-card)',
                border: `1.5px solid ${flash === list.id ? 'rgba(0,200,83,0.6)' : 'var(--border)'}`,
                borderRadius: '12px', padding: '13px 15px',
                display: 'flex', alignItems: 'center', gap: '12px',
                transition: 'all 0.4s ease',
                opacity: deleting === list.id ? 0.5 : 1,
              }}>
                {/* Icono */}
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                  background: list.status === 'signed' ? 'rgba(0,200,83,0.12)' : 'rgba(255,170,0,0.1)',
                  border: `1px solid ${list.status === 'signed' ? 'rgba(0,200,83,0.3)' : 'rgba(255,170,0,0.3)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="18" height="18" fill="none" stroke={list.status === 'signed' ? '#00c853' : '#ffaa00'} strokeWidth={1.8} viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {list.file_name}
                  </div>
                  {list.description && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {list.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
                    {/* Badge tipo de documento */}
                    <span style={{
                      fontSize: '10px', padding: '2px 7px', borderRadius: '20px', fontWeight: 700,
                      background: docCfg.bg, border: `1px solid ${docCfg.border}`, color: docCfg.color,
                      fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em',
                    }}>
                      {docCfg.label}
                    </span>
                    <span className={`badge ${list.status === 'signed' ? 'badge-signed' : 'badge-pending'}`}>
                      {list.status === 'signed' ? '+ Firmado' : 'Pendiente'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {fmtDate(list.uploaded_at)}
                    </span>
                    {list.signed_at && (
                      <span style={{ fontSize: '11px', color: 'var(--ombu-green)' }}>
                        · Firmado {fmtDate(list.signed_at)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                  {list.status === 'pending' && (
                    <LinkModal token={list.token} clientName={clientName} fileName={list.file_name} />
                  )}
                  {(list.signed_pdf_url || list.signed_conditions_pdf_url) && (
                    <a href={list.signed_conditions_pdf_url ?? list.signed_pdf_url!}
                      target="_blank" rel="noopener noreferrer"
                      className="btn-xbox"
                      style={{ fontSize: '11px', padding: '5px 10px', color: 'var(--ombu-green)' }}>
                      PDF firmado
                    </a>
                  )}
                  <a href={list.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="btn-xbox" style={{ fontSize: '11px', padding: '5px 10px' }}>
                    Ver
                  </a>
                  <button onClick={() => handleDelete(list)} disabled={deleting === list.id}
                    title="Eliminar"
                    style={{
                      padding: '5px 8px', borderRadius: '8px',
                      border: '1px solid rgba(220,38,38,0.35)', background: 'rgba(220,38,38,0.07)',
                      color: '#f87171', cursor: deleting === list.id ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
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
