'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  token:      string
  clientName: string
  fileName:   string
}

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

export default function LinkModal({ token, clientName, fileName }: Props) {
  const [open,   setOpen]   = useState(false)
  const [copied, setCopied] = useState(false)

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/firmar/${token}`

  function copyLink() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(
      `Hola! Te enviamos la lista de precios de Grupo El Ombú.\n\nPor favor, revisá el documento y firmalo digitalmente desde este link:\n${url}\n\nGracias!`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="btn-xbox"
        style={{ fontSize: '11px', padding: '5px 10px' }}
      >
        Link ↗
      </button>

      {/* Modal via Portal — escapa cualquier stacking context */}
      {open && (
        <Portal>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 99999,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border-hover)',
                borderRadius: '20px',
                padding: '24px',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 40px var(--ombu-glow)',
              }}
            >
              {/* Header */}
              <h3 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--ombu-green)', marginBottom: '4px' }}>
                Compartir con cliente
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {clientName} · {fileName}
              </p>

              {/* URL */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1.5px solid var(--border)',
                borderRadius: '12px',
                padding: '12px 14px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                wordBreak: 'break-all',
                marginBottom: '16px',
                lineHeight: 1.5,
              }}>
                {url}
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={shareWhatsApp}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '12px', borderRadius: '12px',
                    background: '#25d366', color: '#fff', border: 'none',
                    fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                    fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em',
                  }}
                >
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Enviar por WhatsApp
                </button>

                <button
                  onClick={copyLink}
                  style={{
                    width: '100%', padding: '11px', borderRadius: '12px',
                    border: '1.5px solid var(--border-hover)',
                    background: copied ? 'rgba(0,200,83,0.1)' : 'transparent',
                    color: copied ? 'var(--ombu-green)' : 'var(--text-primary)',
                    fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                    fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em',
                    transition: 'all 0.2s',
                  }}
                >
                  {copied ? '+ Link copiado!' : 'Copiar link'}
                </button>

                <button
                  onClick={() => setOpen(false)}
                  style={{
                    width: '100%', padding: '9px', borderRadius: '12px',
                    border: 'none', background: 'transparent',
                    color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
