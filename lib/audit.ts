import { createAdminClient } from '@/lib/supabase-server'

/**
 * Registra una acción en la tabla audit_logs.
 * Nunca lanza errores — si falla el log, la app sigue funcionando.
 */
export async function logAction({
  action,
  entityType,
  entityId,
  userId,
  ip,
  userAgent,
  metadata,
}: {
  action:      string
  entityType?: string
  entityId?:   string
  userId?:     string | null
  ip?:         string | null
  userAgent?:  string | null
  metadata?:   Record<string, any>
}) {
  try {
    const admin = createAdminClient() as any
    await admin.from('audit_logs').insert({
      action,
      entity_type: entityType ?? null,
      entity_id:   entityId   ?? null,
      user_id:     userId     ?? null,
      ip:          ip         ?? null,
      user_agent:  userAgent  ?? null,
      metadata:    metadata   ?? null,
    })
  } catch (err) {
    // Los fallos de auditoría nunca deben romper la app
    console.error('[audit] log failed:', err)
  }
}

/**
 * Verifica si una IP superó el límite de intentos de una acción.
 * Devuelve true si el request PUEDE continuar, false si debe bloquearse.
 */
export async function checkRateLimit(
  ip:             string,
  action:         string,
  maxAttempts:    number,
  windowMinutes:  number
): Promise<boolean> {
  try {
    const admin = createAdminClient() as any
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
    const { count } = await admin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .eq('action', action)
      .gte('created_at', since)
    return (count ?? 0) < maxAttempts
  } catch {
    return true // En caso de error, permitir el request
  }
}
