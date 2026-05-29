import { createAdminClient } from '@/lib/supabase-server'
import ClientesShell from './ClientesShell'

const PAGE_SIZE = 60

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { q?: string; tipo?: string; page?: string }
}) {
  const supabase = createAdminClient() as any
  const q        = searchParams.q    ?? ''
  const tipo     = searchParams.tipo ?? ''
  const page     = parseInt(searchParams.page ?? '1', 10)
  const from     = (page - 1) * PAGE_SIZE
  const to       = from + PAGE_SIZE - 1

  let query = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .order('id', { ascending: true })
    .range(from, to)

  if (q.trim()) query = query.ilike('nombre', `%${q.trim()}%`)
  if (tipo)     query = query.eq('tipo', tipo)

  const [{ data: clients, count }, { data: statsRow }, { data: listsData }] = await Promise.all([
    query,
    supabase.rpc('get_dashboard_stats'),
    supabase.from('price_lists').select('id, client_id, status, clients(nombre)'),
  ])

  return (
    <ClientesShell
      clients={clients ?? []}
      count={count ?? 0}
      totalPages={Math.ceil((count ?? 0) / PAGE_SIZE)}
      page={page}
      q={q}
      tipo={tipo}
      stats={statsRow as any}
      listsData={listsData ?? []}
    />
  )
}
