# Migration Version Conflict Fix

## Problem

The GitHub Actions workflow for database migrations was failing with the error:

```
Remote migration versions not found in local migrations directory.
Make sure your local git repo is up-to-date. If the error persists, try repairing the migration history table:
supabase migration repair --status reverted 20250115
```

## Root Cause

The issue occurred because:

1. **Remote database** had migration version `20250115` applied
2. **Local repository** had two migration files with the `20250115` prefix:
   - `20250115_admin_maintainers.sql` → version `20250115`
   - `20250115001_user_role_management.sql` → version `20250115001`

3. The Supabase CLI couldn't reconcile the remote version `20250115` with the local files, likely due to:
   - Version number overlap/conflict
   - Migration history mismatch
   - Possible previous failed migration attempts

This created a state where the CLI detected the remote migration but couldn't find a matching local file to compare against.

## Solution

Updated the `.github/workflows/deploy-and-migrate.yml` workflow to automatically detect and repair this specific migration conflict:

### Changes Made

1. **Enhanced the "Repair Migration History" step** to check for the `20250115` version conflict:
   ```bash
   if echo "$MIGRATION_LIST" | grep -E "^\s+\|\s*20250115\s+\|" > /dev/null 2>&1; then
     supabase migration repair --status reverted 20250115
   fi
   ```

2. **Detection Logic**: 
   - Scans the migration list output for lines where the Remote column has `20250115` but Local column is empty
   - Pattern: `^\s+\|\s*20250115\s+\|` matches lines with empty local but populated remote for version 20250115

3. **Repair Action**:
   - Marks the remote migration `20250115` as reverted
   - This allows the local migration `20250115_admin_maintainers.sql` to be applied fresh
   - Prevents the version conflict from blocking subsequent migrations

### How It Works

1. Workflow runs and links to Supabase project
2. Checks migration status with `supabase migration list`
3. Detects if remote has orphaned `20250115` migration
4. If detected, runs `supabase migration repair --status reverted 20250115`
5. After repair, proceeds with `supabase db push` to apply local migrations
6. The `20250115_admin_maintainers.sql` file gets applied fresh to the database

## Prevention

To avoid similar issues in the future:

1. **Use unique timestamp-based version numbers**: Always use format `YYYYMMDDHHMMSS_description.sql`
   - Good: `20250115143000_admin_maintainers.sql`
   - Bad: `20250115_admin_maintainers.sql` and `20250115001_user_role_management.sql`

2. **Check migration status before committing**:
   ```bash
   supabase migration list
   ```

3. **Test locally first**: Run migrations locally before pushing to ensure no conflicts

4. **Follow the naming guide**: See `MIGRATION_NAMING_GUIDE.md` for best practices

## Testing

To test this fix:

1. Trigger the workflow manually via GitHub Actions
2. Watch the "Repair Migration History" step output
3. Verify that it detects and repairs the `20250115` conflict
4. Confirm that "Run Migrations" step completes successfully

## Related Files

- `.github/workflows/deploy-and-migrate.yml` - Main workflow file with repair logic
- `supabase/migrations/20250115_admin_maintainers.sql` - Local migration file
- `supabase/migrations/20250115001_user_role_management.sql` - Second migration with similar version
- `MIGRATION_NAMING_GUIDE.md` - Guide for proper migration naming

## References

- [Supabase CLI Migration Repair](https://supabase.com/docs/reference/cli/supabase-migration-repair)
- [Migration Best Practices](https://supabase.com/docs/guides/cli/local-development#database-migrations)
