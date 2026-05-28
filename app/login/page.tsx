'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const FAKE_DOMAIN = '@yesplack.internal'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password,   setPassword]   = useState('')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    const email = identifier.includes('@')
      ? identifier.trim()
      : `${identifier.trim().toLowerCase()}${FAKE_DOMAIN}`

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError || !signInData.user) {
      setError('Usuario o contraseña incorrectos')
      setLoading(false)
      return
    }

    // Verificar si debe cambiar la clave
    const { data: profile } = await supabase
      .from('profiles')
      .select('must_change_password')
      .eq('id', signInData.user.id)
      .single()

    if (profile?.must_change_password) {
      router.push('/cambiar-clave')
    } else {
      router.push('/admin/clientes')
    }
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255,215,0,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

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
            <Image
              src="/yesplack-logo.png"
              alt="Yesplack"
              width={52}
              height={52}
              style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.7))' }}
            />
          </div>
          <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '24px', letterSpacing: '0.12em', color: 'var(--text-primary)' }}>
            YESPLACK
          </h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.2em', color: 'var(--ombu-green)', marginTop: '4px' }}>
            SISTEMA DE FIRMAS DIGITALES
          </p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '20px', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: '18px', color: 'var(--text-primary)', marginBottom: '24px', letterSpacing: '0.06em' }}>
            Iniciar sesión
          </h2>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: '6px' }}>
                Usuario o Email
              </label>
              <input
                type="text"
                className="xbox-input"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
                autoFocus
                autoComplete="username"
              />
            </div>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: '6px' }}>
                Contraseña
              </label>
              <input
                type="password"
                className="xbox-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
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
              {loading ? 'Ingresando...' : 'INGRESAR'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em' }}>
          ACCESO RESTRINGIDO — SOLO PERSONAL AUTORIZADO
        </p>
      </div>
    </div>
  )
}
