-- Create Master Students Table
CREATE TABLE IF NOT EXISTS public.master_students (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    student_id text UNIQUE NOT NULL, -- Register Number / USN (Key for lookup)
    student_name text NOT NULL,
    student_mail text,
    student_mobile text,
    student_address text,
    department text,
    current_year integer,
    semester integer,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create Master Companies Table
CREATE TABLE IF NOT EXISTS public.master_companies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_name text UNIQUE NOT NULL, -- Name (Key for lookup)
    company_mail text,
    company_address text,
    hr_name text,
    hr_mail text,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.master_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_companies ENABLE ROW LEVEL SECURITY;

-- Policies for Master Students
CREATE POLICY "Enable all access for authenticated users (Students)"
ON public.master_students FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Policies for Master Companies
CREATE POLICY "Enable all access for authenticated users (Companies)"
ON public.master_companies FOR ALL TO authenticated
USING (true) WITH CHECK (true);
