'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

type DocType = 'price_list' | 'invoice' | 'remito'

const DOC_CONFIG: Record<DocType, {
  title:          string
  mainLabel:      string
  mainHint:       string
  showConditions: boolean
  color:          string
  colorBg:        string
  colorBorder:    string
}> = {
  price_list: {
    title:          'NUEVA LISTA DE PRECIOS',
    mainLabel:      'Lista de precios',
    mainHint:       'Lista con precios negociados — solo lectura para el cliente',
    showConditions: true,
    color:          '#00c853',
    colorBg:        'rgba(0,200,83,0.07)',
    colorBorder:    'rgba(0,200,83,0.45)',
  },
  invoice: {
    title:          'NUEVA FACTURA',
    mainLabel:      'Factura (PDF)',
    mainHint:       'El cliente firmará digitalmente este documento',
    showConditions: false,
    color:          '#60a5fa',
    colorBg:        'rgba(96,165,250,0.07)',
    colorBorder:    'rgba(96,165,250,0.45)',
  },
  remito: {
    title:          'NUEVO REMITO',
    mainLabel:      'Remito (PDF)',
    mainHint:       'El cliente firmará digitalmente este documento',
    showConditions: false,
    color:          '#c084fc',
    colorBg:        'rgba(192,132,252,0.07)',
    colorBorder:    'rgba(192,132,252,0.45)',
  },
}

const DOC_LABEL: Record<DocType, string> = {
  price_list: '📋 Lista de precios',
  invoice:    '🧾 Factura',
  remito:     '📦 Remito',
}

// ── Extrae número de documento desde el texto del PDF ─────────────────
async function extractDocNumber(file: File, docType: DocType): Promise<string> {
  try {
    // Cargar pdf.js desde CDN
    if (!(window as any).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
        script.onload = () => resolve()
        script.onerror = () => reject()
        document.head.appendChild(script)
      })
      ;(window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    }

    const arrayBuffer = await file.arrayBuffer()
    const pdf         = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    // Leer las primeras 2 páginas para encontrar el número
    let fullText = ''
    const pagesToRead = Math.min(2, pdf.numPages)
    for (let i = 1; i <= pagesToRead; i++) {
      const page    = await pdf.getPage(i)
      const content = await page.getTextContent()
      fullText += content.items.map((item: any) => item.str).join(' ') + ' '
    }

    // Patrón común: XXXX-XXXXXXXX (ej: 0005-00000043, 0000-00015432)
    const numPattern = /\b(\d{4}-\d{8})\b/g
    const matches    = [...fullText.matchAll(numPattern)].map(m => m[1])

    if (docType === 'invoice') {
      // Buscar el número que aparece cerca de "FACTURA"
      const facturaIdx = fullText.toUpperCase().indexOf('FACTURA')
      if (facturaIdx !== -1) {
        const nearby = fullText.substring(facturaIdx, facturaIdx + 150)
        const m = nearby.match(/\b(\d{4}-\d{8})\b/)
        if (m) return `Factura N° ${m[1]}`
      }
      // Fallback: primer número encontrado
      if (matches.length) return `Factura N° ${matches[0]}`
    }

    if (docType === 'remito') {
      // Buscar número cerca de "REMITO" o el que tenga más ceros (número de remito suele ser alto)
      const remitoIdx = fullText.toUpperCase().indexOf('REMITO')
      if (remitoIdx !== -1) {
        const nearby = fullText.substring(remitoIdx, remitoIdx + 200)
        const m = nearby.match(/\b(\d{4}-\d{8})\b/)
        if (m) return `Remito N° ${m[1]}`
      }
      // Fallback: buscar el número con más dígitos de secuencia
      if (matches.length) return `Remito N° ${matches[0]}`
    }

    // price_list: no tiene número estándar, retorna vacío
    return ''
  } catch {
    return ''
  }
}

