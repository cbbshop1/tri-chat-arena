-- Fix Security Definer View issue by recreating view without security definer behavior
-- Drop and recreate the view to ensure it doesn't have security definer properties

-- First drop the existing view
DROP VIEW IF EXISTS public.ledger_verification;

-- Recreate the view with explicit SECURITY INVOKER (though this is default for views)
-- This ensures the view respects the permissions of the querying user, not the creator
CREATE VIEW public.ledger_verification 
WITH (security_invoker = true) AS
SELECT 
  le.id,
  le.agent_id,
  le.entry_type,
  le.body_json,
  le.body_hash,
  le.prev_hash,
  le.created_at,
  le.batch_id,
  lb.root_hash AS batch_root_hash,
  lb.l2_tx AS batch_l2_tx,
  lb.l2_block_number
FROM ledger_entries le
LEFT JOIN ledger_batches lb ON le.batch_id = lb.id;