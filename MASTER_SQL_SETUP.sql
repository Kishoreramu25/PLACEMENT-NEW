-- =====================================================================
-- MASTER SQL SETUP SCRIPT FOR PLACEMENT NAVIGATOR
-- =====================================================================
-- Run this ENTIRE script in Supabase SQL Editor to recreate ALL tables.
-- This is a COMPLETE, IDEMPOTENT script — safe to run even if some
-- objects already exist.
-- =====================================================================


-- =====================================================================
-- SECTION 1: ENUM TYPES
-- =====================================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('placement_officer', 'department_coordinator', 'management');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.drive_type AS ENUM ('placement', 'internship', 'both');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.visit_mode AS ENUM ('on_campus', 'off_campus', 'virtual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =====================================================================
-- SECTION 2: CORE TABLES
-- =====================================================================

-- 2.1 Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 2.2 User Roles (RBAC)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2.3 Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2.4 Academic Years
CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_label TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

-- 2.5 Companies
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  location TEXT,
  industry_domain TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  alternate_phone TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2.6 Placement Drives
CREATE TABLE IF NOT EXISTS public.placement_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) NOT NULL,
  drive_type drive_type NOT NULL DEFAULT 'placement',
  role_offered TEXT,
  visit_date DATE NOT NULL,
  visit_time TIME,
  visit_mode visit_mode NOT NULL DEFAULT 'on_campus',
  stipend_amount NUMERIC,
  ctc_amount NUMERIC,
  remarks TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.placement_drives ENABLE ROW LEVEL SECURITY;

-- 2.7 Drive Eligible Departments (Junction Table)
CREATE TABLE IF NOT EXISTS public.drive_eligible_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id UUID REFERENCES public.placement_drives(id) ON DELETE CASCADE NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (drive_id, department_id)
);
ALTER TABLE public.drive_eligible_departments ENABLE ROW LEVEL SECURITY;

-- 2.8 Selection Statistics
CREATE TABLE IF NOT EXISTS public.selection_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id UUID REFERENCES public.placement_drives(id) ON DELETE CASCADE NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
  students_appeared INTEGER NOT NULL DEFAULT 0,
  students_selected INTEGER NOT NULL DEFAULT 0,
  ppo_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (drive_id, department_id)
);
ALTER TABLE public.selection_statistics ENABLE ROW LEVEL SECURITY;

-- 2.9 Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  action audit_action NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- SECTION 3: PLACEMENT RECORDS TABLE (TPO Visit Records)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.placement_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add all columns (idempotent)
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS v_visit_type TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS date_of_visit TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS v_company_name TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS v_company_address TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS v_location TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS v_company_contact_person TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS v_company_contact_number TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS v_company_mail_id TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS company_type TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS salary_package TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS register_no TEXT;
ALTER TABLE public.placement_records ADD COLUMN IF NOT EXISTS reference_faculty TEXT;

ALTER TABLE public.placement_records ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- SECTION 4: STUDENT PLACEMENTS TABLE (HOD Student Records)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.student_placements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Company Details
  company_name TEXT,
  company_mail TEXT,
  company_address TEXT,
  hr_name TEXT,
  hr_mail TEXT,

  -- Student Details
  student_name TEXT,
  student_id TEXT,
  student_mail TEXT,
  student_mobile TEXT,
  student_address TEXT,
  department TEXT,

  -- Offer Details
  offer_type TEXT,
  salary NUMERIC,
  package_lpa NUMERIC,
  current_year INTEGER,
  semester INTEGER,
  join_date DATE,
  ref_no TEXT,

  -- Dynamic Columns (for "Add Column" feature)
  other_details JSONB DEFAULT '{}'::jsonb,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.student_placements ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- SECTION 5: MASTER DATA TABLES (Master Students & Companies)
-- =====================================================================

-- 5.1 Master Students
CREATE TABLE IF NOT EXISTS public.master_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  student_id TEXT UNIQUE NOT NULL,
  student_name TEXT NOT NULL,
  student_mail TEXT,
  student_mobile TEXT,
  student_address TEXT,
  department TEXT,
  current_year INTEGER,
  semester INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.master_students ENABLE ROW LEVEL SECURITY;

-- 5.2 Master Companies
CREATE TABLE IF NOT EXISTS public.master_companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  company_name TEXT UNIQUE NOT NULL,
  company_mail TEXT,
  company_address TEXT,
  hr_name TEXT,
  hr_mail TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.master_companies ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- SECTION 6: SECURITY DEFINER FUNCTIONS
-- =====================================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's department
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles
  WHERE id = _user_id
$$;

