-- ==============================================================================
-- SUPABASE DATABASE & SCHEMA VERIFICATION TESTS (pgTAP)
-- ==============================================================================
-- Run with: supabase test db
-- ==============================================================================

BEGIN;
SELECT plan(12);

-- 1. Verify required tables exist in public schema
SELECT has_table('public', 'decorations', 'public.decorations table must exist');
SELECT has_table('public', 'enquiries', 'public.enquiries table must exist');
SELECT has_table('public', 'booked_clients', 'public.booked_clients table must exist');
SELECT has_table('public', 'company_profiles', 'public.company_profiles table must exist');
SELECT has_table('public', 'payment_qrs', 'public.payment_qrs table must exist');

-- 2. Verify critical columns in public.decorations
SELECT has_column('public', 'decorations', 'company_id', 'decorations must have company_id column');
SELECT has_column('public', 'decorations', 'company_name', 'decorations must have company_name column');
SELECT has_column('public', 'decorations', 'components', 'decorations must have components breakdown column');

-- 3. Verify critical columns in public.booked_clients
SELECT has_column('public', 'booked_clients', 'enquiry_id', 'booked_clients must have enquiry_id column');
SELECT has_column('public', 'booked_clients', 'company_id', 'booked_clients must have company_id column');
SELECT has_column('public', 'booked_clients', 'ceremonies', 'booked_clients must have ceremonies JSON column');

-- 4. Verify storage bucket
SELECT ok(
  EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'decoration-images'),
  'Storage bucket "decoration-images" must exist'
);

SELECT * FROM finish();
ROLLBACK;
