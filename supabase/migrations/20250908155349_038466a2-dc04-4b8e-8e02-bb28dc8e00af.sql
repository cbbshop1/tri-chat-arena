-- CRITICAL SECURITY FIX: Secure ledger tables (blockchain data exposure)
-- Enable RLS on ledger tables (skip ledger_verification as it's a view)
ALTER TABLE public.ledger_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- For now, make ledger data publicly readable but only insertable by service role
-- This assumes ledger data should be publicly auditable
CREATE POLICY "Ledger batches are publicly readable" 
ON public.ledger_batches 
FOR SELECT 
USING (true);

CREATE POLICY "Only service role can insert ledger batches" 
ON public.ledger_batches 
FOR INSERT 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only service role can update ledger batches" 
ON public.ledger_batches 
FOR UPDATE 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only service role can delete ledger batches" 
ON public.ledger_batches 
FOR DELETE 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Ledger entries are publicly readable" 
ON public.ledger_entries 
FOR SELECT 
USING (true);

CREATE POLICY "Only service role can insert ledger entries" 
ON public.ledger_entries 
FOR INSERT 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only service role can update ledger entries" 
ON public.ledger_entries 
FOR UPDATE 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only service role can delete ledger entries" 
ON public.ledger_entries 
FOR DELETE 
USING (auth.jwt() ->> 'role' = 'service_role');