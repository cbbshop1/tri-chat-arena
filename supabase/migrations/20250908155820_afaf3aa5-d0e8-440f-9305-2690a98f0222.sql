-- CRITICAL FIX: Secure anonymous chat sessions with proper session isolation
-- Remove the dangerous anonymous access policies that allow cross-user data access

-- Fix chat_sessions policies
DROP POLICY IF EXISTS "Allow anonymous sessions (dev)" ON public.chat_sessions;
DROP POLICY IF EXISTS "Allow anonymous session creation (dev)" ON public.chat_sessions;
DROP POLICY IF EXISTS "Allow anonymous session updates (dev)" ON public.chat_sessions;
DROP POLICY IF EXISTS "Allow anonymous session deletion (dev)" ON public.chat_sessions;

-- Create secure policies for authenticated users only
CREATE POLICY "Users can view their own sessions" 
ON public.chat_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
ON public.chat_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON public.chat_sessions 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" 
ON public.chat_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Fix messages policies  
DROP POLICY IF EXISTS "Allow messages in anonymous sessions (dev)" ON public.messages;
DROP POLICY IF EXISTS "Allow message creation in anonymous sessions (dev)" ON public.messages;

-- Create secure policies for messages - only accessible to session owner
CREATE POLICY "Users can view messages in their own sessions" 
ON public.messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.chat_sessions 
  WHERE chat_sessions.id = messages.session_id 
  AND chat_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can create messages in their own sessions" 
ON public.messages 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.chat_sessions 
  WHERE chat_sessions.id = messages.session_id 
  AND chat_sessions.user_id = auth.uid()
));

-- Fix chat_files policies
DROP POLICY IF EXISTS "Allow file access in anonymous sessions (dev)" ON public.chat_files;
DROP POLICY IF EXISTS "Allow file creation in anonymous sessions (dev)" ON public.chat_files;

-- Create secure policies for files - only accessible to session owner
CREATE POLICY "Users can view files in their own sessions" 
ON public.chat_files 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.chat_sessions 
  WHERE chat_sessions.id = chat_files.session_id 
  AND chat_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can create files in their own sessions" 
ON public.chat_files 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.chat_sessions 
  WHERE chat_sessions.id = chat_files.session_id 
  AND chat_sessions.user_id = auth.uid()
));

-- Fix knowledge_base policies
DROP POLICY IF EXISTS "Allow anonymous knowledge access (dev)" ON public.knowledge_base;
DROP POLICY IF EXISTS "Allow anonymous knowledge creation (dev)" ON public.knowledge_base;
DROP POLICY IF EXISTS "Allow anonymous knowledge updates (dev)" ON public.knowledge_base;
DROP POLICY IF EXISTS "Allow anonymous knowledge deletion (dev)" ON public.knowledge_base;

-- Create secure policies for knowledge base - only accessible to owner
CREATE POLICY "Users can view their own knowledge" 
ON public.knowledge_base 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own knowledge" 
ON public.knowledge_base 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge" 
ON public.knowledge_base 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge" 
ON public.knowledge_base 
FOR DELETE 
USING (auth.uid() = user_id);