// ── FileZone ──────────────────────────────────────────────────────────
function FileZone({ label, required, file, onFile, hint, loading: extracting }: {
  label: string; required: boolean; file: File | null
  onFile: (f: File | null) => void; hint?: string; loading?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div>
      <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
        {label}{required && <span style={{ color: '#ff5050', marginLeft: '4px' }}>*</span>}
      </label>
      <input ref={ref} type="file" accept="application/pdf" style={{ display: 'none' }}
        onChange={e => { onFile(e.target.files?.[0] ?? null); e.target.value = '' }} />
      <div
        role="button" tabIndex={0}
        onClick={() => ref.current?.click()}
        onKeyDown={e => e.key === 'Enter' && ref.current?.click()}
        style={{
          border: `1.5px dashed ${file ? '#00c853' : 'rgba(0,200,83,0.35)'}`,
          borderRadius: '12px', padding: '16px 14px', textAlign: 'center',
          cursor: 'pointer',
          background: file ? 'rgba(0,200,83,0.07)' : 'var(--bg-input)',
          transition: 'border-color 0.2s, background 0.2s',
          userSelect: 'none', outline: 'none',
        }}
      >
        {file ? (
          <>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{extracting ? '⏳' : '📄'}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#00c853', wordBreak: 'break-all' }}>{file.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {extracting ? 'Leyendo número de documento…' : `${(file.size / 1024).toFixed(0)} KB · Click para cambiar`}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '22px', marginBottom: '5px' }}>📎</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Click para seleccionar PDF</div>
            {hint && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{hint}</div>}
          </>
        )}
      </div>
    </div>
  )
}

