-- Secure remaining ledger tables (ledger_verification is a view, skip it)
-- Enable RLS on ledger tables only
ALTER TABLE public.ledger_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY; 

-- Make ledger data publicly readable but only manageable by service role
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