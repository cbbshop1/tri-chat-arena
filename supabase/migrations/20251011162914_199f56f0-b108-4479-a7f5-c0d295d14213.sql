-- Add 'anchor_memory' to the valid_entry_type check constraint
ALTER TABLE public.ledger_entries 
DROP CONSTRAINT valid_entry_type;

ALTER TABLE public.ledger_entries 
ADD CONSTRAINT valid_entry_type 
CHECK (entry_type = ANY (ARRAY['memory'::text, 'context'::text, 'experience'::text, 'consolidation'::text, 'anchor_memory'::text]));