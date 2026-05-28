/**
 * Importa el CSV de clientes a Supabase.
 * Uso: npm run import-csv -- --file ./clientes.csv
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local
 */

import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { createClient } from '@supabase/supabase-js'

// Cargar .env.local manualmente (tsx no lo hace automáticamente)
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach(line => {
      const [k, ...v] = line.split('=')
      if (k?.trim() && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim()
    })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  const fileArg = process.argv.find(a => a.startsWith('--file='))?.split('=')[1]
    ?? process.argv[process.argv.indexOf('--file') + 1]
    ?? './clientes.csv'

  const csvPath = path.resolve(fileArg)
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Archivo no encontrado: ${csvPath}`)
    process.exit(1)
  }

  console.log(`📄 Leyendo ${csvPath}…`)
  const content = fs.readFileSync(csvPath, 'utf8')

  const rows = parse(content, {
    columns:          true,
    skip_empty_lines: true,
    bom:              true,
    trim:             true,
  }) as Record<string, string>[]

  console.log(`📊 ${rows.length} filas encontradas`)

  // Mapear columnas del CSV a columnas de la tabla
  const mapped = rows
    .filter(r => r.Numero && !isNaN(Number(r.Numero)))
    .map(r => ({
      id:        parseInt(r.Numero, 10),
      nombre:    r.Nombre    ?? '',
      tipo:      r.Tipo      ?? null,
      telefono:  r.Telefono  ?? null,
      email:     r.Email     ?? null,
      contacto:  r.Contacto  ?? null,
      direccion: r.Direccion ?? null,
      localidad: r.Localidad ?? null,
      provincia: r.Provincia ?? null,
      vendedor:  r.Vendedor  ?? null,
      iva:       r.IVA       ?? null,
      cuit:      r.CUIT      ?? null,
      nota:      r.Nota      ?? null,
      estado:    r.Estado    ?? 'Pendiente',
    }))

  // Insertar en lotes de 500 para respetar límites de Supabase
  const BATCH = 500
  let inserted = 0
  let errors   = 0

  for (let i = 0; i < mapped.length; i += BATCH) {
    const batch = mapped.slice(i, i + BATCH)
    const { error } = await supabase
      .from('clients')
      .upsert(batch, { onConflict: 'id' })

    if (error) {
      console.error(`❌ Error en lote ${i}-${i + BATCH}:`, error.message)
      errors++
    } else {
      inserted += batch.length
      const pct = Math.round((inserted / mapped.length) * 100)
      process.stdout.write(`\r⬆  ${inserted}/${mapped.length} (${pct}%)`)
    }
  }

  console.log(`\n\n✅ Importación completa: ${inserted} clientes · ${errors} lotes con error`)
}

main().catch(e => { console.error(e); process.exit(1) })
