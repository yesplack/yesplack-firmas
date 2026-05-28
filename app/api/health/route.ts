import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export const runtime     = 'nodejs'
export const maxDuration = 15

interface CheckResult {
  ok:      boolean
  latency: number        // ms
  detail?: string
  value?:  string | number
}

async function measure(fn: () => Promise<CheckResult>): Promise<CheckResult> {
  const t0 = Date.now()
  try {
    const result = await fn()
    return { ...result, latency: result.latency ?? Date.now() - t0 }
  } catch (err: any) {
    return { ok: false, latency: Date.now() - t0, detail: err.message ?? 'Error desconocido' }
  }
}

export async function GET(_req: NextRequest) {
  const started = Date.now()
  const admin   = createAdminClient() as any

  const [db, auth, storage, tables, recentActivity] = await Promise.all([

    // ── 1. Base de datos ───────────────────────────────────────────────
    measure(async () => {
      const t0 = Date.now()
      const { error } = await admin.from('profiles').select('id').limit(1)
      if (error) throw new Error(error.message)
      return { ok: true, latency: Date.now() - t0, detail: 'Conexión activa' }
    }),

    // ── 2. Auth (admin client) ─────────────────────────────────────────
    measure(async () => {
      const t0 = Date.now()
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 1 })
      if (error) throw new Error(error.message)
      return { ok: true, latency: Date.now() - t0, value: data.total_count, detail: `${data.total_count} usuarios en auth` }
    }),

    // ── 3. Storage ────────────────────────────────────────────────────
    measure(async () => {
      const t0 = Date.now()
      const { data, error } = await admin.storage.from('pdfs').list('', { limit: 1 })
      if (error) throw new Error(error.message)
      return { ok: true, latency: Date.now() - t0, detail: 'Bucket pdfs accesible' }
    }),

    // ── 4. Tablas principales ─────────────────────────────────────────
    measure(async () => {
      const t0 = Date.now()
      const [r1, r2, r3] = await Promise.all([
        admin.from('profiles').select('*', { count: 'exact', head: true }),
        admin.from('price_lists').select('*', { count: 'exact', head: true }),
        admin.from('clients').select('*', { count: 'exact', head: true }),
      ])
      if (r1.error) throw new Error(`profiles: ${r1.error.message}`)
      if (r2.error) throw new Error(`price_lists: ${r2.error.message}`)
      if (r3.error) throw new Error(`clients: ${r3.error.message}`)
      return {
        ok: true,
        latency: Date.now() - t0,
        detail: `${r3.count} clientes · ${r1.count} usuarios · ${r2.count} documentos`,
        value: { clients: r3.count, users: r1.count, documents: r2.count },
      }
    }),

    // ── 5. Actividad reciente ─────────────────────────────────────────
    measure(async () => {
      const t0 = Date.now()
      const { data, error } = await admin
        .from('price_lists')
        .select('status, signed_at, document_type, uploaded_at')
        .order('uploaded_at', { ascending: false })
        .limit(5)
      if (error) throw new Error(error.message)
      const signed  = data.filter((d: any) => d.status === 'signed').length
      const pending = data.filter((d: any) => d.status === 'pending').length
      return {
        ok: true,
        latency: Date.now() - t0,
        detail: `Últimos 5: ${signed} firmados, ${pending} pendientes`,
        value: data,
      }
    }),
  ])

  const allOk   = [db, auth, storage, tables].every(c => c.ok)
  const elapsed = Date.now() - started

  const payload = {
    status:    allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    elapsed,
    checks: {
      database:        db,
      auth:            auth,
      storage:         storage,
      tables:          tables,
      recent_activity: recentActivity,
    },
  }

  return NextResponse.json(payload, { status: allOk ? 200 : 503 })
}
