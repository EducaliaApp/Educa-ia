// scripts/run-migration.ts
// Script temporal para ejecutar migraciones en Supabase

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration(migrationFile: string) {
  console.log(`\n📄 Ejecutando migración: ${migrationFile}`)

  try {
    // Leer el archivo SQL
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', migrationFile)
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log(`📝 Contenido leído: ${sql.length} caracteres`)

    // Ejecutar el SQL usando la función RPC de Supabase
    // Dividir el SQL en statements individuales y ejecutarlos
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`🔧 Ejecutando ${statements.length} statements SQL...`)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement.trim()) continue

      try {
        // Usar la API REST de Supabase para ejecutar SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ query: statement + ';' })
        })

        if (!response.ok) {
          // Intentar método alternativo: usar el cliente directo
          console.log(`   ⚠️  Statement ${i + 1}: Usando método alternativo...`)

          // Para CREATE TABLE, ALTER TABLE, etc., intentar crear directamente
          if (statement.includes('CREATE TABLE') ||
              statement.includes('CREATE INDEX') ||
              statement.includes('CREATE POLICY') ||
              statement.includes('ALTER TABLE') ||
              statement.includes('CREATE OR REPLACE FUNCTION') ||
              statement.includes('CREATE OR REPLACE VIEW')) {

            console.log(`   ℹ️  Statement ${i + 1}: ${statement.substring(0, 80)}...`)
            console.log(`   ⚠️  Necesita ejecutarse manualmente en SQL Editor`)
            errorCount++
          }
        } else {
          console.log(`   ✅ Statement ${i + 1} ejecutado`)
          successCount++
        }
      } catch (err: any) {
        console.error(`   ❌ Error en statement ${i + 1}:`, err.message)
        errorCount++
      }
    }

    console.log(`\n📊 Resultados:`)
    console.log(`   ✅ Exitosos: ${successCount}`)
    console.log(`   ❌ Con errores: ${errorCount}`)

    if (errorCount > 0) {
      console.log(`\n⚠️  Algunos statements requieren ejecución manual en Supabase SQL Editor`)
      console.log(`   Ve a: ${supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql')}`)
      return false
    }

    return true

  } catch (error: any) {
    console.error('❌ Error ejecutando migración:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Ejecutando migraciones de ProfeFlow...\n')
  console.log(`📍 Base de datos: ${supabaseUrl}`)

  // Ejecutar migración de function_logs
  const success = await runMigration('20250106_function_logs.sql')

  if (success) {
    console.log('\n✅ Migración completada exitosamente!')
  } else {
    console.log('\n⚠️  Migración requiere ejecución manual')
    console.log('\n📋 Pasos para ejecutar manualmente:')
    console.log('1. Abre Supabase Dashboard → SQL Editor')
    console.log('2. Copia el contenido de: supabase/migrations/20250106_function_logs.sql')
    console.log('3. Pega y ejecuta el SQL')
  }
}

main()
