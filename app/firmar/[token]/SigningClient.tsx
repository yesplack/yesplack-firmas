'use client'

import { useRef, useState, useEffect } from 'react'

interface Props {
  token:            string
  pdfUrl:           string
  conditionsPdfUrl: string | null
  fileName:         string
  description:      string | null
  clientName:       string
}

function googleViewerUrl(url: string) {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
}

export default function SigningClient({ token, pdfUrl, conditionsPdfUrl, fileName, description, clientName }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const [drawing,  setDrawing]  = useState(false)
  const [hasSig,   setHasSig]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [done,     setDone]     = useState(false)
  const [expired,  setExpired]  = useState(false)
  const [fullSig,  setFullSig]  = useState(false)
  const [viewing,  setViewing]  = useState<'list' | 'cond' | null>(null)
  const lastPoint  = useRef<{ x: number; y: number } | null>(null)

  // Verificar estado al montar — detecta si ya está firmado o expirado
  useEffect(() => {
    fetch(`/api/firmar/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.expired || d.status === 'expired') setExpired(true)
        if (d.status === 'signed') setDone(true)
      })
      .catch(() => {})
  }, [token])

  function resizeCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width  = rect.width  * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    const ctx = canvas.getContext('2d')!
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#006e22'
  }

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [fullSig])

  function getPoint(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    if ('touches' in e) { const t = e.touches[0]; return { x: t.clientX - rect.left, y: t.clientY - rect.top } }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault(); setDrawing(true)
    const p = getPoint(e); lastPoint.current = p
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.beginPath(); ctx.moveTo(p.x, p.y)
  }
  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!drawing) return
    const p = getPoint(e)
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.lineTo(p.x, p.y); ctx.stroke(); lastPoint.current = p; setHasSig(true)
  }
  function endDraw() { setDrawing(false); lastPoint.current = null }

  function clearSig() {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
  }

  function exportSig() {
    const canvas = canvasRef.current!
    const out = document.createElement('canvas')
    const rect = canvas.getBoundingClientRect()
    out.width = rect.width; out.height = rect.height
    out.getContext('2d')!.drawImage(canvas, 0, 0, out.width, out.height)
    return out.toDataURL('image/png')
  }

  async function handleSign() {
    if (!hasSig) { setError('Primero dibujá tu firma'); return }
    setLoading(true); setError('')
    const res  = await fetch(`/api/firmar/${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signatureBase64: exportSig() }),
    })
    const json = await res.json()
    if (res.status === 410 || json.expired) { setExpired(true); setLoading(false); return }
    if (!res.ok) { setError(json.error ?? 'Error al firmar'); setLoading(false); return }
    setDone(true)
  }

  // ── Pantalla: link expirado ────────────────────────────────────────
  if (expired) return (
    <div style={{ minHeight: '100vh', background: '#f5f8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '40px 32px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.1)', border: '1.5px solid #ffd699' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>⏰</div>
        <h2 style={{ fontWeight: 700, fontSize: '22px', color: '#1a2e1a', marginBottom: '10px' }}>
          Link expirado
        </h2>
        <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, marginBottom: '24px' }}>
          Este link de firma ya no está vigente. Contactá a <strong>Grupo El Ombú</strong> para solicitar un nuevo link.
        </p>
        <div style={{ padding: '12px 16px', background: '#fffbf0', border: '1px solid #ffd699', borderRadius: '10px', fontSize: '13px', color: '#996600' }}>
          Los links tienen una vigencia limitada por seguridad.
        </div>
      </div>
    </div>
  )

  // ── Pantalla: visor PDF ────────────────────────────────────────────
  if (viewing) {
    const url   = viewing === 'list' ? pdfUrl : conditionsPdfUrl!
    const label = viewing === 'list' ? 'Lista de precios' : 'Condiciones de acopio'
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
        <div style={{ background: '#1a3a1a', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>{label}</div>
            <div style={{ fontSize: '11px', color: '#7ecfa0', marginTop: '1px' }}>{fileName}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href={url} target="_blank" rel="noopener noreferrer"
              style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.12)', color: '#7ecfa0', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
              ↓ Descargar
            </a>
            <button onClick={() => setViewing(null)}
              style={{ padding: '6px 14px', borderRadius: '8px', background: '#00952e', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
              ← Volver
            </button>
          </div>
        </div>
        <iframe src={googleViewerUrl(url)} style={{ flex: 1, border: 'none', width: '100%' }} title={label} allow="fullscreen" />
      </div>
    )
  }

  // ── Pantalla: firma exitosa ────────────────────────────────────────
  if (done) return (
    <div style={{ minHeight: '100vh', background: '#f0f4f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '40px 32px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.1)', border: '1.5px solid #b8ddb8' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#f0faf0', border: '3px solid #00952e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="36" height="36" fill="none" stroke="#00952e" strokeWidth={2.5} viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 style={{ fontWeight: 700, fontSize: '22px', color: '#1a2e1a', marginBottom: '10px' }}>SU FIRMA FUE REGISTRADA</h2>
        <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
          La firma digital quedó registrada correctamente en el sistema de <strong>Grupo El Ombú</strong>.
        </p>
      </div>
    </div>
  )

  // ── Pantalla: canvas de firma fullscreen ──────────────────────────
  if (fullSig) return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', zIndex: 100, background: '#fff' }}>
      <div style={{ background: '#1a3a1a', color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>Firmá las condiciones de acopio</div>
          <div style={{ fontSize: '12px', color: '#7ecfa0', marginTop: '1px' }}>{clientName} · Campo "Firma del Cliente"</div>
        </div>
        <button onClick={() => { clearSig(); setFullSig(false) }}
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#7ecfa0', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}>
          Cancelar
        </button>
      </div>
      <div style={{ flex: 1, position: 'relative', background: '#fafafa', borderBottom: '1px solid #e0e0e0' }}>
        {!hasSig && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: '#ccc', fontSize: '18px' }}>
            Dibujá tu firma aquí
          </div>
        )}
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'crosshair' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
      </div>
      <div style={{ padding: '16px', background: '#fff', flexShrink: 0 }}>
        {error && <div style={{ padding: '10px', background: '#fff1f0', border: '1px solid #ffccc7', borderRadius: '8px', color: '#cf1322', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={clearSig} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1.5px solid #e0e0e0', background: '#fff', color: '#555', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>
            Limpiar
          </button>
          <button onClick={handleSign} disabled={loading || !hasSig}
            style={{ flex: 2, padding: '14px', borderRadius: '12px', background: loading || !hasSig ? '#aaa' : '#00952e', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: loading || !hasSig ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none' }}>
            {loading ? (
              <><svg className="animate-spin" width="18" height="18" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Procesando…</>
            ) : (
              <><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Confirmar firma</>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  // ── Vista principal ────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f5f8f5', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ background: '#1a3a1a', color: '#fff', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', background: '#00952e', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth={1.8} viewBox="0 0 24 24">
            <path d="M12 22v-7" strokeLinecap="round"/>
            <path d="M9 8c0 3 1.5 5 3 7 1.5-2 3-4 3-7a3 3 0 0 0-6 0z" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '0.04em' }}>GRUPO EL OMBÚ</div>
          <div style={{ fontSize: '11px', color: '#7ecfa0' }}>Firma digital de documentos</div>
        </div>
      </header>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid #d4e8d4', padding: '16px' }}>
          <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Documento para firma</div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#1a2e1a' }}>{fileName}</div>
          {description && <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>{description}</div>}
          <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>Cliente: {clientName}</div>
        </div>

        {/* Lista de precios */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid #d4e8d4', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#f0faf0', borderBottom: '1px solid #d4e8d4' }}>
            <div style={{ fontSize: '10px', color: '#4a7a4a', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>📋 Documento principal</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>Consultá el contenido antes de firmar</div>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', gap: '10px' }}>
            <button onClick={() => setViewing('list')}
              style={{ flex: 1, padding: '11px', background: '#1a3a1a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Ver documento
            </button>
            <a href={pdfUrl} download target="_blank" rel="noopener noreferrer"
              style={{ padding: '11px 14px', background: '#f0faf0', color: '#1a3a1a', border: '1.5px solid #c0ddc0', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              ↓
            </a>
          </div>
        </div>

        {/* Condiciones de acopio */}
        {conditionsPdfUrl && (
          <div style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid #ffd699', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#fffbf0', borderBottom: '1px solid #ffd699' }}>
              <div style={{ fontSize: '10px', color: '#996600', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>📄 Condiciones de acopio — documento a firmar</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>Leé las condiciones antes de firmar digitalmente</div>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', gap: '10px' }}>
              <button onClick={() => setViewing('cond')}
                style={{ flex: 1, padding: '11px', background: '#7a5000', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Ver condiciones
              </button>
              <a href={conditionsPdfUrl} download target="_blank" rel="noopener noreferrer"
                style={{ padding: '11px 14px', background: '#fffbf0', color: '#7a5000', border: '1.5px solid #ffd699', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                ↓
              </a>
            </div>
          </div>
        )}

        {/* Firma */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid #b8ddb8', padding: '18px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#1a2e1a', marginBottom: '4px' }}>Firma digital</div>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '14px', lineHeight: 1.5 }}>
            Tu firma se incrustará en el campo <strong>"Firma del Cliente"</strong> del documento.
          </div>
          <button onClick={() => { setFullSig(true); setHasSig(false) }}
            style={{ width: '100%', padding: '18px', border: '2px dashed #00952e', borderRadius: '12px', background: '#f5fbf5', color: '#00952e', fontWeight: 600, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Tocar para firmar
          </button>
        </div>

        {error && <div style={{ padding: '12px 16px', background: '#fff1f0', border: '1px solid #ffccc7', borderRadius: '10px', color: '#cf1322', fontSize: '13px' }}>{error}</div>}

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#aaa', paddingBottom: '20px', lineHeight: 1.6 }}>
          Al firmar confirmás que leíste y aceptás el documento.
        </p>
      </div>
    </div>
  )
}
