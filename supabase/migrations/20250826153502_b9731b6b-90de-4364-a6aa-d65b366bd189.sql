-- Create knowledge_base table for storing user knowledge
CREATE TABLE public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create policies for knowledge base
CREATE POLICY "Allow anonymous knowledge access (dev)" 
ON public.knowledge_base 
FOR SELECT 
USING ((user_id IS NULL) OR (auth.uid() = user_id));

CREATE POLICY "Allow anonymous knowledge creation (dev)" 
ON public.knowledge_base 
FOR INSERT 
WITH CHECK ((user_id IS NULL) OR (auth.uid() = user_id));

CREATE POLICY "Allow anonymous knowledge updates (dev)" 
ON public.knowledge_base 
FOR UPDATE 
USING ((user_id IS NULL) OR (auth.uid() = user_id));

CREATE POLICY "Allow anonymous knowledge deletion (dev)" 
ON public.knowledge_base 
FOR DELETE 
USING ((user_id IS NULL) OR (auth.uid() = user_id));

-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true);

-- Create storage policies for chat files
CREATE POLICY "Allow public file access" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-files');

CREATE POLICY "Allow anonymous file uploads" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'chat-files');

-- Create files table to track uploaded files with metadata
CREATE TABLE public.chat_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_preview TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for chat_files
ALTER TABLE public.chat_files ENABLE ROW LEVEL SECURITY;

-- Create policies for chat files
CREATE POLICY "Allow file access in anonymous sessions (dev)" 
ON public.chat_files 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM chat_sessions 
  WHERE chat_sessions.id = chat_files.session_id 
  AND ((chat_sessions.user_id IS NULL) OR (chat_sessions.user_id = auth.uid()))
));

CREATE POLICY "Allow file creation in anonymous sessions (dev)" 
ON public.chat_files 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM chat_sessions 
  WHERE chat_sessions.id = chat_files.session_id 
  AND ((chat_sessions.user_id IS NULL) OR (chat_sessions.user_id = auth.uid()))
));

-- Add trigger for knowledge_base updated_at
CREATE TRIGGER update_knowledge_base_updated_at
BEFORE UPDATE ON public.knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();