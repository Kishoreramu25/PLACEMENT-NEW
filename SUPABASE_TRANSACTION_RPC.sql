-- =====================================================================
-- SUPABASE TRANSACTION RPC SETUP
-- Run this script in the Supabase SQL Editor to enable Transactional Logic
-- for bulk imports and updates.
-- =====================================================================

-- 1. Transactional Update (for Manual Save)
-- Supports updating any column dynamically.
-- Aborts ALL updates if ONE fails.
CREATE OR REPLACE FUNCTION public.batch_update_student_placements(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u jsonb;
  rec_id uuid;
  field_name text;
  new_val text;
BEGIN
  -- updates is an array of objects: [{id, field, value}, ...]
  FOR u IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    rec_id := (u->>'id')::uuid;
    field_name := u->>'field';
    
    -- Use u->>'value' for the text representation. 
    -- Postgres generally casts string to the target column type automatically.
    -- WARNING: This assumes 'field_name' is a valid column in 'student_placements'.
    -- SQL Injection Protection: format %I ensures the identifier is quoted.
    EXECUTE format('UPDATE public.student_placements SET %I = $1 WHERE id = $2', field_name)
    USING (u->>'value'), rec_id;
  END LOOP;
END;
$$;

-- 2. Transactional Bulk Insert (for Excel Import - Student Placements)
CREATE OR REPLACE FUNCTION public.bulk_insert_student_placements_v2(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(records)
  LOOP
    INSERT INTO public.student_placements (
      company_name, company_mail, company_address, hr_name, hr_mail,
      student_name, student_id, student_mail, student_mobile, student_address,
      department, offer_type, salary, package_lpa, current_year, semester,
      join_date, ref_no, other_details
    ) VALUES (
      r->>'company_name',
      r->>'company_mail',
      r->>'company_address',
      r->>'hr_name',
      r->>'hr_mail',
      r->>'student_name',
      r->>'student_id',
      r->>'student_mail',
      r->>'student_mobile',
      r->>'student_address',
      r->>'department',
      r->>'offer_type',
      (r->>'salary')::numeric,
      (r->>'package_lpa')::numeric,
      (r->>'current_year')::integer,
      (r->>'semester')::integer,
      (r->>'join_date')::date,
      r->>'ref_no',
      COALESCE(r->'other_details', '{}'::jsonb)
    );
  END LOOP;
END;
$$;

-- 3. Transactional Bulk Insert (for Excel Import - Placement Records)
CREATE OR REPLACE FUNCTION public.bulk_insert_placement_records(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(records)
  LOOP
    INSERT INTO public.placement_records (
      v_visit_type, date_of_visit, v_company_name, v_company_address,
      v_location, v_company_contact_person, v_company_contact_number,
      v_company_mail_id, company_type, salary_package, remark,
      department, register_no, reference_faculty
    ) VALUES (
      r->>'v_visit_type',
      r->>'date_of_visit',
      r->>'v_company_name',
      r->>'v_company_address',
      r->>'v_location',
      r->>'v_company_contact_person',
      r->>'v_company_contact_number',
      r->>'v_company_mail_id',
      r->>'company_type',
      r->>'salary_package',
      r->>'remark',
      r->>'department',
      r->>'register_no',
      r->>'reference_faculty'
    );
  END LOOP;
END;
$$;