-- Function to check if user is placement officer
CREATE OR REPLACE FUNCTION public.is_placement_officer(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'placement_officer')
$$;

-- Function to check if user is department coordinator
CREATE OR REPLACE FUNCTION public.is_department_coordinator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'department_coordinator')
$$;

-- Function to check if user is management
CREATE OR REPLACE FUNCTION public.is_management(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'management')
$$;


-- =====================================================================
-- SECTION 7: RLS POLICIES
-- =====================================================================

-- 7.1 Departments Policies
DROP POLICY IF EXISTS "Departments are viewable by authenticated users" ON public.departments;
CREATE POLICY "Departments are viewable by authenticated users"
ON public.departments FOR SELECT TO authenticated USING (true);

-- 7.2 User Roles Policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow insert during signup" ON public.user_roles;
CREATE POLICY "Allow insert during signup"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 7.3 Profiles Policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.profiles;
CREATE POLICY "Allow profile creation during signup"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- 7.4 Academic Years Policies
DROP POLICY IF EXISTS "Academic years are viewable by authenticated users" ON public.academic_years;
CREATE POLICY "Academic years are viewable by authenticated users"
ON public.academic_years FOR SELECT TO authenticated USING (true);

-- 7.5 Companies Policies
DROP POLICY IF EXISTS "Companies are viewable by authenticated users" ON public.companies;
CREATE POLICY "Companies are viewable by authenticated users"
ON public.companies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Placement officers can insert companies" ON public.companies;
CREATE POLICY "Placement officers can insert companies"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (public.is_placement_officer(auth.uid()));

DROP POLICY IF EXISTS "Placement officers can update companies" ON public.companies;
CREATE POLICY "Placement officers can update companies"
ON public.companies FOR UPDATE TO authenticated
USING (public.is_placement_officer(auth.uid()))
WITH CHECK (public.is_placement_officer(auth.uid()));

DROP POLICY IF EXISTS "Placement officers can delete companies" ON public.companies;
CREATE POLICY "Placement officers can delete companies"
ON public.companies FOR DELETE TO authenticated
USING (public.is_placement_officer(auth.uid()));

-- 7.6 Placement Drives Policies
DROP POLICY IF EXISTS "Placement officers can view all drives" ON public.placement_drives;
CREATE POLICY "Placement officers can view all drives"
ON public.placement_drives FOR SELECT TO authenticated
USING (public.is_placement_officer(auth.uid()) OR public.is_management(auth.uid()));

DROP POLICY IF EXISTS "Dept coordinators view dept drives" ON public.placement_drives;
CREATE POLICY "Dept coordinators view dept drives"
ON public.placement_drives FOR SELECT TO authenticated
USING (
  public.is_department_coordinator(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.drive_eligible_departments ded
    WHERE ded.drive_id = placement_drives.id
    AND ded.department_id = public.get_user_department(auth.uid())
  )
);

DROP POLICY IF EXISTS "Placement officers can insert drives" ON public.placement_drives;
CREATE POLICY "Placement officers can insert drives"
ON public.placement_drives FOR INSERT TO authenticated
WITH CHECK (public.is_placement_officer(auth.uid()));

DROP POLICY IF EXISTS "Placement officers can update drives" ON public.placement_drives;
CREATE POLICY "Placement officers can update drives"
ON public.placement_drives FOR UPDATE TO authenticated
USING (public.is_placement_officer(auth.uid()))
WITH CHECK (public.is_placement_officer(auth.uid()));

DROP POLICY IF EXISTS "Placement officers can delete drives" ON public.placement_drives;
CREATE POLICY "Placement officers can delete drives"
ON public.placement_drives FOR DELETE TO authenticated
USING (public.is_placement_officer(auth.uid()));

-- 7.7 Drive Eligible Departments Policies
DROP POLICY IF EXISTS "Eligible departments viewable by authenticated" ON public.drive_eligible_departments;
CREATE POLICY "Eligible departments viewable by authenticated"
ON public.drive_eligible_departments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Placement officers manage eligible depts" ON public.drive_eligible_departments;
CREATE POLICY "Placement officers manage eligible depts"
ON public.drive_eligible_departments FOR INSERT TO authenticated
WITH CHECK (public.is_placement_officer(auth.uid()));

DROP POLICY IF EXISTS "Placement officers can delete eligible depts" ON public.drive_eligible_departments;
CREATE POLICY "Placement officers can delete eligible depts"
ON public.drive_eligible_departments FOR DELETE TO authenticated
USING (public.is_placement_officer(auth.uid()));

