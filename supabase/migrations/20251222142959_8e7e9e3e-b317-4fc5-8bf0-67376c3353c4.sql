-- Create table for sleep tracking
CREATE TABLE public.sleep_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (end_time - start_time)) / 60) STORED,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  notes TEXT,
  source TEXT DEFAULT 'manual', -- 'manual', 'apple_health', 'google_fit'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for activity tracking  
CREATE TABLE public.activity_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'walking', 'running', 'cycling', 'workout', 'yoga', etc.
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  steps INTEGER,
  distance_meters NUMERIC(10, 2),
  calories_burned INTEGER,
  heart_rate_avg INTEGER,
  notes TEXT,
  source TEXT DEFAULT 'manual', -- 'manual', 'apple_health', 'google_fit'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sleep_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sleep_records
CREATE POLICY "Users can view their own sleep records" 
ON public.sleep_records 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sleep records" 
ON public.sleep_records 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sleep records" 
ON public.sleep_records 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sleep records" 
ON public.sleep_records 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for activity_records
CREATE POLICY "Users can view their own activity records" 
ON public.activity_records 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity records" 
ON public.activity_records 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity records" 
ON public.activity_records 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity records" 
ON public.activity_records 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_sleep_records_user_date ON public.sleep_records(user_id, start_time DESC);
CREATE INDEX idx_activity_records_user_date ON public.activity_records(user_id, start_time DESC);

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sleep_records_updated_at
BEFORE UPDATE ON public.sleep_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activity_records_updated_at
BEFORE UPDATE ON public.activity_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();