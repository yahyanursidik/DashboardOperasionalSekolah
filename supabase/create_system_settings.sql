-- Migration to create system_settings table

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Configuration
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read (everyone can see settings like Logo)
CREATE POLICY "Public read access for system_settings" 
ON public.system_settings 
FOR SELECT 
USING (true);

-- Allow authenticated users with role to update (Admins)
-- For simplicity, we allow authenticated users to update, but in production, we should restrict by role
CREATE POLICY "Authenticated users can update system_settings" 
ON public.system_settings 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can insert system_settings" 
ON public.system_settings 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Insert default values
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('app_name', '"TSLS Admin OS"'::jsonb, 'Sistem Global Application Name'),
  ('logo_url', '""'::jsonb, 'Global Logo URL')
ON CONFLICT (key) DO NOTHING;
