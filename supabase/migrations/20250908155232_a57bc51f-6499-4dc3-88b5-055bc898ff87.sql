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