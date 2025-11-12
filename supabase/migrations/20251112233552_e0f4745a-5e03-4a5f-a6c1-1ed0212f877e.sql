-- Create research_library table
CREATE TABLE public.research_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.research_library ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own research entries" 
ON public.research_library 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own research entries" 
ON public.research_library 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own research entries" 
ON public.research_library 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own research entries" 
ON public.research_library 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_research_library_updated_at
BEFORE UPDATE ON public.research_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create full-text search index
CREATE INDEX idx_research_library_search ON public.research_library 
USING gin(to_tsvector('english', title || ' ' || content));