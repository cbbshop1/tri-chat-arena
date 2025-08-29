-- Fix security vulnerability in daily_usage table RLS policies
-- Issue: Anonymous users can see email addresses of other users

-- Drop the existing insecure policy
DROP POLICY IF EXISTS "view_own_usage" ON public.daily_usage;

-- Create a secure policy that prevents email exposure to anonymous users
CREATE POLICY "view_own_usage_secure" ON public.daily_usage
FOR SELECT USING (
  -- Authenticated users can only see their own records
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Anonymous users can only see records with their specific anonymous identifier (no email exposure)
  (auth.uid() IS NULL AND user_id IS NULL AND email = 'anonymous')
);

-- Also update the update_usage policy to be more specific
DROP POLICY IF EXISTS "update_usage" ON public.daily_usage;

-- Create separate policies for insert and update with proper restrictions
CREATE POLICY "insert_usage_secure" ON public.daily_usage
FOR INSERT WITH CHECK (
  -- Authenticated users can only insert their own records
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Anonymous users can only insert with 'anonymous' identifier
  (auth.uid() IS NULL AND user_id IS NULL AND email = 'anonymous')
);

CREATE POLICY "update_usage_secure" ON public.daily_usage
FOR UPDATE USING (
  -- Authenticated users can only update their own records
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Anonymous users can only update records with 'anonymous' identifier
  (auth.uid() IS NULL AND user_id IS NULL AND email = 'anonymous')
) WITH CHECK (
  -- Same restrictions for the updated values
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (auth.uid() IS NULL AND user_id IS NULL AND email = 'anonymous')
);