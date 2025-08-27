-- Fix security definer functions to have proper search path
DROP FUNCTION IF EXISTS public.increment_daily_usage(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_daily_usage(UUID, TEXT);

-- Recreate with proper security settings
CREATE OR REPLACE FUNCTION public.increment_daily_usage(p_user_id UUID DEFAULT NULL, p_email TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.get_daily_usage(p_user_id UUID DEFAULT NULL, p_email TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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