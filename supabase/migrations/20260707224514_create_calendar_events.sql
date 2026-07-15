-- Create calendar_events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    color TEXT DEFAULT '#10b981',
    type TEXT DEFAULT 'event',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read calendar_events" ON public.calendar_events;
CREATE POLICY "Allow authenticated users to read calendar_events" ON public.calendar_events
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to insert calendar_events" ON public.calendar_events;
CREATE POLICY "Allow authenticated users to insert calendar_events" ON public.calendar_events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to update calendar_events" ON public.calendar_events;
CREATE POLICY "Allow authenticated users to update calendar_events" ON public.calendar_events
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to delete calendar_events" ON public.calendar_events;
CREATE POLICY "Allow authenticated users to delete calendar_events" ON public.calendar_events
    FOR DELETE USING (auth.role() = 'authenticated');
