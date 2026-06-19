-- Extracurricular Module Schema

-- 1. Extracurriculars Master Table
CREATE TABLE IF NOT EXISTS public.extracurriculars (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    coach_name VARCHAR(255),
    schedule TEXT,
    internal_fee DECIMAL(15,2) DEFAULT 0,
    external_fee DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. External Students Profile (Auth is linked via user_id)
CREATE TABLE IF NOT EXISTS public.external_students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone_number VARCHAR(50),
    school_origin VARCHAR(255),
    parent_name VARCHAR(255),
    address TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Extracurricular Members (Registrations)
CREATE TABLE IF NOT EXISTS public.extracurricular_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    extracurricular_id UUID NOT NULL REFERENCES public.extracurriculars(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE, -- Internal student
    external_student_id UUID REFERENCES public.external_students(id) ON DELETE CASCADE, -- External student
    join_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- PENDING, ACTIVE, DROPPED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CHECK (
        (student_id IS NOT NULL AND external_student_id IS NULL) OR 
        (student_id IS NULL AND external_student_id IS NOT NULL)
    )
);

-- 4. Extracurricular Attendances
CREATE TABLE IF NOT EXISTS public.extracurricular_attendances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    extracurricular_id UUID NOT NULL REFERENCES public.extracurriculars(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.extracurricular_members(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL, -- PRESENT, ABSENT, SICK, PERMISSION
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Extracurricular Grades
CREATE TABLE IF NOT EXISTS public.extracurricular_grades (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    extracurricular_id UUID NOT NULL REFERENCES public.extracurriculars(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.extracurricular_members(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE SET NULL,
    score VARCHAR(10), -- A, B, C, or numeric
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at_extracurriculars BEFORE UPDATE ON public.extracurriculars FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at_external_students BEFORE UPDATE ON public.external_students FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at_extracurricular_members BEFORE UPDATE ON public.extracurricular_members FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at_extracurricular_attendances BEFORE UPDATE ON public.extracurricular_attendances FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at_extracurricular_grades BEFORE UPDATE ON public.extracurricular_grades FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS Policies
ALTER TABLE public.extracurriculars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracurricular_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracurricular_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracurricular_grades ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read extracurriculars
CREATE POLICY "Allow read access to all authenticated users on extracurriculars" ON public.extracurriculars FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow full access to admin on extracurriculars" ON public.extracurriculars FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow full access to admin on external_students" ON public.external_students FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Allow external student to read own profile" ON public.external_students FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Allow full access to admin on extracurricular_members" ON public.extracurricular_members FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Allow read to member on members" ON public.extracurricular_members FOR SELECT TO authenticated USING (
    student_id IN (SELECT student_id FROM public.student_parent_links spl JOIN public.parents p ON spl.parent_id = p.id WHERE p.user_id = auth.uid()) OR
    external_student_id IN (SELECT id FROM external_students WHERE user_id = auth.uid())
);

CREATE POLICY "Allow full access to admin on extracurricular_attendances" ON public.extracurricular_attendances FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Allow read to member on attendances" ON public.extracurricular_attendances FOR SELECT TO authenticated USING (
    member_id IN (
        SELECT id FROM extracurricular_members 
        WHERE student_id IN (SELECT student_id FROM public.student_parent_links spl JOIN public.parents p ON spl.parent_id = p.id WHERE p.user_id = auth.uid()) 
        OR external_student_id IN (SELECT id FROM external_students WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Allow full access to admin on extracurricular_grades" ON public.extracurricular_grades FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Allow read to member on grades" ON public.extracurricular_grades FOR SELECT TO authenticated USING (
    member_id IN (
        SELECT id FROM extracurricular_members 
        WHERE student_id IN (SELECT student_id FROM public.student_parent_links spl JOIN public.parents p ON spl.parent_id = p.id WHERE p.user_id = auth.uid()) 
        OR external_student_id IN (SELECT id FROM external_students WHERE user_id = auth.uid())
    )
);

-- Allow public access for registration purposes (to read active extracurriculars)
CREATE POLICY "Allow public read access to active extracurriculars" ON public.extracurriculars FOR SELECT TO anon USING (is_active = true);

-- Allow public insertion for external students during registration (if not using edge functions)
-- Note: In a real secure environment, this might be handled via a secure edge function, but for simplicity here we allow anon inserts to external_students and members if they sign up.
-- Actually, since they will sign up via Auth first, they will be authenticated as a new user with role 'authenticated'.
CREATE POLICY "Allow users to create their own external profile" ON public.external_students FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Allow users to update their own external profile" ON public.external_students FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Allow users to register to extracurriculars" ON public.extracurricular_members FOR INSERT TO authenticated WITH CHECK (
    external_student_id IN (SELECT id FROM external_students WHERE user_id = auth.uid())
);


-- Seed some initial data
INSERT INTO public.extracurriculars (name, description, coach_name, schedule, internal_fee, external_fee)
VALUES 
('Beladiri Tsufuk', 'Kegiatan beladiri untuk melatih fisik dan mental', 'Ust. Ahmad', 'Selasa & Kamis, 16.00 - 17.30', 50000, 100000),
('Coding & Robotic', 'Belajar dasar pemrograman dan merakit robot sederhana', 'Kak Budi', 'Rabu & Jumat, 15.30 - 17.00', 100000, 150000),
('Panahan', 'Olahraga sunnah memanah', 'Ust. Khalid', 'Sabtu, 08.00 - 10.00', 75000, 120000),
('Kaligrafi', 'Seni menulis indah huruf Arab', 'Ust. Ali', 'Senin, 16.00 - 17.30', 40000, 80000),
('Madrasah Sore', 'Pendalaman agama Islam', 'Ust. Hasan', 'Senin - Kamis, 15.30 - 17.00', 30000, 60000);
