'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'

const TYPE_BADGE: Record<string, string> = {
  'CTA. CORRIENTE': 'badge-cta',
  'NUEVO':          'badge-nuevo',
  'OBRAS CIVILES':  'badge-obras',
  'CLIENTE WEB':    'badge-web',
  'SALON':          'badge-salon',
}

interface Props {
  clients:    any[]
  count:      number
  totalPages: number
  page:       number
  q:          string
  tipo:       string
  stats:      any
  listsData:  any[]
}

export default function ClientesShell({ clients, count, totalPages, page, q, tipo, stats, listsData }: Props) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [showNew,      setShowNew]      = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [saveErr,      setSaveErr]      = useState('')
  const [mounted,      setMounted]      = useState(false)
  const [newForm, setNewForm] = useState({
    nombre: '', tipo: 'SALON', vendedor: '', telefono: '',
    email: '', cuit: '', direccion: '', localidad: '', provincia: '', iva: '', nota: ''
  })

  // Portal mount
  useState(() => { if (typeof window !== 'undefined') setMounted(true) })

  const clientIdsWithLists   = [...new Set(listsData.map((l: any) => l.client_id))]
  const clientIdsWithPending = [...new Set(listsData.filter((l: any) => l.status === 'pending').map((l: any) => l.client_id))]
  const clientIdsWithSigned  = [...new Set(listsData.filter((l: any) => l.status === 'signed').map((l: any) => l.client_id))]
  const getClientName = (id: number) => {
    const fromList = listsData.find((l: any) => l.client_id === id)
    if (fromList?.clients?.nombre) return fromList.clients.nombre
    return clients.find((c: any) => c.id === id)?.nombre ?? `Cliente #${id}`
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newForm.nombre.trim()) { setSaveErr('El nombre es obligatorio'); return }
    setSaving(true); setSaveErr('')
    const res = await fetch('/api/clientes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    })
    const json = await res.json()
    if (!res.ok) { setSaveErr(json.error ?? 'Error al crear el cliente'); setSaving(false); return }
    setShowNew(false); setSaving(false)
    setNewForm({ nombre: '', tipo: 'SALON', vendedor: '', telefono: '', email: '', cuit: '', direccion: '', localidad: '', provincia: '', iva: '', nota: '' })
    window.location.reload()
  }

  const statCards = [
    { key: null,      label: 'Total Clientes', val: stats?.total_clients?.toLocaleString('es-AR') ?? '…', color: 'var(--text-primary)',  ids: [] },
    { key: 'con',     label: 'Con Listas',      val: stats?.with_lists   ?? '…',                          color: '#0088ff',             ids: clientIdsWithLists },
    { key: 'signed',  label: 'Firmadas',         val: stats?.total_signed ?? '…',                          color: 'var(--ombu-green)',   ids: clientIdsWithSigned },
    { key: 'pending', label: 'Pendientes',        val: stats?.total_pending ?? '…',                         color: '#ffaa00',             ids: clientIdsWithPending },
  ]

  // Status badge per client
  function clientListStatus(id: number) {
    const clientLists = listsData.filter((l: any) => l.client_id === id)
    if (!clientLists.length) return null
    const hasPending = clientLists.some((l: any) => l.status === 'pending')
    const hasSigned  = clientLists.some((l: any) => l.status === 'signed')
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
            CLIENTES
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
            Nuevo cliente
          </button>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {statCards.map(s => (
          <div
            key={s.label}
            className={`stat-tile p-4 ${activeFilter === s.key ? 'active' : ''}`}
            style={{ borderRadius: '14px', cursor: s.key ? 'pointer' : 'default' }}
            onClick={() => s.key && setActiveFilter(activeFilter === s.key ? null : s.key)}
          >
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '34px', color: s.color, lineHeight: 1, textShadow: s.key === 'signed' ? '0 0 20px var(--ombu-glow)' : 'none' }}>
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
          name:    getClientName(id as number),
          pending: listsData.filter((l: any) => l.client_id === id && l.status === 'pending').length,
          signed:  listsData.filter((l: any) => l.client_id === id && l.status === 'signed').length,
        }))
        return (
          <div className="xbox-card mb-5 slide-down" style={{ borderRadius: '14px' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div className="section-label">{card.label} — {card.ids.length} cliente{card.ids.length !== 1 ? 's' : ''}</div>
              <button onClick={() => setActiveFilter(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
              {items.map(item => (
                <Link key={item.id} href={`/admin/clientes/${item.id}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', textDecoration: 'none', background: 'var(--bg-card)', border: '1px solid var(--border)', transition: 'border-color 0.15s' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  {item.signed  > 0 && <span className="badge badge-signed"  style={{ fontSize: '10px' }}>{item.signed} firmada{item.signed  !== 1 ? 's' : ''}</span>}
                  {item.pending > 0 && <span className="badge badge-pending" style={{ fontSize: '10px' }}>{item.pending} pendiente{item.pending !== 1 ? 's' : ''}</span>}
                </Link>
              ))}
              {card.ids.length > 20 && <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '4px' }}>y {card.ids.length - 20} más…</p>}
            </div>
          </div>
        )
      })()}

      {/* Search */}
      <form method="GET" style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          name="q"
          defaultValue={q}
          className="xbox-input"
          style={{ flex: 1, minWidth: '200px', borderRadius: '10px' }}
          placeholder="Buscar por nombre, CUIT o vendedor..."
        />
        <select name="tipo" defaultValue={tipo} className="xbox-input" style={{ width: '180px', borderRadius: '10px' }}>
          <option value="">Todos los tipos</option>
          <option>SALON</option>
          <option>CTA. CORRIENTE</option>
          <option>NUEVO</option>
          <option>OBRAS CIVILES</option>
          <option>CLIENTE WEB</option>
        </select>
        <button type="submit" className="btn-xbox filled" style={{ borderRadius: '10px', padding: '9px 18px' }}>
          Buscar
        </button>
      </form>

      {/* ── CLIENT CARDS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {clients.length === 0 && (
          <div className="xbox-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '14px' }}>
            No se encontraron clientes.
          </div>
        )}

        {clients.map((c: any) => {
          const listStatus = clientListStatus(c.id)
          return (
            <Link
              key={c.id}
              href={`/admin/clientes/${c.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="xbox-card" style={{
                padding: '13px 18px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                cursor: 'pointer',
              }}>
                {/* Avatar */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--ombu-dark), var(--ombu-darker))',
                  border: '1px solid var(--border-hover)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '13px', color: '#fff',
                }}>
                  {c.nombre?.substring(0, 2) ?? '??'}
                </div>

                {/* N° */}
                <div style={{ width: '36px', flexShrink: 0, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                  #{c.id}
                </div>

                {/* Nombre */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em' }}>
                    {c.nombre}
                  </div>
                  {(c.localidad || c.provincia) && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {[c.localidad, c.provincia].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>

                {/* Tipo */}
                {c.tipo && (
                  <span className={`badge ${TYPE_BADGE[c.tipo] ?? 'badge-salon'}`} style={{ flexShrink: 0 }}>
                    {c.tipo}
                  </span>
                )}

                {/* Vendedor */}
                {c.vendedor && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', flexShrink: 0, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'none' }}
                    className="md:block">
                    {c.vendedor}
                  </div>
                )}

                {/* Estado listas */}
                {listStatus && (
                  <span style={{
                    flexShrink: 0, fontSize: '10px', padding: '2px 8px', borderRadius: '6px',
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, letterSpacing: '0.08em',
                    ...(listStatus === 'signed'  ? { background: 'rgba(0,200,83,0.12)',   color: '#00c853', border: '1px solid rgba(0,200,83,0.3)' }  :
                        listStatus === 'pending' ? { background: 'rgba(255,170,0,0.1)',   color: '#ffaa00', border: '1px solid rgba(255,170,0,0.3)' }  :
                                                   { background: 'rgba(0,136,255,0.1)',   color: '#4da6ff', border: '1px solid rgba(0,136,255,0.3)' }),
                  }}>
                    {listStatus === 'signed' ? 'Firmado' : listStatus === 'pending' ? 'Pendiente' : 'Parcial'}
                  </span>
                )}

                {/* Arrow */}
                <svg width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth={2} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
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
          {page > 1 && (
            <a href={`?q=${q}&tipo=${tipo}&page=${page - 1}`} className="btn-xbox" style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '13px' }}>← Anterior</a>
          )}
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '13px', color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <a href={`?q=${q}&tipo=${tipo}&page=${page + 1}`} className="btn-xbox" style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '13px' }}>Siguiente →</a>
          )}
        </div>
      )}

      {/* ── MODAL: Nuevo cliente — via Portal ── */}
      {mounted && showNew && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget && !saving) setShowNew(false) }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-panel)', border: '1.5px solid var(--border-hover)', borderRadius: '18px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 40px var(--ombu-glow)' }}
          >
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg-panel)', borderRadius: '18px 18px 0 0' }}>
              <div>
                <div className="section-label" style={{ fontSize: '10px', marginBottom: '2px' }}>Clientes</div>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '20px', color: 'var(--text-primary)', letterSpacing: '0.06em' }}>NUEVO CLIENTE</h2>
              </div>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '20px 22px', display: 'grid', gap: '14px' }}>
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: '5px' }}>Nombre / Razón social *</label>
                <input className="xbox-input" style={{ borderRadius: '10px', fontSize: '15px', fontWeight: 600 }}
                  value={newForm.nombre} onChange={e => setNewForm(f => ({ ...f, nombre: e.target.value.toUpperCase() }))} autoFocus required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '5px' }}>Tipo de cliente</label>
                  <select className="xbox-input" style={{ borderRadius: '10px' }} value={newForm.tipo} onChange={e => setNewForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option>SALON</option><option>CTA. CORRIENTE</option><option>NUEVO</option><option>OBRAS CIVILES</option><option>CLIENTE WEB</option>
                  </select>
                </div>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '5px' }}>Condición IVA</label>
                  <select className="xbox-input" style={{ borderRadius: '10px' }} value={newForm.iva} onChange={e => setNewForm(f => ({ ...f, iva: e.target.value }))}>
                    <option value="">— Seleccionar —</option>
                    <option>RESPONSABLE INSCRIPTO</option><option>MONOTRIBUTISTA</option><option>CONSUMIDOR FINAL</option><option>EXENTO</option><option>NO RESPONSABLE</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '5px' }}>CUIT</label>
                  <input className="xbox-input" style={{ borderRadius: '10px' }} value={newForm.cuit} onChange={e => setNewForm(f => ({ ...f, cuit: e.target.value }))} />
                </div>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '5px' }}>Vendedor</label>
                  <input className="xbox-input" style={{ borderRadius: '10px' }} value={newForm.vendedor} onChange={e => setNewForm(f => ({ ...f, vendedor: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '5px' }}>Teléfono / WhatsApp</label>
                  <input className="xbox-input" style={{ borderRadius: '10px' }} value={newForm.telefono} onChange={e => setNewForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
                  <input type="email" className="xbox-input" style={{ borderRadius: '10px' }} value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} />
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
                <textarea className="xbox-input" style={{ borderRadius: '10px', resize: 'vertical', minHeight: '64px' }}
                  value={newForm.nota} onChange={e => setNewForm(f => ({ ...f, nota: e.target.value }))} />
              </div>

              {saveErr && (
                <div style={{ padding: '10px 14px', background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)', borderRadius: '8px', color: '#ff5050', fontSize: '13px' }}>
                  {saveErr}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowNew(false)} className="btn-xbox" style={{ flex: 1, justifyContent: 'center', borderRadius: '10px', padding: '12px' }} disabled={saving}>Cancelar</button>
                <button type="submit" className="btn-xbox filled" style={{ flex: 2, justifyContent: 'center', borderRadius: '10px', padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }} disabled={saving}>
                  {saving ? 'Guardando…' : <><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Crear cliente</>}
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
