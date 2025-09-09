-- Remove the overly broad service role policy and create more restrictive ones
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.subscribers;

-- Create separate, more restrictive policies for edge functions
-- Edge functions need to read/write subscription data but we can be more specific

-- Allow service role to read subscription data (needed for check-subscription function)
CREATE POLICY "Service role can read subscriptions for verification" 
ON public.subscribers 
FOR SELECT 
TO service_role
USING (user_id IS NOT NULL AND email IS NOT NULL);

-- Allow service role to insert/update subscription data (needed for upsert operations)
CREATE POLICY "Service role can upsert subscription data" 
ON public.subscribers 
FOR INSERT 
TO service_role
WITH CHECK (user_id IS NOT NULL AND email IS NOT NULL);

CREATE POLICY "Service role can update subscription data" 
ON public.subscribers 
FOR UPDATE 
TO service_role
USING (user_id IS NOT NULL AND email IS NOT NULL)
WITH CHECK (user_id IS NOT NULL AND email IS NOT NULL);

-- No DELETE policy for service role - edge functions shouldn't delete subscription records