'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createBrowserClient } from '@supabase/ssr'

interface Profile {
  id: string
  username: string
  nickname: string
  role: 'master' | 'admin' | 'basic'
  can_create_users: boolean
  must_change_password: boolean
  is_active: boolean
}

const ROLE_LABEL: Record<string, string> = {
  master: '⭐ Maestro',
  admin:  '🛡 Admin',
  basic:  '👤 Básico',
}

/* ─────────────────────────────────────────────
   Portal wrapper
───────────────────────────────────────────── */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 99999,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '16px',
  background: 'rgba(0,0,0,0.85)',
  backdropFilter: 'blur(6px)',
}

/* ═══════════════════════════════════════════
   Componente principal
═══════════════════════════════════════════ */
export default function UsuariosClientPage({
  currentRole,
  currentUserId,
  currentCanCreate = false,
}: {
  currentRole: string
  currentUserId: string
  currentCanCreate?: boolean
}) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading,  setLoading]  = useState(true)

  /* ── Nuevo usuario ── */
  const [showNew,    setShowNew]    = useState(false)
  const [form,       setForm]       = useState({ username: '', nickname: '', password: '', role: 'basic' as 'admin' | 'basic', can_create_users: false })
  const [saving,     setSaving]     = useState(false)
  const [formError,  setFormError]  = useState('')

  /* ── Blanquear clave ── */
  const [showBlanquear,    setShowBlanquear]    = useState(false)
  const [blanquearTarget,  setBlanquearTarget]  = useState<{ id: string; username: string } | null>(null)
  const [tempPassword,     setTempPassword]     = useState('')
  const [blanquearSaving,  setBlanquearSaving]  = useState(false)
  const [blanquearError,   setBlanquearError]   = useState('')
  const [blanquearDone,    setBlanquearDone]    = useState(false)

  /* ── Reset debug ── */
  const [showReset,  setShowReset]  = useState(false)
  const [resetting,  setResetting]  = useState(false)
  const [resetDone,  setResetDone]  = useState(false)
  const [resetError, setResetError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const isMaster   = currentRole === 'master'
  const canManage  = isMaster || (currentRole === 'admin' && currentCanCreate)

  /* ── data ── */
  async function load() {
    setLoading(true)
    try {
      const res  = await fetch('/api/usuarios')
      const json = await res.json()
      setProfiles(json.profiles ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  /* ── create user ── */
  async function createUser() {
    setSaving(true); setFormError('')
    try {
      const res  = await fetch('/api/usuarios', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al crear usuario')
      setShowNew(false)
      setForm({ username: '', nickname: '', password: '', role: 'basic', can_create_users: false })
      load()
    } catch (e: any) { setFormError(e.message) }
    finally { setSaving(false) }
  }

  /* ── toggle active ── */
  async function toggleActive(id: string, current: boolean) {
    await fetch('/api/usuarios', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, is_active: !current }),
    })
    load()
  }

  /* ── delete user ── */
  async function deleteUser(id: string) {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return
    await fetch('/api/usuarios', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    load()
  }

  /* ── blanquear clave ── */
  function openBlanquear(profile: Profile) {
    setBlanquearTarget({ id: profile.id, username: profile.username })
    setTempPassword('')
    setBlanquearError('')
    setBlanquearDone(false)
    setShowBlanquear(true)
  }

  async function handleBlanquear() {
    if (!blanquearTarget) return
    if (tempPassword.length < 6) { setBlanquearError('Mínimo 6 caracteres'); return }
    setBlanquearSaving(true); setBlanquearError('')
    try {
      const res  = await fetch('/api/usuarios', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: blanquearTarget.id, newPassword: tempPassword }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al blanquear')
      setBlanquearDone(true)
      setTimeout(() => {
        setShowBlanquear(false)
        setBlanquearDone(false)
        setBlanquearTarget(null)
        load()
      }, 1800)
    } catch (e: any) { setBlanquearError(e.message) }
    finally { setBlanquearSaving(false) }
  }

  /* ── reset debug ── */
  async function handleReset() {
    setResetting(true); setResetError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sin sesión activa')
      const res  = await fetch('/api/reset', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al resetear')
      setResetDone(true)
      setTimeout(() => { setShowReset(false); setResetDone(false); window.location.reload() }, 1800)
    } catch (e: any) { setResetError(e.message) }
    finally { setResetting(false) }
  }

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <div style={{ maxWidth: '896px', margin: '0 auto', padding: '32px 16px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>
            Gestión de Usuarios
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {profiles.length} usuario{profiles.length !== 1 ? 's' : ''} registrado{profiles.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {isMaster && (
            <button
              onClick={() => setShowReset(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '10px',
                border: '1.5px solid rgba(220,38,38,0.5)',
                background: 'rgba(220,38,38,0.08)', color: '#f87171',
                cursor: 'pointer',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em',
              }}
            >
              🗑 RESET DEBUG
            </button>
          )}
          {canManage && (
            <button
              onClick={() => { setShowNew(true); setFormError('') }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 18px', borderRadius: '10px',
                border: '1.5px solid var(--ombu-green)',
                background: 'rgba(0,200,83,0.12)', color: 'var(--ombu-green)',
                cursor: 'pointer',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em',
              }}
            >
              + NUEVO USUARIO
            </button>
          )}
        </div>
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '48px' }}>Cargando...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {profiles.map(p => (
            <div
              key={p.id}
              className="xbox-card"
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 18px',
                opacity: p.is_active ? 1 : 0.5,
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                background: p.role === 'master' ? 'rgba(251,191,36,0.15)' : p.role === 'admin' ? 'rgba(59,130,246,0.15)' : 'rgba(107,114,128,0.15)',
                border: `2px solid ${p.role === 'master' ? 'rgba(251,191,36,0.5)' : p.role === 'admin' ? 'rgba(59,130,246,0.5)' : 'rgba(107,114,128,0.4)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '16px',
                color: p.role === 'master' ? '#fbbf24' : p.role === 'admin' ? '#60a5fa' : '#9ca3af',
              }}>
                {(p.nickname || p.username).charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', fontFamily: 'Rajdhani, sans-serif' }}>
                    {p.nickname || p.username}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{p.username}</span>
                  {p.must_change_password && (
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                      background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.35)',
                      color: '#fbbf24', fontFamily: 'Barlow Condensed, sans-serif',
                      letterSpacing: '0.06em', fontWeight: 600,
                    }}>
                      clave temporal
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                    background: p.role === 'master' ? 'rgba(251,191,36,0.08)' : p.role === 'admin' ? 'rgba(59,130,246,0.08)' : 'rgba(107,114,128,0.08)',
                    border: `1px solid ${p.role === 'master' ? 'rgba(251,191,36,0.3)' : p.role === 'admin' ? 'rgba(59,130,246,0.3)' : 'rgba(107,114,128,0.3)'}`,
                    color: p.role === 'master' ? '#fbbf24' : p.role === 'admin' ? '#60a5fa' : '#9ca3af',
                    fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em',
                  }}>
                    {ROLE_LABEL[p.role]}
                  </span>
                  {p.can_create_users && (
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(0,200,83,0.08)', border: '1px solid rgba(0,200,83,0.25)', color: 'var(--ombu-green)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}>
                      puede crear usuarios
                    </span>
                  )}
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                    background: p.is_active ? 'rgba(0,200,83,0.08)' : 'rgba(107,114,128,0.08)',
                    border: `1px solid ${p.is_active ? 'rgba(0,200,83,0.25)' : 'rgba(107,114,128,0.25)'}`,
                    color: p.is_active ? 'var(--ombu-green)' : '#9ca3af',
                    fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em',
                  }}>
                    {p.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              {/* Acciones */}
              {p.role !== 'master' && (
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {/* Blanquear clave — master o admin con can_create */}
                  {canManage && (
                    <button
                      onClick={() => openBlanquear(p)}
                      style={{
                        padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                        border: '1.5px solid rgba(251,191,36,0.4)',
                        background: 'rgba(251,191,36,0.07)', color: '#fbbf24',
                        cursor: 'pointer',
                        fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em',
                        transition: 'all 0.15s',
                      }}
                    >
                      🔑 Blanquear clave
                    </button>
                  )}
                  {/* Desactivar/Activar — solo master */}
                  {isMaster && (
                    <button
                      onClick={() => toggleActive(p.id, p.is_active)}
                      style={{
                        padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                        border: '1.5px solid rgba(255,255,255,0.15)',
                        background: 'transparent', color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em',
                      }}
                    >
                      {p.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  )}
                  {/* Eliminar — solo master */}
                  {isMaster && (
                    <button
                      onClick={() => deleteUser(p.id)}
                      style={{
                        padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                        border: '1.5px solid rgba(220,38,38,0.4)',
                        background: 'rgba(220,38,38,0.08)', color: '#f87171',
                        cursor: 'pointer',
                        fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em',
                      }}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════
          MODAL: Nuevo usuario
      ════════════════════════════════════════ */}
      {showNew && (
        <Portal>
          <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) { setShowNew(false); setFormError('') } }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'var(--bg-card)', border: '1.5px solid var(--border-hover)',
              borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '420px',
              display: 'flex', flexDirection: 'column', gap: '18px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--text-primary)', letterSpacing: '0.06em' }}>
                Nuevo usuario
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', fontFamily: 'Barlow Condensed, sans-serif' }}>
                    Nombre de usuario
                  </label>
                  <input
                    type="text"
                    className="xbox-input"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[@\s]/g, '') }))}
                    autoFocus
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', fontFamily: 'Barlow Condensed, sans-serif' }}>
                    Nombre visible (opcional)
                  </label>
                  <input
                    type="text"
                    className="xbox-input"
                    value={form.nickname}
                    onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', fontFamily: 'Barlow Condensed, sans-serif' }}>
                    Contraseña temporal
                  </label>
                  <input
                    type="text"
                    className="xbox-input"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                    El usuario deberá cambiarla en su primer ingreso.
                  </p>
                </div>

                {isMaster && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', fontFamily: 'Barlow Condensed, sans-serif' }}>
                        Rol
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {(['basic', 'admin'] as const).map(r => (
                          <button
                            key={r} type="button"
                            onClick={() => setForm(f => ({ ...f, role: r }))}
                            style={{
                              flex: 1, padding: '9px', borderRadius: '10px', border: '1.5px solid',
                              borderColor: form.role === r ? 'var(--ombu-green)' : 'rgba(255,255,255,0.1)',
                              background: form.role === r ? 'rgba(0,200,83,0.1)' : 'transparent',
                              color: form.role === r ? 'var(--ombu-green)' : 'var(--text-secondary)',
                              cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif',
                              fontSize: '13px', fontWeight: 600, transition: 'all 0.15s',
                            }}
                          >
                            {ROLE_LABEL[r]}
                          </button>
                        ))}
                      </div>
                    </div>
                    {form.role === 'admin' && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                        <div
                          onClick={() => setForm(f => ({ ...f, can_create_users: !f.can_create_users }))}
                          style={{
                            width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
                            border: '2px solid', transition: 'all 0.15s',
                            borderColor: form.can_create_users ? 'var(--ombu-green)' : 'rgba(255,255,255,0.3)',
                            background: form.can_create_users ? 'var(--ombu-green)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {form.can_create_users && <span style={{ color: '#000', fontSize: '12px', fontWeight: 700, lineHeight: 1 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          Puede crear y gestionar otros usuarios
                        </span>
                      </label>
                    )}
                  </>
                )}
              </div>

              {formError && (
                <p style={{ fontSize: '13px', color: '#f87171', background: 'rgba(220,38,38,0.1)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(220,38,38,0.3)' }}>
                  {formError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setShowNew(false); setFormError('') }} disabled={saving}
                  style={{ flex: 1, padding: '11px', borderRadius: '12px', border: '1.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, fontFamily: 'Barlow Condensed, sans-serif' }}>
                  Cancelar
                </button>
                <button type="button" onClick={createUser}
                  disabled={saving || !form.username.trim() || !form.password.trim()}
                  style={{
                    flex: 1, padding: '11px', borderRadius: '12px',
                    border: '1.5px solid var(--ombu-green)', background: 'rgba(0,200,83,0.15)', color: 'var(--ombu-green)',
                    cursor: saving || !form.username.trim() || !form.password.trim() ? 'not-allowed' : 'pointer',
                    opacity: saving || !form.username.trim() || !form.password.trim() ? 0.45 : 1,
                    fontSize: '14px', fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>
                  {saving ? 'Creando…' : 'Crear usuario'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ════════════════════════════════════════
          MODAL: Blanquear clave
      ════════════════════════════════════════ */}
      {showBlanquear && blanquearTarget && (
        <Portal>
          <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget && !blanquearSaving) { setShowBlanquear(false) } }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'var(--bg-card)', border: '1.5px solid rgba(251,191,36,0.35)',
              borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '380px',
              display: 'flex', flexDirection: 'column', gap: '20px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(251,191,36,0.08)',
            }}>
              {blanquearDone ? (
                <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(0,200,83,0.15)', border: '2px solid var(--ombu-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--ombu-green)', fontSize: '22px', fontWeight: 700 }}>✓</span>
                  </div>
                  <p style={{ color: 'var(--ombu-green)', fontWeight: 700, fontSize: '16px', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>
                    CLAVE BLANQUEADA
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    @{blanquearTarget.username} deberá cambiarla en su próximo ingreso.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontSize: '22px', flexShrink: 0, marginTop: '2px' }}>🔑</span>
                    <div>
                      <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '20px', color: '#fbbf24', letterSpacing: '0.05em' }}>
                        Blanquear contraseña
                      </h2>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '5px', lineHeight: 1.5 }}>
                        Establecé una clave temporal para <strong style={{ color: 'var(--text-primary)' }}>@{blanquearTarget.username}</strong>. Deberá cambiarla al ingresar.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', fontFamily: 'Barlow Condensed, sans-serif' }}>
                      Nueva contraseña temporal
                    </label>
                    <input
                      type="text"
                      className="xbox-input"
                      value={tempPassword}
                      onChange={e => setTempPassword(e.target.value)}
                      autoFocus
                    />
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>Mínimo 6 caracteres.</p>
                  </div>

                  {blanquearError && (
                    <p style={{ fontSize: '13px', color: '#f87171', background: 'rgba(220,38,38,0.1)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(220,38,38,0.3)' }}>
                      {blanquearError}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => setShowBlanquear(false)} disabled={blanquearSaving}
                      style={{ flex: 1, padding: '11px', borderRadius: '12px', border: '1.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, fontFamily: 'Barlow Condensed, sans-serif' }}>
                      Cancelar
                    </button>
                    <button type="button" onClick={handleBlanquear}
                      disabled={blanquearSaving || tempPassword.length < 6}
                      style={{
                        flex: 1, padding: '11px', borderRadius: '12px',
                        border: '1.5px solid rgba(251,191,36,0.5)',
                        background: blanquearSaving ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.15)',
                        color: '#fbbf24',
                        cursor: blanquearSaving || tempPassword.length < 6 ? 'not-allowed' : 'pointer',
                        opacity: tempPassword.length < 6 ? 0.5 : 1,
                        fontSize: '14px', fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif',
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>
                      {blanquearSaving ? 'Guardando…' : 'Confirmar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Portal>
      )}

      {/* ════════════════════════════════════════
          MODAL: Reset debug
      ════════════════════════════════════════ */}
      {showReset && (
        <Portal>
          <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget && !resetting) { setShowReset(false); setResetError('') } }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'var(--bg-card)', border: '1.5px solid rgba(220,38,38,0.45)',
              borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '380px',
              display: 'flex', flexDirection: 'column', gap: '20px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(220,38,38,0.12)',
            }}>
              {resetDone ? (
                <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '48px' }}>✓</span>
                  <p style={{ color: '#4ade80', fontWeight: 700, fontSize: '17px' }}>Listas borradas correctamente</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ color: '#f87171', fontSize: '24px', marginTop: '2px', flexShrink: 0 }}>⚠</span>
                    <div>
                      <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '20px', color: '#f87171', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Reset de Debug
                      </h2>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                        Borra <strong style={{ color: 'var(--text-primary)' }}>todas las listas de precios</strong> y sus PDFs. Los clientes no se tocan.
                      </p>
                    </div>
                  </div>

                  {resetError && (
                    <p style={{ fontSize: '13px', color: '#f87171', background: 'rgba(220,38,38,0.1)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(220,38,38,0.3)' }}>
                      {resetError}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => { setShowReset(false); setResetError('') }} disabled={resetting}
                      style={{ flex: 1, padding: '11px', borderRadius: '12px', border: '1.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, fontFamily: 'Barlow Condensed, sans-serif' }}>
                      Cancelar
                    </button>
                    <button type="button" onClick={handleReset} disabled={resetting}
                      style={{
                        flex: 1, padding: '11px', borderRadius: '12px',
                        border: '1px solid rgba(220,38,38,0.5)',
                        background: resetting ? 'rgba(220,38,38,0.2)' : 'rgba(220,38,38,0.75)',
                        color: 'white', cursor: resetting ? 'not-allowed' : 'pointer',
                        fontSize: '14px', fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif',
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>
                      {resetting ? 'Borrando…' : '🗑 Confirmar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
