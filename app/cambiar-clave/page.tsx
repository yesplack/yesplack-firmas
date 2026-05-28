'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function CambiarClavePage() {
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error,           setError]           = useState('')
  const [loading,         setLoading]         = useState(false)
  const [done,            setDone]            = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const res  = await fetch('/api/cambiar-clave', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ newPassword }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al cambiar la contraseña')
      setDone(true)
      setTimeout(() => {
        router.push('/admin/clientes')
        router.refresh()
      }, 1800)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(0,200,83,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }} className="fade-in">

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '18px',
            background: 'var(--bg-card)',
            border: '1.5px solid var(--border-hover)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 40px var(--ombu-glow)',
          }}>
            <Image src="/ombu-logo.png" alt="Ombú" width={52} height={52}
              style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(0,200,83,0.7))' }}
            />
          </div>
          <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '24px', letterSpacing: '0.12em', color: 'var(--text-primary)' }}>
            GRUPO EL OMBÚ
          </h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.2em', color: 'var(--ombu-green)', marginTop: '4px' }}>
            SISTEMA DE FIRMAS DIGITALES
          </p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '20px', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>

          {done ? (
            <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0,200,83,0.15)', border: '2px solid var(--ombu-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'var(--ombu-green)', fontSize: '24px', fontWeight: 700 }}>✓</span>
              </div>
              <p style={{ color: 'var(--ombu-green)', fontWeight: 700, fontSize: '17px', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em' }}>
                CONTRASEÑA ACTUALIZADA
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Ingresando al sistema...
              </p>
            </div>
          ) : (
            <>
              {/* Banner de aviso */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '12px', marginBottom: '24px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>🔐</span>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em' }}>
                    CAMBIO DE CONTRASEÑA REQUERIDO
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.5 }}>
                    Es tu primer ingreso. Por seguridad, elegí una contraseña personal antes de continuar.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '6px' }}>
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    className="xbox-input"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    autoFocus
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '6px' }}>
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    className="xbox-input"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>

                {error && (
                  <div style={{ padding: '10px 14px', background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)', borderRadius: '10px', color: '#ff5050', fontSize: '13px' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-xbox filled"
                  style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '14px', borderRadius: '12px', marginTop: '4px', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? 'Guardando...' : 'CONFIRMAR CONTRASEÑA'}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em' }}>
          ACCESO RESTRINGIDO — SOLO PERSONAL AUTORIZADO
        </p>
      </div>
    </div>
  )
}
