-- Enable Row Level Security on daily_usage table
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to access their own data
CREATE POLICY "Users can view their own usage data" 
ON public.daily_usage 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for anonymous users to access data by email
CREATE POLICY "Anonymous users can view usage by email" 
ON public.daily_usage 
FOR SELECT 
USING (user_id IS NULL AND email IS NOT NULL);

-- Policy for authenticated users to insert their own data
CREATE POLICY "Users can insert their own usage data" 
ON public.daily_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy for anonymous users to insert data by email
CREATE POLICY "Anonymous users can insert usage by email" 
ON public.daily_usage 
FOR INSERT 
WITH CHECK (user_id IS NULL AND email IS NOT NULL);

-- Policy for authenticated users to update their own data
CREATE POLICY "Users can update their own usage data" 
ON public.daily_usage 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for anonymous users to update data by email
CREATE POLICY "Anonymous users can update usage by email" 
ON public.daily_usage 
FOR UPDATE 
USING (user_id IS NULL AND email IS NOT NULL)
WITH CHECK (user_id IS NULL AND email IS NOT NULL);