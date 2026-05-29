'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Props { userEmail: string }

const INACTIVITY_MINUTES = 120   // desloguear después de 2 horas sin actividad
const WARNING_SECONDS    = 60    // aviso 60 segundos antes

function displayName(email: string) {
  if (!email) return ''
  const local = email.split('@')[0]
  return local.charAt(0).toUpperCase() + local.slice(1)
}

export default function AdminNav({ userEmail }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [role,     setRole]     = useState('')
  const [canUsers, setCanUsers] = useState(false)
  const [dark,     setDark]     = useState(true)
  const [mounted,  setMounted]  = useState(false)

  // Modal cambiar clave
  const [showCP,    setShowCP]    = useState(false)
  const [cpCurrent, setCpCurrent] = useState('')
  const [cpNew,     setCpNew]     = useState('')
  const [cpConfirm, setCpConfirm] = useState('')
  const [cpLoading, setCpLoading] = useState(false)
  const [cpError,   setCpError]   = useState('')
  const [cpDone,    setCpDone]    = useState(false)

  // Inactividad
  const [showWarning,   setShowWarning]   = useState(false)
  const [countdown,     setCountdown]     = useState(WARNING_SECONDS)
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimer    = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef    = useRef(WARNING_SECONDS)

  const isRoot = (
    pathname === '/admin/clientes' ||
    pathname === '/admin/usuarios' ||
    pathname === '/admin/health'
  )

  // ── Logout ──────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    if (warningTimer.current)    clearInterval(warningTimer.current)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }, [supabase, router])

  // ── Inactividad ─────────────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (showWarning) return   // si ya mostró el aviso, no resetear por movimiento

    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)

    inactivityTimer.current = setTimeout(() => {
      // Mostrar aviso con cuenta regresiva
      countdownRef.current = WARNING_SECONDS
      setCountdown(WARNING_SECONDS)
      setShowWarning(true)

      warningTimer.current = setInterval(() => {
        countdownRef.current -= 1
        setCountdown(countdownRef.current)
        if (countdownRef.current <= 0) {
          clearInterval(warningTimer.current!)
          setShowWarning(false)
          logout()
        }
      }, 1000)
    }, INACTIVITY_MINUTES * 60 * 1000)
  }, [showWarning, logout])

  function cancelLogout() {
    if (warningTimer.current) clearInterval(warningTimer.current)
    setShowWarning(false)
    resetInactivityTimer()
  }

  // ── Listeners de actividad + sesión de Supabase ──────────────────────
  useEffect(() => {
    setMounted(true)

    // Tema
    const saved  = localStorage.getItem('yesplack-theme')
    const isDark = saved ? saved === 'dark' : true
    setDark(isDark)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')

    // Rol
    fetch('/api/usuarios/me').then(r => r.json()).then(d => {
      setRole(d.role ?? '')
      setCanUsers(d.role === 'master' || (d.role === 'admin' && d.can_create_users))
    })

    // Listener de sesión Supabase — si el token expira o se invalida, redirige al login
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (event === 'SIGNED_OUT') {
          router.push('/login')
          router.refresh()
        }
      }
    })

    // Eventos de actividad del usuario
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    const handler = () => resetInactivityTimer()
    events.forEach(ev => window.addEventListener(ev, handler, { passive: true }))

    // Arrancar el timer inicial
    resetInactivityTimer()

    return () => {
      subscription.unsubscribe()
      events.forEach(ev => window.removeEventListener(ev, handler))
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      if (warningTimer.current)    clearInterval(warningTimer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('yesplack-theme', next ? 'dark' : 'light')
  }

  function openCP() {
    setCpCurrent(''); setCpNew(''); setCpConfirm('')
    setCpError(''); setCpDone(false)
    setShowCP(true)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setCpError('')
    if (cpNew.length < 6)    { setCpError('La nueva contraseña debe tener al menos 6 caracteres'); return }
    if (cpNew !== cpConfirm) { setCpError('Las contraseñas no coinciden'); return }
    if (cpCurrent === cpNew) { setCpError('La nueva contraseña debe ser diferente a la actual'); return }

    setCpLoading(true)
    try {
      const res  = await fetch('/api/cambiar-clave-propia', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ currentPassword: cpCurrent, newPassword: cpNew }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al cambiar la contraseña')
      setCpDone(true)
      setTimeout(() => { setShowCP(false); setCpDone(false) }, 2000)
    } catch (e: any) {
      setCpError(e.message)
    } finally {
      setCpLoading(false)
    }
  }

  const navLinks = [
    {
      href: '/admin/clientes', label: 'Clientes',
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    ...(canUsers ? [{
      href: '/admin/usuarios', label: 'Usuarios',
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg>,
    }] : []),
    ...(role === 'master' ? [{
      href: '/admin/health', label: 'Estado',
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    }] : []),
  ]

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{
        background: 'var(--bg-panel)', borderBottom: '1.5px solid var(--border)',
        padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 30,
        boxShadow: '0 2px 20px rgba(0,0,0,0.25)', height: '56px',
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/admin/clientes" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', marginRight: '28px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/yesplack-logo.png" alt="Yesplack" style={{ width: '24px', height: '24px', objectFit: 'contain', filter: 'drop-shadow(0 0 4px rgba(0,200,83,0.6))' }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: '0.1em', color: 'var(--text-primary)', lineHeight: 1.1 }}>YESPLACK</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '9px', letterSpacing: '0.15em', color: 'var(--ombu-green)', opacity: 0.85, textTransform: 'uppercase' }}>Firmas Digitales</div>
            </div>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {navLinks.map(link => {
              const active = pathname.startsWith(link.href)
              return (
                <Link key={link.href} href={link.href} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '8px', textDecoration: 'none',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                  fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: active ? 'var(--ombu-green)' : 'var(--text-secondary)',
                  background: active ? 'rgba(255,215,0,0.08)' : 'transparent',
                  border: active ? '1px solid rgba(255,215,0,0.2)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}>
                  {link.icon}{link.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {role === 'master' && (
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)', color: 'var(--ombu-green)', textTransform: 'uppercase' }}>
              MASTER
            </span>
          )}

          <button onClick={openCP} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 10px', borderRadius: '8px',
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-secondary)', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px',
            fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.4)'; e.currentTarget.style.color = 'var(--ombu-green)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
            </svg>
            {displayName(userEmail)}
          </button>

          <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {dark
              ? <><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>Claro</>
              : <><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>Oscuro</>
            }
          </button>

          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Salir
          </button>
        </div>
      </header>

      {/* ── Botón flotante ATRÁS ───────────────────────────────── */}
      {!isRoot && (
        <button
          onClick={() => router.back()}
          style={{
            position: 'fixed', bottom: '24px', left: '24px', zIndex: 100,
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 18px', borderRadius: '50px',
            border: '1.5px solid var(--border-hover)', background: 'var(--bg-panel)',
            color: 'var(--text-primary)', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px var(--border)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'var(--ombu-green)'; el.style.color = 'var(--ombu-green)'; el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 20px var(--ombu-glow)'; el.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--border-hover)'; el.style.color = 'var(--text-primary)'; el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px var(--border)'; el.style.transform = 'translateY(0)' }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Atrás
        </button>
      )}

      {/* ── Modal: Aviso de inactividad ───────────────────────── */}
      {mounted && showWarning && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px', background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1.5px solid rgba(255,170,0,0.4)',
            borderRadius: '20px', padding: '32px 28px', width: '100%', maxWidth: '360px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(255,170,0,0.1)',
            textAlign: 'center',
          }}>
            {/* Ícono */}
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'rgba(255,170,0,0.12)', border: '2px solid rgba(255,170,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" fill="none" stroke="#ffaa00" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>

            <div>
              <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '20px', color: 'var(--text-primary)', letterSpacing: '0.05em', marginBottom: '8px' }}>
                ¿Seguís ahí?
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Por inactividad, la sesión se cerrará en
              </p>
              <div style={{
                fontFamily: "'Rajdhani', sans-serif", fontWeight: 700,
                fontSize: '48px', color: countdown <= 10 ? '#f87171' : '#ffaa00',
                lineHeight: 1.1, margin: '8px 0',
                transition: 'color 0.3s',
              }}>
                {countdown}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>segundos</p>
            </div>

            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button onClick={logout} style={{
                flex: 1, padding: '11px', borderRadius: '12px',
                border: '1.5px solid rgba(255,255,255,0.15)', background: 'transparent',
                color: 'var(--text-secondary)', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                Salir ahora
              </button>
              <button onClick={cancelLogout} style={{
                flex: 2, padding: '11px', borderRadius: '12px',
                border: '1.5px solid rgba(255,170,0,0.5)', background: 'rgba(255,170,0,0.12)',
                color: '#ffaa00', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                Seguir conectado
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal: Cambiar contraseña ─── via Portal ─────────── */}
      {mounted && showCP && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget && !cpLoading) setShowCP(false) }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', border: '1.5px solid var(--border-hover)',
              borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '380px',
              display: 'flex', flexDirection: 'column', gap: '20px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}
          >
            {cpDone ? (
              <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,215,0,0.15)', border: '2px solid var(--ombu-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--ombu-green)', fontSize: '22px', fontWeight: 700 }}>✓</span>
                </div>
                <p style={{ color: 'var(--ombu-green)', fontWeight: 700, fontSize: '16px', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.05em' }}>
                  CONTRASEÑA ACTUALIZADA
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '20px', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                    Cambiar contraseña
                  </h2>
                  <button onClick={() => setShowCP(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '2px 6px' }}>✕</button>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '-12px', lineHeight: 1.5 }}>
                  Sesión activa: <strong style={{ color: 'var(--text-primary)' }}>{displayName(userEmail)}</strong>
                </p>

                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { label: 'Contraseña actual',    value: cpCurrent, setter: setCpCurrent, autoComplete: 'current-password' },
                    { label: 'Nueva contraseña',     value: cpNew,     setter: setCpNew,     autoComplete: 'new-password' },
                    { label: 'Confirmar contraseña', value: cpConfirm, setter: setCpConfirm, autoComplete: 'new-password' },
                  ].map(field => (
                    <div key={field.label}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px', fontFamily: "'Barlow Condensed', sans-serif" }}>
                        {field.label}
                      </label>
                      <input
                        type="password"
                        className="xbox-input"
                        value={field.value}
                        onChange={e => field.setter(e.target.value)}
                        autoComplete={field.autoComplete}
                        required
                        minLength={field.label === 'Contraseña actual' ? 1 : 6}
                      />
                    </div>
                  ))}

                  {cpError && (
                    <p style={{ fontSize: '13px', color: '#f87171', background: 'rgba(220,38,38,0.1)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(220,38,38,0.3)' }}>
                      {cpError}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '10px', paddingTop: '2px' }}>
                    <button type="button" onClick={() => setShowCP(false)} disabled={cpLoading}
                      style={{ flex: 1, padding: '11px', borderRadius: '12px', border: '1.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif" }}>
                      Cancelar
                    </button>
                    <button type="submit" disabled={cpLoading || !cpCurrent || !cpNew || !cpConfirm}
                      style={{
                        flex: 1, padding: '11px', borderRadius: '12px',
                        border: '1.5px solid var(--ombu-green)', background: 'rgba(255,215,0,0.15)',
                        color: 'var(--ombu-green)',
                        cursor: cpLoading || !cpCurrent || !cpNew || !cpConfirm ? 'not-allowed' : 'pointer',
                        opacity: cpLoading || !cpCurrent || !cpNew || !cpConfirm ? 0.5 : 1,
                        fontSize: '14px', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif",
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>
                      {cpLoading ? 'Guardando…' : 'Confirmar'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
