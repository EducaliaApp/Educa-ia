require('dotenv').config({ path: '.env.local' })

const { readFileSync } = require('fs')
const { join } = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local')
  process.exit(1)
}

const migrations = [
  '06_main_schema.sql',
  '07_portafolio_schema.sql', 
  '08_document_system.sql',
  '09_ai_analysis.sql',
  '10_automation.sql',
  '11_system_monitoring.sql',
  '12_portafolio_functions.sql'
]

function printMigrationInstructions() {
  console.log('🚀 Manual Migration Instructions\n')
  console.log('Since automated migration requires additional setup, please run these migrations manually:\n')
  
  console.log('1. Go to your Supabase Dashboard → SQL Editor')
  console.log('2. Copy and paste each migration file content in this order:\n')
  
  migrations.forEach((migration, index) => {
    console.log(`   ${index + 1}. supabase/migrations/${migration}`)
  })
  
  console.log('\n3. Run each migration by clicking "Run" in the SQL Editor')
  console.log('\n📋 Migration file contents:\n')
  
  migrations.forEach((migration, index) => {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`MIGRATION ${index + 1}: ${migration}`)
    console.log('='.repeat(60))
    
    try {
      const migrationPath = join(process.cwd(), 'supabase/migrations', migration)
      const sql = readFileSync(migrationPath, 'utf8')
      console.log(sql)
    } catch (err) {
      console.error(`❌ Could not read ${migration}:`, err.message)
    }
  })
  
  console.log('\n🎉 After running all migrations, your database will be fully updated!')
}

printMigrationInstructions()