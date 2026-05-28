import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient() as any

    // Verify caller is master
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'master') {
      return NextResponse.json({ error: 'Solo el Maestro puede hacer esto' }, { status: 403 })
    }

    // 1. List all objects in the pdfs bucket (handles nested folders)
    const allPaths: string[] = []

    const { data: rootItems } = await supabase.storage.from('pdfs').list('', { limit: 1000 })
    if (rootItems && rootItems.length > 0) {
      for (const item of rootItems) {
        if (item.id) {
          // It's a file at root level
          allPaths.push(item.name)
        } else {
          // It's a folder — list its contents
          const { data: subItems } = await supabase.storage
            .from('pdfs')
            .list(item.name, { limit: 1000 })
          if (subItems) {
            for (const sub of subItems) {
              if (sub.id) allPaths.push(`${item.name}/${sub.name}`)
            }
          }
        }
      }
    }

    if (allPaths.length > 0) {
      const { error: storageErr } = await supabase.storage.from('pdfs').remove(allPaths)
      if (storageErr) console.error('[reset] storage error:', storageErr.message)
    }

    // 2. Delete ALL price_lists rows — clients are NOT touched
    const { error: dbErr } = await supabase
      .from('price_lists')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (dbErr) throw new Error(dbErr.message)

    return NextResponse.json({
      success: true,
      deleted_files: allPaths.length,
    })
  } catch (err: any) {
    console.error('[/api/reset]', err)
    return NextResponse.json(
      { error: err.message ?? 'Error al resetear' },
      { status: 500 }
    )
  }
}