// ── Modal content ─────────────────────────────────────────────────────
function UploadModalContent({ clientId, clientName, onClose, onSuccess }: {
  clientId: number; clientName: string
  onClose: () => void; onSuccess: () => void
}) {
  const [docType,     setDocType]     = useState<DocType>('price_list')
  const [expiresDays, setExpiresDays] = useState(30)
  const [mainFile,    setMainFile]    = useState<File | null>(null)
  const [condFile,    setCondFile]    = useState<File | null>(null)
  const [desc,        setDesc]        = useState('')
  const [loading,     setLoading]     = useState(false)
  const [extracting,  setExtracting]  = useState(false)
  const [error,       setError]       = useState('')

  const cfg = DOC_CONFIG[docType]

  function handleTypeChange(t: DocType) {
    setDocType(t)
    setMainFile(null)
    setCondFile(null)
    setDesc('')
    setError('')
  }

  // Al seleccionar el PDF principal, intentar extraer el número
  async function handleMainFile(file: File | null) {
    setMainFile(file)
    if (!file || docType === 'price_list') return

    setExtracting(true)
    const detected = await extractDocNumber(file, docType)
    setExtracting(false)

    if (detected && !desc) {
      setDesc(detected)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mainFile) { setError('El PDF es obligatorio'); return }
    setLoading(true); setError('')

    const form = new FormData()
    form.append('file',          mainFile)
    form.append('clientId',      String(clientId))
    form.append('description',   desc)
    form.append('document_type', docType)
    form.append('expires_days',  String(expiresDays))
    if (condFile && cfg.showConditions) form.append('conditionsFile', condFile)

    try {
      const res  = await fetch('/api/listas', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Error al subir'); setLoading(false); return }
      onSuccess()
    } catch {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [loading, onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
        onClick={() => !loading && onClose()} />

      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--bg-panel)',
        border: `1.5px solid ${cfg.colorBorder}`,
        borderRadius: '18px', width: '100%', maxWidth: '520px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: `0 30px 100px rgba(0,0,0,0.6), 0 0 40px ${cfg.colorBg}`,
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 2, borderRadius: '18px 18px 0 0' }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>
              Documentos · {clientName}
            </div>
            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '20px', color: cfg.color, letterSpacing: '0.06em', lineHeight: 1 }}>
              {cfg.title}
            </h2>
          </div>
          <button onClick={() => !loading && onClose()} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px 8px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Selector tipo */}
          <div>
            <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Tipo de documento
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['price_list', 'invoice', 'remito'] as DocType[]).map(t => {
                const c = DOC_CONFIG[t]
                const active = docType === t
                return (
                  <button
                    key={t} type="button"
                    onClick={() => handleTypeChange(t)}
                    style={{
                      flex: 1, padding: '9px 6px', borderRadius: '10px', border: '1.5px solid',
                      borderColor: active ? c.color : 'rgba(255,255,255,0.1)',
                      background: active ? c.colorBg : 'transparent',
                      color: active ? c.color : 'var(--text-secondary)',
                      cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em',
                      transition: 'all 0.15s',
                    }}
                  >
                    {DOC_LABEL[t]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Info contextual */}
          {cfg.showConditions ? (
            <div style={{ padding: '10px 14px', background: cfg.colorBg, border: `1px solid ${cfg.colorBorder}`, borderRadius: '10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: cfg.color }}>Sistema de dos documentos:</strong><br/>
              Subí la <strong>lista de precios</strong> (solo lectura) y las <strong>condiciones de acopio</strong> (donde se incrusta la firma).
            </div>
          ) : (
            <div style={{ padding: '10px 14px', background: cfg.colorBg, border: `1px solid ${cfg.colorBorder}`, borderRadius: '10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: cfg.color }}>Documento único:</strong><br/>
              El cliente verá el PDF y firmará digitalmente. La firma queda incrustada en el documento.
            </div>
          )}

          {/* PDF principal */}
          <FileZone
            label={cfg.mainLabel}
            required={true}
            file={mainFile}
            onFile={handleMainFile}
            hint={cfg.mainHint}
            loading={extracting}
          />

          {/* PDF de condiciones — solo para lista */}
          {cfg.showConditions && (
            <FileZone
              label="Condiciones de acopio (para firmar)"
              required={false}
              file={condFile}
              onFile={setCondFile}
              hint="Documento con campo 'Firma del Cliente' — la firma se incrusta aquí"
            />
          )}

          {/* Vencimiento del link */}
          <div>
            <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Vigencia del link de firma
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[15, 30, 60, 90].map(days => (
                <button key={days} type="button"
                  onClick={() => setExpiresDays(days)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: '10px', border: '1.5px solid',
                    borderColor: expiresDays === days ? cfg.color : 'rgba(255,255,255,0.1)',
                    background: expiresDays === days ? cfg.colorBg : 'transparent',
                    color: expiresDays === days ? cfg.color : 'var(--text-secondary)',
                    cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: '12px', fontWeight: 700, transition: 'all 0.15s',
                  }}
                >
                  {days}d
                </button>
              ))}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
              El cliente tendrá {expiresDays} días para firmar antes de que el link expire.
            </p>
          </div>

          {/* Descripción — autocompletada */}
          <div>
            <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Descripción
              {extracting && (
                <span style={{ marginLeft: '8px', color: cfg.color, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  leyendo PDF…
                </span>
              )}
              {!extracting && desc && docType !== 'price_list' && (
                <span style={{ marginLeft: '8px', color: '#00c853', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  ✓ detectado automáticamente
                </span>
              )}
            </label>
            <input
              type="text" className="xbox-input" style={{ borderRadius: '10px', transition: 'border-color 0.2s' }}
              placeholder={
                docType === 'price_list' ? 'Ej: Lista 280 — Tresnal Agropecuaria — Abr 2026' :
                docType === 'invoice'    ? 'Ej: Factura N° 0001-00001234' :
                                           'Ej: Remito N° 0001-00005678'
              }
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)', borderRadius: '10px', color: '#ff5050', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', paddingTop: '2px' }}>
            <button type="button" onClick={() => !loading && onClose()} disabled={loading}
              style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading || !mainFile || extracting}
              style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: loading || !mainFile || extracting ? 'rgba(255,255,255,0.05)' : cfg.color, color: loading || !mainFile || extracting ? 'var(--text-muted)' : '#000', cursor: loading || !mainFile || extracting ? 'not-allowed' : 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading || !mainFile || extracting ? 0.5 : 1, transition: 'background 0.2s' }}>
              {loading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Subiendo…
                </>
              ) : extracting ? (
                <>⏳ Leyendo documento…</>
              ) : (
                <>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Subir y generar link
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Botón exportado ───────────────────────────────────────────────────
export default function UploadModal({ clientId, clientName }: { clientId: number; clientName: string }) {
  const [open,    setOpen]    = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  function handleSuccess() { setOpen(false); router.refresh() }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '10px', border: 'none', background: '#00c853', color: '#000', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}
      >
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Nuevo documento
      </button>

      {mounted && open && createPortal(
        <UploadModalContent
          clientId={clientId} clientName={clientName}
          onClose={() => setOpen(false)}
          onSuccess={handleSuccess}
        />,
        document.body
      )}
    </>
  )
}
