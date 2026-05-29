import { createAdminClient } from '@/lib/supabase-server'
import ProveedoresShell from './ProveedoresShell'

const PAGE_SIZE = 60

export default async function ProveedoresPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string }
}) {
  const supabase = createAdminClient() as any
  const q    = searchParams.q    ?? ''
  const page = parseInt(searchParams.page ?? '1', 10)
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let query = supabase
    .from('suppliers')
    .select('*', { count: 'exact' })
    .order('numero', { ascending: true })
    .range(from, to)

  if (q.trim()) query = query.ilike('nombre', `%${q.trim()}%`)

  const [{ data: suppliers, count }, { data: statsRow }, { data: docsData }] = await Promise.all([
    query,
    supabase.rpc('get_supplier_stats'),
    supabase.from('price_lists').select('id, supplier_id, status, suppliers(nombre)').not('supplier_id', 'is', null),
  ])

  return (
    <ProveedoresShell
      suppliers={suppliers ?? []}
      count={count ?? 0}
      totalPages={Math.ceil((count ?? 0) / PAGE_SIZE)}
      page={page}
      q={q}
      stats={statsRow as any}
      docsData={docsData ?? []}
    />
  )
}
