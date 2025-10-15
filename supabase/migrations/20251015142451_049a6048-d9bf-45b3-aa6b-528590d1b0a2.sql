-- Fix get_daily_usage function to use SECURITY DEFINER
DROP FUNCTION IF EXISTS public.get_daily_usage(uuid);

CREATE OR REPLACE FUNCTION public.get_daily_usage(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER := 0;
BEGIN
  -- Only allow access for authenticated users with matching user_id
  IF p_user_id IS NULL OR auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(message_count, 0) INTO current_count
  FROM public.daily_usage
  WHERE user_id = p_user_id
    AND date = CURRENT_DATE;
  
  RETURN current_count;
END;
$function$;

-- Fix increment_daily_usage function to use SECURITY DEFINER
DROP FUNCTION IF EXISTS public.increment_daily_usage(uuid);

CREATE OR REPLACE FUNCTION public.increment_daily_usage(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
BEGIN
  -- Only allow access for authenticated users with matching user_id
  IF p_user_id IS NULL OR auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN 0;
  END IF;

  INSERT INTO public.daily_usage (user_id, date, message_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    message_count = daily_usage.message_count + 1,
    updated_at = now()
  RETURNING message_count INTO current_count;
  
  RETURN current_count;
END;
$function$;