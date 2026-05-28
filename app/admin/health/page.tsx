'use client'

import { useState, useEffect, useCallback } from 'react'

interface CheckResult {
  ok:      boolean
  latency: number
  detail?: string
  value?:  any
}

interface HealthData {
  status:    'ok' | 'degraded'
  timestamp: string
  elapsed:   number
  checks: {
    database:        CheckResult
    auth:            CheckResult
    storage:         CheckResult
    tables:          CheckResult
    recent_activity: CheckResult
  }
}

const CHECK_LABELS: Record<string, { label: string; icon: string }> = {
  database:        { label: 'Base de datos',    icon: '🗄️' },
  auth:            { label: 'Autenticación',    icon: '🔐' },
  storage:         { label: 'Storage PDFs',     icon: '📦' },
  tables:          { label: 'Tablas',           icon: '📊' },
  recent_activity: { label: 'Actividad reciente', icon: '⚡' },
}

function LatencyBar({ ms }: { ms: number }) {
  const color = ms < 300 ? '#00c853' : ms < 800 ? '#ffaa00' : '#f87171'
  const width = Math.min(100, (ms / 1000) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
      <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '11px', color, fontFamily: "'Barlow Condensed', sans-serif", minWidth: '44px', textAlign: 'right' }}>
        {ms}ms
      </span>
    </div>
  )
}

export default function HealthPage() {
  const [data,        setData]        = useState<HealthData | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const runCheck = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/health', { cache: 'no-store' })
      const json = await res.json()
      setData(json)
      setLastChecked(new Date())
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh cada 30s si está activado
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(runCheck, 30_000)
    return () => clearInterval(id)
  }, [autoRefresh, runCheck])

  // Primer check al montar
  useEffect(() => { runCheck() }, [runCheck])

  const allOk = data?.status === 'ok'

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)', letterSpacing: '0.06em' }}>
            Estado del sistema
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {lastChecked
              ? `Último chequeo: ${lastChecked.toLocaleTimeString('es-AR')}`
              : 'Verificando servicios...'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Auto-refresh toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <div
              onClick={() => setAutoRefresh(a => !a)}
              style={{
                width: '36px', height: '20px', borderRadius: '10px',
                background: autoRefresh ? 'var(--ombu-green)' : 'rgba(255,255,255,0.12)',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: '3px',
                left: autoRefresh ? '19px' : '3px',
                width: '14px', height: '14px', borderRadius: '50%',
                background: 'white', transition: 'left 0.2s',
              }} />
            </div>
            Auto (30s)
          </label>

          <button
            onClick={runCheck}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '10px',
              border: '1.5px solid var(--ombu-green)',
              background: 'rgba(0,200,83,0.1)', color: 'var(--ombu-green)',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em',
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="13" height="13" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Verificando...
              </>
            ) : '↻ Verificar ahora'}
          </button>
        </div>
      </div>

      {/* Banner de estado global */}
      {data && (
        <div style={{
          padding: '16px 20px', borderRadius: '14px', marginBottom: '24px',
          background: allOk ? 'rgba(0,200,83,0.08)' : 'rgba(220,38,38,0.08)',
          border: `1.5px solid ${allOk ? 'rgba(0,200,83,0.4)' : 'rgba(220,38,38,0.4)'}`,
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <span style={{ fontSize: '28px' }}>{allOk ? '✅' : '⚠️'}</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '18px', color: allOk ? 'var(--ombu-green)' : '#f87171', letterSpacing: '0.05em' }}>
              {allOk ? 'TODOS LOS SERVICIOS OPERATIVOS' : 'ALGUNOS SERVICIOS CON PROBLEMAS'}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Chequeo completado en {data.elapsed}ms · {new Date(data.timestamp).toLocaleString('es-AR')}
            </p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: '88px', borderRadius: '14px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', opacity: 0.5 }} />
          ))}
        </div>
      )}

      {/* Checks */}
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.entries(data.checks).map(([key, check]) => {
            const cfg = CHECK_LABELS[key] ?? { label: key, icon: '🔧' }
            return (
              <div key={key} className="xbox-card" style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  {/* Status dot */}
                  <div style={{
                    width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, marginTop: '5px',
                    background: check.ok ? '#00c853' : '#f87171',
                    boxShadow: check.ok ? '0 0 8px rgba(0,200,83,0.6)' : '0 0 8px rgba(248,113,113,0.6)',
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '20px', flexShrink: 0,
                        background: check.ok ? 'rgba(0,200,83,0.1)' : 'rgba(220,38,38,0.1)',
                        border: `1px solid ${check.ok ? 'rgba(0,200,83,0.3)' : 'rgba(220,38,38,0.3)'}`,
                        color: check.ok ? '#00c853' : '#f87171',
                        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.06em',
                      }}>
                        {check.ok ? 'OK' : 'ERROR'}
                      </span>
                    </div>

                    {check.detail && (
                      <p style={{ fontSize: '12px', color: check.ok ? 'var(--text-secondary)' : '#f87171', marginTop: '3px' }}>
                        {check.detail}
                      </p>
                    )}

                    <LatencyBar ms={check.latency} />
                  </div>
                </div>

                {/* Datos extra para tablas */}
                {key === 'tables' && check.ok && check.value && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    {[
                      { label: 'Clientes',    value: check.value.clients   },
                      { label: 'Usuarios',    value: check.value.users     },
                      { label: 'Documentos',  value: check.value.documents },
                    ].map(stat => (
                      <div key={stat.label} style={{ flex: 1, textAlign: 'center', padding: '8px', background: 'rgba(0,200,83,0.04)', borderRadius: '10px', border: '1px solid rgba(0,200,83,0.12)' }}>
                        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '22px', color: 'var(--ombu-green)' }}>
                          {stat.value?.toLocaleString('es-AR') ?? '—'}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em' }}>
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actividad reciente */}
                {key === 'recent_activity' && check.ok && Array.isArray(check.value) && check.value.length > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {check.value.map((item: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                        <span style={{
                          padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                          background: item.status === 'signed' ? 'rgba(0,200,83,0.1)' : 'rgba(255,170,0,0.1)',
                          color: item.status === 'signed' ? '#00c853' : '#ffaa00',
                          fontFamily: "'Barlow Condensed', sans-serif",
                        }}>
                          {item.status === 'signed' ? 'Firmado' : 'Pendiente'}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {item.document_type === 'invoice' ? 'Factura' : item.document_type === 'remito' ? 'Remito' : 'Lista'}
                        </span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          {new Date(item.uploaded_at).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Error de fetch */}
      {!loading && !data && (
        <div style={{ padding: '32px', textAlign: 'center', color: '#f87171', fontSize: '14px' }}>
          No se pudo conectar con el endpoint de salud. Verificá que el deploy esté activo.
        </div>
      )}
    </div>
  )
}
