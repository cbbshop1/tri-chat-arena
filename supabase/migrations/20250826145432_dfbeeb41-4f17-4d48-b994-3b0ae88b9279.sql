-- Temporarily allow anonymous access for development
-- Update RLS policies to allow null user_id for chat_sessions
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.chat_sessions;

-- Create temporary policies that allow null user_id (anonymous access)
CREATE POLICY "Allow anonymous sessions (dev)" 
ON public.chat_sessions 
FOR SELECT 
USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Allow anonymous session creation (dev)" 
ON public.chat_sessions 
FOR INSERT 
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Allow anonymous session updates (dev)" 
ON public.chat_sessions 
FOR UPDATE 
USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Allow anonymous session deletion (dev)" 
ON public.chat_sessions 
FOR DELETE 
USING (user_id IS NULL OR auth.uid() = user_id);

-- Update messages policies to work with anonymous sessions
DROP POLICY IF EXISTS "Users can view messages in their sessions" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in their sessions" ON public.messages;

CREATE POLICY "Allow messages in anonymous sessions (dev)" 
ON public.messages 
FOR SELECT 
USING (EXISTS ( 
  SELECT 1 FROM chat_sessions 
  WHERE chat_sessions.id = messages.session_id 
  AND (chat_sessions.user_id IS NULL OR chat_sessions.user_id = auth.uid())
));

CREATE POLICY "Allow message creation in anonymous sessions (dev)" 
ON public.messages 
FOR INSERT 
WITH CHECK (EXISTS ( 
  SELECT 1 FROM chat_sessions 
  WHERE chat_sessions.id = messages.session_id 
  AND (chat_sessions.user_id IS NULL OR chat_sessions.user_id = auth.uid())
));