-- Fix RLS policies for subscribers table to prevent anonymous access and data leaks

-- Drop existing policies that may not be secure enough
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscribers;

-- Create more secure RLS policies that explicitly check for authentication
CREATE POLICY "Authenticated users can view their own subscription" 
ON public.subscribers 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert their own subscription" 
ON public.subscribers 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their own subscription" 
ON public.subscribers 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Add missing DELETE policy for authenticated users
CREATE POLICY "Authenticated users can delete their own subscription" 
ON public.subscribers 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Ensure service role can still manage all subscriptions (for edge functions)
-- This policy already exists and is secure