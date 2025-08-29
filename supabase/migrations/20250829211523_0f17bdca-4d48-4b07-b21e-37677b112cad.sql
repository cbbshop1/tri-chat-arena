-- Fix Security Definer View issue by recreating ledger_verification view
-- The view was owned by postgres (superuser) which creates security definer behavior

-- Drop the existing view
DROP VIEW IF EXISTS public.ledger_verification;

-- Recreate the view with proper ownership (will be owned by the current role)
CREATE VIEW public.ledger_verification AS 
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