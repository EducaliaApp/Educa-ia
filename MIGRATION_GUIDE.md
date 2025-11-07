# Migration Guide

## Option 1: Automated Migration (Recommended)

Run the migration script:

```bash
npm run migrate
```

## Option 2: Manual Migration (If automated fails)

Execute each migration file manually in Supabase SQL Editor in this exact order:

### Step 1: Main Schema Updates
Copy and paste the content of `supabase/migrations/06_main_schema.sql` into Supabase SQL Editor and run it.

### Step 2: Portafolio Schema
Copy and paste the content of `supabase/migrations/07_portafolio_schema.sql` into Supabase SQL Editor and run it.

### Step 3: Document System
Copy and paste the content of `supabase/migrations/08_document_system.sql` into Supabase SQL Editor and run it.

### Step 4: AI Analysis
Copy and paste the content of `supabase/migrations/09_ai_analysis.sql` into Supabase SQL Editor and run it.

### Step 5: Automation
Copy and paste the content of `supabase/migrations/10_automation.sql` into Supabase SQL Editor and run it.

### Step 6: System Monitoring
Copy and paste the content of `supabase/migrations/11_system_monitoring.sql` into Supabase SQL Editor and run it.

### Step 7: Portafolio Functions
Copy and paste the content of `supabase/migrations/12_portafolio_functions.sql` into Supabase SQL Editor and run it.

## Verification

After running all migrations, verify by checking:

```sql
-- Check if new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'portafolios', 
  'documentos_oficiales', 
  'system_logs',
  'health_metrics'
);

-- Check if role column was added to profiles
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'role';
```

## Troubleshooting

If you encounter errors:

1. **ENUM already exists**: This is normal, the migrations handle this
2. **Table already exists**: This is normal, using `IF NOT EXISTS`
3. **Permission denied**: Make sure you're using the service role key
4. **Vector extension**: Make sure `vector` extension is enabled in Supabase

## Environment Variables Required

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```