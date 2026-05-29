'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

type DocType = 'op' | 'oc'

const DOC_CONFIG: Record<DocType, { title: string; label: string; hint: string; color: string; colorBg: string; colorBorder: string }> = {
  op: {
    title:       'NUEVA ORDEN DE PAGO',
    label:       'Orden de Pago (PDF)',
    hint:        'El proveedor firmará digitalmente este documento',
    color:       '#f59e0b',
    colorBg:     'rgba(245,158,11,0.07)',
    colorBorder: 'rgba(245,158,11,0.45)',
  },
  oc: {
    title:       'NUEVA ORDEN DE COMPRA',
    label:       'Orden de Compra (PDF)',
    hint:        'El proveedor firmará digitalmente este documento',
    color:       '#818cf8',
    colorBg:     'rgba(129,140,248,0.07)',
    colorBorder: 'rgba(129,140,248,0.45)',
  },
}

interface Props { supplierId: number; supplierName: string }

export default function SupplierUploadModal({ supplierId, supplierName }: Props) {
  const [open,      setOpen]      = useState(false)
  const [mounted,   setMounted]   = useState(false)
  const [docType,   setDocType]   = useState<DocType>('op')
  const [expiryDays,setExpiryDays]= useState(30)
  const [desc,      setDesc]      = useState('')
  const [file,      setFile]      = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router  = useRouter()

  useEffect(() => { setMounted(true) }, [])

  function reset() {
    setDocType('op'); setExpiryDays(30); setDesc('')
    setFile(null); setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Seleccioná un PDF'); return }
    setUploading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file',          file)
      fd.append('supplierId',    String(supplierId))
      fd.append('supplierName',  supplierName)
      fd.append('documentType',  docType)
      fd.append('expiryDays',    String(expiryDays))
      fd.append('description',   desc)

      const res  = await fetch('/api/listas', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al subir')
      reset(); setOpen(false); router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const cfg = DOC_CONFIG[docType]

  return (
    <>
      <button className="btn-xbox filled" onClick={() => { reset(); setOpen(true) }}
        style={{ borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Nueva orden
      </button>

      {mounted && open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget && !uploading) { reset(); setOpen(false) } }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-panel)', border: `1.5px solid ${cfg.colorBorder}`, borderRadius: '20px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 40px ${cfg.colorBg}` }}>

            {/* Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg-panel)', borderRadius: '20px 20px 0 0' }}>
              <div>
                <div className="section-label" style={{ fontSize: '10px', marginBottom: '2px' }}>{supplierName}</div>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '18px', color: cfg.color, letterSpacing: '0.06em' }}>{cfg.title}</h2>
              </div>
              <button onClick={() => { reset(); setOpen(false) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Tipo selector */}
              <div>
                <div className="section-label" style={{ marginBottom: '10px' }}>TIPO DE DOCUMENTO</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {(['op', 'oc'] as DocType[]).map(t => (
                    <button type="button" key={t} onClick={() => setDocType(t)}
                      style={{
                        padding: '10px', borderRadius: '12px', cursor: 'pointer',
                        border: `1.5px solid ${docType === t ? DOC_CONFIG[t].colorBorder : 'var(--border)'}`,
                        background: docType === t ? DOC_CONFIG[t].colorBg : 'transparent',
                        color: docType === t ? DOC_CONFIG[t].color : 'var(--text-secondary)',
                        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                        fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase',
                        transition: 'all 0.15s',
                      }}>
                      {t === 'op' ? '💳 Orden de Pago' : '🛒 Orden de Compra'}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '10px', background: cfg.colorBg, border: `1px solid ${cfg.colorBorder}`, fontSize: '12px', color: cfg.color }}>
                  <strong>Documento único:</strong> {cfg.hint}
                </div>
              </div>

              {/* PDF */}
              <div>
                <div className="section-label" style={{ marginBottom: '8px' }}>{cfg.label} *</div>
                <div onClick={() => fileRef.current?.click()}
                  style={{ border: `2px dashed ${file ? cfg.colorBorder : 'var(--border)'}`, borderRadius: '14px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: file ? cfg.colorBg : 'transparent', transition: 'all 0.2s' }}>
                  {file ? (
                    <div style={{ color: cfg.color }}>
                      <div style={{ fontSize: '22px', marginBottom: '6px' }}>📄</div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{file.name}</div>
                      <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>{(file.size / 1024).toFixed(0)} KB</div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>📎</div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>Click para seleccionar PDF</div>
                      <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>{cfg.hint}</div>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
                    onChange={e => { setFile(e.target.files?.[0] ?? null); setError('') }} />
                </div>
              </div>

              {/* Vigencia */}
              <div>
                <div className="section-label" style={{ marginBottom: '8px' }}>VIGENCIA DEL LINK</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[15, 30, 60, 90].map(d => (
                    <button type="button" key={d} onClick={() => setExpiryDays(d)}
                      style={{ padding: '10px', borderRadius: '10px', cursor: 'pointer', border: `1.5px solid ${expiryDays === d ? cfg.colorBorder : 'var(--border)'}`, background: expiryDays === d ? cfg.colorBg : 'transparent', color: expiryDays === d ? cfg.color : 'var(--text-secondary)', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '15px', transition: 'all 0.15s' }}>
                      {d}d
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  El proveedor tendrá {expiryDays} días para firmar
                </div>
              </div>

              {/* Descripción */}
              <div>
                <div className="section-label" style={{ marginBottom: '8px' }}>DESCRIPCIÓN (OPCIONAL)</div>
                <input className="xbox-input" style={{ borderRadius: '10px' }}
                  placeholder={docType === 'op' ? 'Ej: OP N° 0001-00000123' : 'Ej: OC N° 0001-00000456'}
                  value={desc} onChange={e => setDesc(e.target.value)} />
              </div>

              {error && <div style={{ padding: '10px 14px', background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)', borderRadius: '8px', color: '#ff5050', fontSize: '13px' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { reset(); setOpen(false) }} className="btn-xbox" style={{ flex: 1, justifyContent: 'center', borderRadius: '10px', padding: '12px' }} disabled={uploading}>Cancelar</button>
                <button type="submit" disabled={uploading || !file}
                  style={{ flex: 2, padding: '12px', borderRadius: '10px', border: `1.5px solid ${cfg.colorBorder}`, background: cfg.colorBg, color: cfg.color, cursor: uploading || !file ? 'not-allowed' : 'pointer', opacity: uploading || !file ? 0.5 : 1, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {uploading ? 'Subiendo…' : '↑ Subir y generar link'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
