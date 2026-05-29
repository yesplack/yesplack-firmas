import { createAdminClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PriceListsLive from './PriceListsLive'

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const TYPE_BADGE: Record<string, string> = {
  'CTA. CORRIENTE': 'badge-cta',
  'NUEVO':          'badge-nuevo',
  'OBRAS CIVILES':  'badge-obras',
  'CLIENTE WEB':    'badge-web',
  'SALON':          'badge-salon',
}

export default async function ClientProfilePage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient() as any
  const clientId = parseInt(params.id, 10)

  const { data: clientRaw } = await (supabase as any)
    .from('clients').select('*').eq('id', clientId).single()
  const { data: listsRaw } = await (supabase as any)
    .from('price_lists').select('*').eq('client_id', clientId).order('uploaded_at', { ascending: false })

  const c = clientRaw as any
  if (!c) notFound()
  const lists = (listsRaw ?? []) as any[]

  const infoGroups = [
    {
      title: 'Identificación',
      fields: [
        { label: 'Razón social', value: c.nombre },
        { label: 'CUIT',        value: c.cuit },
        { label: 'IVA',         value: c.iva },
        { label: 'Tipo',        value: c.tipo, badge: true },
      ]
    },
    {
      title: 'Contacto',
      fields: [
        { label: 'Teléfono',  value: c.telefono },
        { label: 'Email',     value: c.email },
        { label: 'Contacto',  value: c.contacto },
        { label: 'Vendedor',  value: c.vendedor },
      ]
    },
    {
      title: 'Ubicación',
      fields: [
        { label: 'Dirección', value: c.direccion },
        { label: 'Localidad', value: c.localidad },
        { label: 'Provincia', value: c.provincia },
      ]
    },
  ].map(g => ({ ...g, fields: g.fields.filter(f => f.value) }))
   .filter(g => g.fields.length > 0)

  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '13px' }}>
        <Link href="/admin/clientes" style={{ color: 'var(--ombu-green)', textDecoration: 'none', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em' }}>
          CLIENTES
        </Link>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em', fontWeight: 600 }}>
          {c.nombre}
        </span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: 'linear-gradient(135deg, var(--ombu-dark), var(--ombu-darker))',
          border: '1.5px solid var(--border-active)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px var(--ombu-glow)',
          fontSize: '18px', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700,
          color: '#fff', flexShrink: 0,
        }}>
          {c.nombre.substring(0, 2)}
        </div>
        <div style={{ flex: 1 }}>
          <div className="section-label" style={{ marginBottom: '2px' }}>N° {c.id}</div>
          <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '22px', color: 'var(--text-primary)', letterSpacing: '0.06em', lineHeight: 1.1 }}>
            {c.nombre}
          </h1>
          {c.tipo && (
            <span className={`badge ${TYPE_BADGE[c.tipo] ?? 'badge-salon'}`} style={{ marginTop: '4px', display: 'inline-flex' }}>
              {c.tipo}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px', alignItems: 'start' }}>

        {/* Columna izquierda: info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {infoGroups.map(group => (
            <div key={group.title} className="xbox-card" style={{ padding: '16px 18px' }}>
              <div className="section-label" style={{ marginBottom: '12px', color: 'var(--ombu-green)', opacity: 0.8 }}>
                {group.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {group.fields.map(field => (
                  <div key={field.label} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <dt style={{ width: '80px', flexShrink: 0, fontSize: '11px', color: 'var(--text-muted)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', paddingTop: '1px' }}>
                      {field.label}
                    </dt>
                    <dd style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                      {(field as any).badge && TYPE_BADGE[field.value]
                        ? <span className={`badge ${TYPE_BADGE[field.value]}`}>{field.value}</span>
                        : field.value
                      }
                    </dd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {c.nota && (
            <div className="xbox-card" style={{ padding: '16px 18px' }}>
              <div className="section-label" style={{ marginBottom: '8px', color: 'var(--ombu-green)', opacity: 0.8 }}>Nota interna</div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.nota}</p>
            </div>
          )}
        </div>

        {/* Columna derecha: listas en tiempo real */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <PriceListsLive
            clientId={c.id}
            clientName={c.nombre}
            initial={lists}
          />
        </div>

      </div>
    </div>
  )
}
