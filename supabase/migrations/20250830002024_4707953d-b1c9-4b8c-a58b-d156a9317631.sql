-- Fix RLS conflicts by dropping all policies on tables where RLS is disabled
-- This resolves the "Policy Exists RLS Disabled" errors

-- Drop all policies from ledger_entries 
DROP POLICY IF EXISTS "Allow public read access to ledger entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "Allow public insert to ledger entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "Deny all updates to ledger entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "Deny all deletes from ledger entries" ON public.ledger_entries;

-- Drop all policies from ledger_batches
DROP POLICY IF EXISTS "Allow public read access to ledger batches" ON public.ledger_batches;
DROP POLICY IF EXISTS "Allow system insert to ledger batches" ON public.ledger_batches;

-- Drop all policies from daily_usage
DROP POLICY IF EXISTS "view_own_usage_secure" ON public.daily_usage;
DROP POLICY IF EXISTS "insert_usage_secure" ON public.daily_usage;
DROP POLICY IF EXISTS "update_usage_secure" ON public.daily_usage;