-- Fix Security Definer View by ensuring proper permissions and ownership

-- Grant SELECT permission on the view to authenticator role
GRANT SELECT ON public.ledger_verification TO authenticator;

-- Grant SELECT permission to anon and authenticated roles 
GRANT SELECT ON public.ledger_verification TO anon, authenticated;

-- Change ownership of the view to authenticator to avoid security definer behavior
ALTER VIEW public.ledger_verification OWNER TO authenticator;