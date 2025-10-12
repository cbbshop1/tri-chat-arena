-- Step 1: Add user_id and shared columns to ledger_entries
ALTER TABLE public.ledger_entries
ADD COLUMN user_id uuid,
ADD COLUMN shared boolean DEFAULT false NOT NULL;

-- Step 2: Backfill existing entries with the first user's ID (assuming single user for research)
-- This will assign all existing entries to the first user in the system
UPDATE public.ledger_entries
SET user_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
WHERE user_id IS NULL;

-- Step 3: Make user_id non-nullable and add foreign key
ALTER TABLE public.ledger_entries
ALTER COLUMN user_id SET NOT NULL,
ADD CONSTRAINT ledger_entries_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Step 4: Add indexes for performance
CREATE INDEX idx_ledger_entries_user_id ON public.ledger_entries(user_id);
CREATE INDEX idx_ledger_entries_shared ON public.ledger_entries(shared);
CREATE INDEX idx_ledger_entries_user_shared ON public.ledger_entries(user_id, shared);

-- Step 5: Add user_id to ledger_batches
ALTER TABLE public.ledger_batches
ADD COLUMN user_id uuid;

-- Backfill batches with user_id from their entries
UPDATE public.ledger_batches
SET user_id = (
  SELECT user_id 
  FROM public.ledger_entries 
  WHERE batch_id = ledger_batches.id 
  LIMIT 1
)
WHERE user_id IS NULL;

-- Make it non-nullable and add foreign key
ALTER TABLE public.ledger_batches
ALTER COLUMN user_id SET NOT NULL,
ADD CONSTRAINT ledger_batches_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

CREATE INDEX idx_ledger_batches_user_id ON public.ledger_batches(user_id);

-- Step 6: Drop old RLS policies
DROP POLICY IF EXISTS "Ledger entries are publicly readable" ON public.ledger_entries;
DROP POLICY IF EXISTS "Only service role can insert ledger entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "Only service role can update ledger entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "Only service role can delete ledger entries" ON public.ledger_entries;

DROP POLICY IF EXISTS "Ledger batches are publicly readable" ON public.ledger_batches;
DROP POLICY IF EXISTS "Only service role can insert ledger batches" ON public.ledger_batches;
DROP POLICY IF EXISTS "Only service role can update ledger batches" ON public.ledger_batches;
DROP POLICY IF EXISTS "Only service role can delete ledger batches" ON public.ledger_batches;

-- Step 7: Create new user-scoped RLS policies for ledger_entries
CREATE POLICY "Users can view their own ledger entries"
ON public.ledger_entries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ledger entries"
ON public.ledger_entries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert ledger entries"
ON public.ledger_entries
FOR INSERT
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Service role can update ledger entries"
ON public.ledger_entries
FOR UPDATE
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Service role can delete ledger entries"
ON public.ledger_entries
FOR DELETE
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Step 8: Create new user-scoped RLS policies for ledger_batches
CREATE POLICY "Users can view their own ledger batches"
ON public.ledger_batches
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ledger batches"
ON public.ledger_batches
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert ledger batches"
ON public.ledger_batches
FOR INSERT
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Service role can update ledger batches"
ON public.ledger_batches
FOR UPDATE
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Service role can delete ledger batches"
ON public.ledger_batches
FOR DELETE
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);