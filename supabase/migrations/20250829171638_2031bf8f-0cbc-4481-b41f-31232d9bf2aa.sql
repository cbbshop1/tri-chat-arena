-- Fix critical security vulnerability in subscribers table RLS policies
-- Issue: INSERT and UPDATE policies currently allow unrestricted access

-- Drop existing insecure policies
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

-- Create secure INSERT policy - only authenticated users can insert their own records
CREATE POLICY "secure_insert_own_subscription" ON public.subscribers
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (user_id = auth.uid() OR (user_id IS NULL AND email = auth.email()))
);

-- Create secure UPDATE policy - only authenticated users can update their own records  
CREATE POLICY "secure_update_own_subscription" ON public.subscribers
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND 
  (user_id = auth.uid() OR (user_id IS NULL AND email = auth.email()))
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (user_id = auth.uid() OR (user_id IS NULL AND email = auth.email()))
);

-- Keep the existing SELECT policy as it's already secure
-- "select_own_subscription" allows users to only see their own subscription data