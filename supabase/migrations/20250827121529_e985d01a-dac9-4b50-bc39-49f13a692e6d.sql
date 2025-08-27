-- Add target_ai column to messages table
ALTER TABLE public.messages 
ADD COLUMN target_ai text;

-- Set default target_ai for existing messages to 'all'
UPDATE public.messages 
SET target_ai = 'all' 
WHERE target_ai IS NULL;