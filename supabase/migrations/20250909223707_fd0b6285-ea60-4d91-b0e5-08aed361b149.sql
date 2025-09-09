-- Create more secure RLS policies for subscribers table
-- The issue is the service role policy allows public access, need to be more specific

-- Drop the overly broad service role policy
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.subscribers;

-- Create a more secure service role policy that only applies to actual service role
CREATE POLICY "Service role can manage all subscriptions" 
ON public.subscribers 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Add explicit deny policy for anonymous users
CREATE POLICY "Deny all access to anonymous users" 
ON public.subscribers 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Ensure the table still has RLS enabled
ALTER TABLE public.subscribers FORCE ROW LEVEL SECURITY;