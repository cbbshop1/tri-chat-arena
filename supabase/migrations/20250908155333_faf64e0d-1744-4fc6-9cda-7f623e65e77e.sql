-- Fix subscribers table RLS policies (CRITICAL SECURITY FIX)
-- Remove the insecure email-based access policy that allows anyone to see user data
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;

-- Create secure policy that only allows users to see their own subscription data
CREATE POLICY "Users can view their own subscription" 
ON public.subscribers 
FOR SELECT 
USING (auth.uid() = user_id);

-- Update insert policy to be more restrictive
DROP POLICY IF EXISTS "secure_insert_own_subscription" ON public.subscribers;
CREATE POLICY "Users can insert their own subscription" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update update policy to be more restrictive  
DROP POLICY IF EXISTS "secure_update_own_subscription" ON public.subscribers;
CREATE POLICY "Users can update their own subscription" 
ON public.subscribers 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add service role policy for edge functions to manage subscriptions
CREATE POLICY "Service role can manage all subscriptions" 
ON public.subscribers 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Secure ledger tables (CRITICAL - blockchain data exposure)
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