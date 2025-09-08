-- Secure ledger tables (CRITICAL - blockchain data exposure)
-- Enable RLS on all ledger tables
ALTER TABLE public.ledger_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.ledger_verification ENABLE ROW LEVEL SECURITY;

-- For now, make ledger data publicly readable but only insertable by service role
-- This assumes ledger data should be publicly auditable
CREATE POLICY "Ledger batches are publicly readable" 
ON public.ledger_batches 
FOR SELECT 
USING (true);

CREATE POLICY "Only service role can insert ledger batches" 
ON public.ledger_batches 
FOR INSERT 
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

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
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only service role can update ledger entries" 
ON public.ledger_entries 
FOR UPDATE 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only service role can delete ledger entries" 
ON public.ledger_entries 
FOR DELETE 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Ledger verification is publicly readable" 
ON public.ledger_verification 
FOR SELECT 
USING (true);

CREATE POLICY "Only service role can insert ledger verification" 
ON public.ledger_verification 
FOR INSERT 
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only service role can update ledger verification" 
ON public.ledger_verification 
FOR UPDATE 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Only service role can delete ledger verification" 
ON public.ledger_verification 
FOR DELETE 
USING (auth.jwt() ->> 'role' = 'service_role');