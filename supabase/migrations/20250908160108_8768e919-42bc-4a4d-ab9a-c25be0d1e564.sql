-- CRITICAL SECURITY FIX: Remove anonymous email access to daily_usage
-- This prevents attackers from harvesting customer emails and correlating with payment data

-- Remove dangerous anonymous email-based access policies
DROP POLICY IF EXISTS "Anonymous users can view usage by email" ON public.daily_usage;
DROP POLICY IF EXISTS "Anonymous users can insert usage by email" ON public.daily_usage;
DROP POLICY IF EXISTS "Anonymous users can update usage by email" ON public.daily_usage;

-- Keep only authenticated user policies (these are already secure)
-- Users can only access their own usage data when authenticated
-- "Users can view their own usage data" - already exists and is secure
-- "Users can insert their own usage data" - already exists and is secure  
-- "Users can update their own usage data" - already exists and is secure

-- Add service role policy for edge functions to manage usage tracking securely
CREATE POLICY "Service role can manage all usage data" 
ON public.daily_usage 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');