-- 7.8 Selection Statistics Policies
DROP POLICY IF EXISTS "Officers and management view all stats" ON public.selection_statistics;
CREATE POLICY "Officers and management view all stats"
ON public.selection_statistics FOR SELECT TO authenticated
USING (public.is_placement_officer(auth.uid()) OR public.is_management(auth.uid()));

DROP POLICY IF EXISTS "Dept coordinators view dept stats" ON public.selection_statistics;
CREATE POLICY "Dept coordinators view dept stats"
ON public.selection_statistics FOR SELECT TO authenticated
USING (
  public.is_department_coordinator(auth.uid()) AND
  department_id = public.get_user_department(auth.uid())
);

DROP POLICY IF EXISTS "Placement officers can insert stats" ON public.selection_statistics;
CREATE POLICY "Placement officers can insert stats"
ON public.selection_statistics FOR INSERT TO authenticated
WITH CHECK (public.is_placement_officer(auth.uid()));

DROP POLICY IF EXISTS "Placement officers can update stats" ON public.selection_statistics;
CREATE POLICY "Placement officers can update stats"
ON public.selection_statistics FOR UPDATE TO authenticated
USING (public.is_placement_officer(auth.uid()))
WITH CHECK (public.is_placement_officer(auth.uid()));

DROP POLICY IF EXISTS "Placement officers can delete stats" ON public.selection_statistics;
CREATE POLICY "Placement officers can delete stats"
ON public.selection_statistics FOR DELETE TO authenticated
USING (public.is_placement_officer(auth.uid()));

-- 7.9 Audit Logs Policies
DROP POLICY IF EXISTS "Placement officers view all audit logs" ON public.audit_logs;
CREATE POLICY "Placement officers view all audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_placement_officer(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 7.10 Placement Records Policies (Permissive for TPO data)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.placement_records;
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.placement_records;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.placement_records;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.placement_records;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.placement_records;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.placement_records;

CREATE POLICY "Enable all access for everyone"
ON public.placement_records FOR ALL
USING (true)
WITH CHECK (true);

-- 7.11 Student Placements Policies (Permissive for HOD data)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.student_placements;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.student_placements;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.student_placements;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.student_placements;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.student_placements;

CREATE POLICY "Enable all access for authenticated users"
ON public.student_placements FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 7.12 Master Students Policies
DROP POLICY IF EXISTS "Enable all access for authenticated users (Students)" ON public.master_students;
CREATE POLICY "Enable all access for authenticated users (Students)"
ON public.master_students FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- 7.13 Master Companies Policies
DROP POLICY IF EXISTS "Enable all access for authenticated users (Companies)" ON public.master_companies;
CREATE POLICY "Enable all access for authenticated users (Companies)"
ON public.master_companies FOR ALL TO authenticated
USING (true) WITH CHECK (true);


-- =====================================================================
-- SECTION 8: TRIGGERS
-- =====================================================================

-- 8.1 Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user profile creation (drop first to be idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8.2 Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at (drop first to be idempotent)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_placement_drives_updated_at ON public.placement_drives;
CREATE TRIGGER update_placement_drives_updated_at
  BEFORE UPDATE ON public.placement_drives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_selection_statistics_updated_at ON public.selection_statistics;
CREATE TRIGGER update_selection_statistics_updated_at
  BEFORE UPDATE ON public.selection_statistics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- =====================================================================
-- SECTION 9: SEED DATA
-- =====================================================================

-- 9.1 Departments (insert only if they don't exist)
INSERT INTO public.departments (name, code) VALUES
  ('Computer Science and Engineering', 'CSE'),
  ('Electronics and Communication Engineering', 'ECE'),
  ('Electrical and Electronics Engineering', 'EEE'),
  ('Mechanical Engineering', 'MECH'),
  ('Civil Engineering', 'CIVIL'),
  ('Information Technology', 'IT'),
  ('Artificial Intelligence and Machine Learning', 'AIML'),
  ('Data Science', 'DS')
ON CONFLICT (code) DO NOTHING;

-- 9.2 Academic Years (insert only if they don't exist)
INSERT INTO public.academic_years (year_label, start_date, end_date, is_current) VALUES
  ('2022-2023', '2022-07-01', '2023-06-30', false),
  ('2023-2024', '2023-07-01', '2024-06-30', false),
  ('2024-2025', '2024-07-01', '2025-06-30', true)
ON CONFLICT (year_label) DO NOTHING;


-- =====================================================================
-- SECTION 10: FORCE SCHEMA RELOAD
-- =====================================================================

NOTIFY pgrst, 'reload schema';


-- =====================================================================
-- DONE! All tables, enums, functions, policies, triggers, and seed data
-- have been created successfully.
-- =====================================================================
