-- Fix security definer functions that don't need elevated privileges
-- Replace SECURITY DEFINER with SECURITY INVOKER where appropriate

-- Recreate get_daily_usage without SECURITY DEFINER since it should respect RLS
CREATE OR REPLACE FUNCTION public.get_daily_usage(p_user_id uuid DEFAULT NULL::uuid, p_email text DEFAULT NULL::text)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER := 0;
BEGIN
  -- This function now respects RLS policies on daily_usage table
  SELECT COALESCE(message_count, 0) INTO current_count
  FROM public.daily_usage
  WHERE (p_user_id IS NOT NULL AND user_id = p_user_id)
     OR (p_user_id IS NULL AND email = p_email)
    AND date = CURRENT_DATE;
  
  RETURN current_count;
END;
$function$;

-- Recreate increment_daily_usage without SECURITY DEFINER since it should respect RLS  
CREATE OR REPLACE FUNCTION public.increment_daily_usage(p_user_id uuid DEFAULT NULL::uuid, p_email text DEFAULT NULL::text)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
BEGIN
  -- This function now respects RLS policies on daily_usage table
  INSERT INTO public.daily_usage (user_id, email, date, message_count)
  VALUES (p_user_id, p_email, CURRENT_DATE, 1)
  ON CONFLICT (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(email, ''), date)
  DO UPDATE SET 
    message_count = daily_usage.message_count + 1,
    updated_at = now()
  RETURNING message_count INTO current_count;
  
  RETURN current_count;
END;
$function$;