-- To make yourself an admin, you'll need to run this after signing up:
-- Replace 'your-email@example.com' with your actual email address

-- This will make the first user with this email an admin
-- You'll need to sign up first, then run this migration

-- Example (replace with your email):
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'admin'::app_role
-- FROM auth.users
-- WHERE email = 'your-email@example.com'
-- AND NOT EXISTS (
--   SELECT 1 FROM public.user_roles 
--   WHERE user_id = auth.users.id AND role = 'admin'
-- );

-- For now, this migration just adds a helpful comment
SELECT 'Admin setup ready. Sign up first, then manually promote yourself to admin.' as setup_status;