'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'

interface Props {
  suppliers:  any[]
  count:      number
  totalPages: number
  page:       number
  q:          string
  stats:      any
  docsData:   any[]
}

export default function ProveedoresShell({ suppliers, count, totalPages, page, q, stats, docsData }: Props) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [showNew,      setShowNew]      = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [saveErr,      setSaveErr]      = useState('')
  const [mounted,      setMounted]      = useState(false)
  const [newForm, setNewForm] = useState({
    nombre: '', cuit: '', telefono: '', email: '', contacto: '',
    direccion: '', localidad: '', provincia: '', nota: ''
  })

  useState(() => { if (typeof window !== 'undefined') setMounted(true) })

  const supplierIdsWithDocs   = [...new Set(docsData.map((d: any) => d.supplier_id))]
  const supplierIdsWithPending = [...new Set(docsData.filter((d: any) => d.status === 'pending').map((d: any) => d.supplier_id))]
  const supplierIdsWithSigned  = [...new Set(docsData.filter((d: any) => d.status === 'signed').map((d: any) => d.supplier_id))]

  const getSupplierName = (id: number) => {
    const fromDoc = docsData.find((d: any) => d.supplier_id === id)
    if (fromDoc?.suppliers?.nombre) return fromDoc.suppliers.nombre
    return suppliers.find((s: any) => s.id === id)?.nombre ?? `Proveedor #${id}`
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newForm.nombre.trim()) { setSaveErr('El nombre es obligatorio'); return }
    setSaving(true); setSaveErr('')
    const res = await fetch('/api/proveedores', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    })
    const json = await res.json()
    if (!res.ok) { setSaveErr(json.error ?? 'Error al crear el proveedor'); setSaving(false); return }
    setShowNew(false); setSaving(false)
    setNewForm({ nombre: '', cuit: '', telefono: '', email: '', contacto: '', direccion: '', localidad: '', provincia: '', nota: '' })
    window.location.reload()
  }

  const statCards = [
    { key: null,      label: 'Total Proveedores', val: stats?.total_suppliers?.toLocaleString('es-AR') ?? '…', color: 'var(--text-primary)', ids: [] },
    { key: 'con',     label: 'Con Documentos',    val: stats?.with_docs    ?? '…', color: '#0088ff',           ids: supplierIdsWithDocs },
    { key: 'signed',  label: 'Firmados',           val: stats?.total_signed ?? '…', color: 'var(--ombu-green)', ids: supplierIdsWithSigned },
    { key: 'pending', label: 'Pendientes',          val: stats?.total_pending ?? '…', color: '#ffaa00',          ids: supplierIdsWithPending },
  ]

  function supplierDocStatus(id: number) {
    const docs = docsData.filter((d: any) => d.supplier_id === id)
    if (!docs.length) return null
    const hasPending = docs.some((d: any) => d.status === 'pending')
    const hasSigned  = docs.some((d: any) => d.status === 'signed')
    if (hasPending && hasSigned) return 'mixed'
    if (hasPending) return 'pending'
    if (hasSigned)  return 'signed'
    return null
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div className="section-label" style={{ marginBottom: '4px' }}>Panel principal</div>
          <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '28px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
            PROVEEDORES
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--text-muted)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '13px', letterSpacing: '0.06em' }}>
            {count.toLocaleString('es-AR')} REGISTRADOS
          </span>
          <button className="btn-xbox filled" onClick={() => setShowNew(true)}
            style={{ borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo proveedor
          </button>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {statCards.map(s => (
          <div key={s.label}
            className={`stat-tile p-4 ${activeFilter === s.key ? 'active' : ''}`}
            style={{ borderRadius: '14px', cursor: s.key ? 'pointer' : 'default' }}
            onClick={() => s.key && setActiveFilter(activeFilter === s.key ? null : s.key)}
          >
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '34px', color: s.color, lineHeight: 1 }}>
              {s.val}
            </div>
            <div className="section-label" style={{ marginTop: '4px' }}>{s.label}</div>
            {s.key && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{activeFilter === s.key ? '▲ Ocultar' : '▼ Ver detalle'}</div>}
          </div>
        ))}
      </div>

      {/* Stat expanded */}
      {activeFilter && (() => {
        const card  = statCards.find(s => s.key === activeFilter)!
        const items = card.ids.slice(0, 20).map(id => ({
          id,
          name:    getSupplierName(id as number),
          pending: docsData.filter((d: any) => d.supplier_id === id && d.status === 'pending').length,
          signed:  docsData.filter((d: any) => d.supplier_id === id && d.status === 'signed').length,
        }))
        return (
          <div className="xbox-card mb-5 slide-down" style={{ borderRadius: '14px' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div className="section-label">{card.label} — {card.ids.length} proveedor{card.ids.length !== 1 ? 'es' : ''}</div>
              <button onClick={() => setActiveFilter(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {items.map(item => (
                <Link key={item.id} href={`/admin/proveedores/${item.id}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>
                  <span>{item.name}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {item.signed  > 0 && <span className="badge badge-signed">{item.signed} firmado{item.signed !== 1 ? 's' : ''}</span>}
                    {item.pending > 0 && <span className="badge badge-pending">{item.pending} pendiente{item.pending !== 1 ? 's' : ''}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Buscador */}
      <form method="GET" style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <input name="q" defaultValue={q} placeholder="Buscar por nombre o CUIT..."
          className="xbox-input" style={{ flex: 1, borderRadius: '10px' }} />
        <button type="submit" className="btn-xbox filled" style={{ borderRadius: '10px', padding: '0 20px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.08em' }}>
          BUSCAR
        </button>
      </form>

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {suppliers.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            No se encontraron proveedores
          </div>
        )}
        {suppliers.map((s: any) => {
          const docStatus = supplierDocStatus(s.id)
          return (
            <Link key={s.id} href={`/admin/proveedores/${s.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderRadius: '12px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', textDecoration: 'none', color: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'var(--bg-card-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)' }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,215,0,0.08)', border: '1.5px solid rgba(255,215,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '13px', color: 'var(--ombu-green)', flexShrink: 0 }}>
                {s.nombre.substring(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.nombre}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {[s.cuit, s.telefono].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: "'Barlow Condensed', sans-serif" }}>#{s.numero ?? s.id}</span>
                {docStatus && (
                  <span className={`badge ${docStatus === 'signed' ? 'badge-signed' : docStatus === 'pending' ? 'badge-pending' : 'badge-cta'}`} style={{ fontSize: '10px' }}>
                    {docStatus === 'signed' ? 'Firmado' : docStatus === 'pending' ? 'Pendiente' : 'Parcial'}
                  </span>
                )}
                <svg width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth={2} viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '24px', flexWrap: 'wrap' }}>
          {page > 1 && <a href={`?q=${q}&page=${page - 1}`} className="btn-xbox" style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '13px' }}>← Anterior</a>}
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '13px', color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
            Página {page} de {totalPages}
          </span>
          {page < totalPages && <a href={`?q=${q}&page=${page + 1}`} className="btn-xbox" style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '13px' }}>Siguiente →</a>}
        </div>
      )}

      {/* Modal nuevo proveedor */}
      {mounted && showNew && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget && !saving) setShowNew(false) }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-panel)', border: '1.5px solid var(--border-hover)', borderRadius: '18px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg-panel)', borderRadius: '18px 18px 0 0' }}>
              <div>
                <div className="section-label" style={{ fontSize: '10px', marginBottom: '2px' }}>Proveedores</div>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '20px', color: 'var(--text-primary)', letterSpacing: '0.06em' }}>NUEVO PROVEEDOR</h2>
              </div>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px 22px', display: 'grid', gap: '14px' }}>
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: '5px' }}>Nombre / Razón social *</label>
                <input className="xbox-input" style={{ borderRadius: '10px', fontSize: '15px', fontWeight: 600 }}
                  value={newForm.nombre} onChange={e => setNewForm(f => ({ ...f, nombre: e.target.value.toUpperCase() }))} autoFocus required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '5px' }}>CUIT</label>
                  <input className="xbox-input" style={{ borderRadius: '10px' }} value={newForm.cuit} onChange={e => setNewForm(f => ({ ...f, cuit: e.target.value }))} />
                </div>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '5px' }}>Teléfono</label>
                  <input className="xbox-input" style={{ borderRadius: '10px' }} value={newForm.telefono} onChange={e => setNewForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
                  <input type="email" className="xbox-input" style={{ borderRadius: '10px' }} value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '5px' }}>Contacto</label>
                  <input className="xbox-input" style={{ borderRadius: '10px' }} value={newForm.contacto} onChange={e => setNewForm(f => ({ ...f, contacto: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: '5px' }}>Dirección</label>
                <input className="xbox-input" style={{ borderRadius: '10px' }} value={newForm.direccion} onChange={e => setNewForm(f => ({ ...f, direccion: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '5px' }}>Localidad</label>
                  <input className="xbox-input" style={{ borderRadius: '10px' }} value={newForm.localidad} onChange={e => setNewForm(f => ({ ...f, localidad: e.target.value }))} />
                </div>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '5px' }}>Provincia</label>
                  <input className="xbox-input" style={{ borderRadius: '10px' }} value={newForm.provincia} onChange={e => setNewForm(f => ({ ...f, provincia: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: '5px' }}>Nota interna (opcional)</label>
                <textarea className="xbox-input" style={{ borderRadius: '10px', resize: 'vertical', minHeight: '60px' }}
                  value={newForm.nota} onChange={e => setNewForm(f => ({ ...f, nota: e.target.value }))} />
              </div>
              {saveErr && <div style={{ padding: '10px 14px', background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)', borderRadius: '8px', color: '#ff5050', fontSize: '13px' }}>{saveErr}</div>}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowNew(false)} className="btn-xbox" style={{ flex: 1, justifyContent: 'center', borderRadius: '10px', padding: '12px' }} disabled={saving}>Cancelar</button>
                <button type="submit" className="btn-xbox filled" style={{ flex: 2, justifyContent: 'center', borderRadius: '10px', padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }} disabled={saving}>
                  {saving ? 'Guardando…' : 'Crear proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
