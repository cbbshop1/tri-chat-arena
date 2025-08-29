-- Add search_path to function that was missing it
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'  -- Added missing search_path
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;