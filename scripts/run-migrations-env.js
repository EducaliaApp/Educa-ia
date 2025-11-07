require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')
const { readFileSync } = require('fs')
const { join } = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local')
  process.exit(1)
}

console.log('✅ Environment variables loaded')
console.log(`📍 Supabase URL: ${supabaseUrl}`)

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

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
    
    // Execute the entire SQL as one query
    const { data, error } = await supabase.rpc('exec', { sql })
    
    if (error) {
      console.error(`❌ Error in ${filename}:`, error.message)
      return false
    }
    
    console.log(`✅ ${filename} completed`)
    return true
  } catch (err) {
    console.error(`❌ Failed to process ${filename}:`, err.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting migrations...\n')
  
  // Test connection first
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error && !error.message.includes('relation "profiles" does not exist')) {
      console.error('❌ Cannot connect to Supabase:', error.message)
      process.exit(1)
    }
    console.log('✅ Connected to Supabase\n')
  } catch (err) {
    console.error('❌ Connection test failed:', err.message)
    process.exit(1)
  }
  
  for (const migration of migrations) {
    const success = await runMigration(migration)
    if (!success) {
      console.error(`\n❌ Migration failed at ${migration}`)
      console.log('\n📋 You can run the remaining migrations manually using the SQL Editor in Supabase')
      process.exit(1)
    }
    console.log('')
  }
  
  console.log('🎉 All migrations completed successfully!')
}

main().catch(console.error)