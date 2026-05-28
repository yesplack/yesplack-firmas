import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase-server'

const FAKE_DOMAIN = '@yesplack.internal'

export async function GET(req: NextRequest) {
  try {
    const supabaseUser = createServerClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const admin = createAdminClient() as any
    const { data: callerProfile } = await admin.from('profiles').select('*').eq('id', user.id).single()

    if (!callerProfile || !['master', 'admin'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { data: profiles } = await admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    return NextResponse.json({ profiles: profiles ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUser = createServerClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const admin = createAdminClient() as any

    const { data: callerProfile } = await admin.from('profiles').select('*').eq('id', user.id).single()
    if (!callerProfile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })

    const isMaster = callerProfile.role === 'master'
    const canCreate = isMaster || (callerProfile.role === 'admin' && callerProfile.can_create_users)
    if (!canCreate) return NextResponse.json({ error: 'Sin permisos para crear usuarios' }, { status: 403 })

    const body = await req.json()
    const { username, nickname, password, role, can_create_users } = body

    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Usuario y contraseña son obligatorios' }, { status: 400 })
    }
    if (username.includes('@')) {
      return NextResponse.json({ error: 'El usuario no puede contener @' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    const assignedRole = (isMaster && role === 'admin') ? 'admin' : 'basic'
    const assignedCanCreate = isMaster ? (can_create_users ?? false) : false

    const email = `${username.toLowerCase().trim()}${FAKE_DOMAIN}`
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      if (authError.message.includes('already')) {
        return NextResponse.json({ error: 'Ese nombre de usuario ya existe' }, { status: 409 })
      }
      throw authError
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .insert({
        id:                   authData.user.id,
        username:             username.toLowerCase().trim(),
        nickname:             nickname?.trim() || null,
        role:                 assignedRole,
        can_create_users:     assignedCanCreate,
        must_change_password: true,
        created_by:           user.id,
      })
      .select()
      .single()

    if (profileError) throw profileError

    return NextResponse.json({ success: true, profile })
  } catch (err: any) {
    console.error('[/api/usuarios POST]', err)
    return NextResponse.json({ error: err.message ?? 'Error al crear el usuario' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabaseUser = createServerClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const admin = createAdminClient() as any
    const { data: callerProfile } = await admin.from('profiles').select('*').eq('id', user.id).single()
    if (!callerProfile || !['master', 'admin'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const { id, nickname, role, can_create_users, is_active, newPassword } = body

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    // Admins con can_create_users solo pueden blanquear claves, no cambiar roles ni activar/desactivar
    const isMaster = callerProfile.role === 'master'
    const canCreate = isMaster || (callerProfile.role === 'admin' && callerProfile.can_create_users)

    if (!isMaster && !canCreate) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const updates: any = {}
    updates.updated_at = new Date().toISOString()

    if (isMaster) {
      if (nickname        !== undefined) updates.nickname        = nickname
      if (is_active       !== undefined) updates.is_active       = is_active
      if (role            !== undefined) updates.role            = role
      if (can_create_users !== undefined) updates.can_create_users = can_create_users
    } else {
      // Admin con can_create: solo puede blanquear clave
      if (nickname  !== undefined) updates.nickname  = nickname
      if (is_active !== undefined) updates.is_active = is_active
    }

    // Al blanquear la clave desde el panel, marcar must_change_password: true
    if (newPassword) {
      if (newPassword.length < 6) return NextResponse.json({ error: 'Mínimo 6 caracteres' }, { status: 400 })
      updates.must_change_password = true
      await admin.auth.admin.updateUserById(id, { password: newPassword })
    }

    if (Object.keys(updates).length > 1) {
      await admin.from('profiles').update(updates).eq('id', id)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabaseUser = createServerClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const admin = createAdminClient() as any
    const { data: callerProfile } = await admin.from('profiles').select('*').eq('id', user.id).single()
    if (!callerProfile || callerProfile.role !== 'master') {
      return NextResponse.json({ error: 'Solo el master puede eliminar usuarios' }, { status: 403 })
    }

    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    if (id === user.id) return NextResponse.json({ error: 'No podés eliminarte a vos mismo' }, { status: 400 })

    const { error: deleteError } = await admin.auth.admin.deleteUser(id)
    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[/api/usuarios DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
