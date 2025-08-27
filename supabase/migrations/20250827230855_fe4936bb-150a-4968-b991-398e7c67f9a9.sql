-- Create usage tracking table for daily message limits
CREATE TABLE public.daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT, -- For anonymous users, we'll use a session identifier
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date),
  UNIQUE(email, date)
);

-- Enable RLS
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own usage
CREATE POLICY "view_own_usage" ON public.daily_usage
FOR SELECT
USING (
  (user_id IS NOT NULL AND user_id = auth.uid()) OR
  (user_id IS NULL AND email IS NOT NULL)
);

-- Policy for edge functions to update usage
CREATE POLICY "update_usage" ON public.daily_usage
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to increment daily usage
CREATE OR REPLACE FUNCTION public.increment_daily_usage(p_user_id UUID DEFAULT NULL, p_email TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Insert or update daily usage
  INSERT INTO public.daily_usage (user_id, email, date, message_count)
  VALUES (p_user_id, p_email, CURRENT_DATE, 1)
  ON CONFLICT (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(email, ''), date)
  DO UPDATE SET 
    message_count = daily_usage.message_count + 1,
    updated_at = now()
  RETURNING message_count INTO current_count;
  
  RETURN current_count;
END;
$$;

-- Create function to get current daily usage
CREATE OR REPLACE FUNCTION public.get_daily_usage(p_user_id UUID DEFAULT NULL, p_email TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER := 0;
BEGIN
  SELECT COALESCE(message_count, 0) INTO current_count
  FROM public.daily_usage
  WHERE (p_user_id IS NOT NULL AND user_id = p_user_id)
     OR (p_user_id IS NULL AND email = p_email)
    AND date = CURRENT_DATE;
  
  RETURN current_count;
END;
$$;