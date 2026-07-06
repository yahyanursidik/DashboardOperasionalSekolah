-- Create the onboarding_materials table
CREATE TABLE onboarding_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    material_type VARCHAR(50) NOT NULL CHECK (material_type IN ('pdf', 'audio', 'video', 'image', 'youtube', 'gdrive')),
    file_url TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE onboarding_materials ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access to onboarding materials" ON onboarding_materials
    FOR ALL
    USING (public.is_super_admin());

-- Policy: Authenticated users can view published materials
CREATE POLICY "Authenticated users can view published onboarding materials" ON onboarding_materials
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND status = 'published'
    );

-- Insert bucket for onboarding_materials
INSERT INTO storage.buckets (id, name, public) 
VALUES ('onboarding_materials', 'onboarding_materials', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Public can read
CREATE POLICY "Public can view onboarding materials files" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'onboarding_materials');

-- Storage Policy: Authenticated Admins can insert
CREATE POLICY "Admins can insert onboarding materials files" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'onboarding_materials' AND 
        public.is_super_admin()
    );

-- Storage Policy: Authenticated Admins can update
CREATE POLICY "Admins can update onboarding materials files" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'onboarding_materials' AND 
        public.is_super_admin()
    );

-- Storage Policy: Authenticated Admins can delete
CREATE POLICY "Admins can delete onboarding materials files" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'onboarding_materials' AND 
        public.is_super_admin()
    );

-- Add trigger for updated_at
CREATE TRIGGER set_updated_at_onboarding_materials
    BEFORE UPDATE ON onboarding_materials
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at();
