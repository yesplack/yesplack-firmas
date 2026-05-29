import { createAdminClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SupplierDocsLive from './SupplierDocsLive'

export default async function ProveedorProfilePage({ params }: { params: { id: string } }) {
  const supabase    = createAdminClient() as any
  const supplierId  = parseInt(params.id, 10)

  const { data: supplierRaw } = await supabase
    .from('suppliers').select('*').eq('id', supplierId).single()
  const { data: docsRaw } = await supabase
    .from('price_lists').select('*')
    .eq('supplier_id', supplierId)
    .order('uploaded_at', { ascending: false })

  const s = supplierRaw as any
  if (!s) notFound()
  const docs = (docsRaw ?? []) as any[]

  const infoGroups = [
    {
      title: 'Identificación',
      fields: [
        { label: 'Razón social', value: s.nombre },
        { label: 'CUIT',        value: s.cuit },
        { label: 'Código FOX',  value: s.numero ? `#${s.numero}` : null },
      ]
    },
    {
      title: 'Contacto',
      fields: [
        { label: 'Teléfono', value: s.telefono },
        { label: 'Email',    value: s.email },
        { label: 'Contacto', value: s.contacto },
      ]
    },
    {
      title: 'Ubicación',
      fields: [
        { label: 'Dirección', value: s.direccion },
        { label: 'Localidad', value: s.localidad },
        { label: 'Provincia', value: s.provincia },
      ]
    },
  ].map(g => ({ ...g, fields: g.fields.filter(f => f.value) }))
   .filter(g => g.fields.length > 0)

  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '13px' }}>
        <Link href="/admin/proveedores" style={{ color: 'var(--ombu-green)', textDecoration: 'none', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em' }}>
          PROVEEDORES
        </Link>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em', fontWeight: 600 }}>
          {s.nombre}
        </span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))',
          border: '1.5px solid rgba(255,215,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700,
          color: 'var(--ombu-green)', flexShrink: 0,
        }}>
          {s.nombre.substring(0, 2)}
        </div>
        <div style={{ flex: 1 }}>
          <div className="section-label" style={{ marginBottom: '2px' }}>
            Proveedor {s.numero ? `N° ${s.numero}` : `#${s.id}`}
          </div>
          <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '22px', color: 'var(--text-primary)', letterSpacing: '0.06em', lineHeight: 1.1 }}>
            {s.nombre}
          </h1>
          {s.cuit && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>CUIT: {s.cuit}</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>
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
                    <dt style={{ width: '90px', flexShrink: 0, fontSize: '11px', color: 'var(--text-muted)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', paddingTop: '1px' }}>
                      {field.label}
                    </dt>
                    <dd style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                      {field.value}
                    </dd>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {s.nota && (
            <div className="xbox-card" style={{ padding: '16px 18px' }}>
              <div className="section-label" style={{ marginBottom: '8px', color: 'var(--ombu-green)', opacity: 0.8 }}>Nota interna</div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.nota}</p>
            </div>
          )}
        </div>

        {/* Columna derecha: documentos en tiempo real */}
        <div>
          <SupplierDocsLive
            supplierId={s.id}
            supplierName={s.nombre}
            initial={docs}
          />
        </div>
      </div>
    </div>
  )
}
