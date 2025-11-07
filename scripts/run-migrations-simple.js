const { createClient } = require('@supabase/supabase-js')
const { readFileSync } = require('fs')
const { join } = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const migrations = [
  '06_main_schema.sql',
  '07_portafolio_schema.sql', 
  '08_document_system.sql',
  '09_ai_analysis.sql',
  '10_automation.sql',
  '11_system_monitoring.sql',
  '12_portafolio_functions.sql'
]

async function runMigration(filename) {
  console.log(`🔄 Running ${filename}...`)
  
  try {
    const migrationPath = join(process.cwd(), 'supabase/migrations', filename)
    const sql = readFileSync(migrationPath, 'utf8')
    
    const { data, error } = await supabase.rpc('exec_sql', { sql })
    
    if (error) {
      console.error(`❌ Error in ${filename}:`, error.message)
      return false
    }
    
    console.log(`✅ ${filename} completed`)
    return true
  } catch (err) {
    console.error(`❌ Failed to read ${filename}:`, err.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting migrations...\n')
  
  for (const migration of migrations) {
    const success = await runMigration(migration)
    if (!success) {
      console.error(`\n❌ Migration failed at ${migration}`)
      process.exit(1)
    }
    console.log('')
  }
  
  console.log('🎉 All migrations completed successfully!')
}

main().catch(console.error)