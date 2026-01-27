-- Create table for individual student placement records
create table if not exists student_placements (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Company Details
  company_name text not null,
  company_mail text,
  company_address text,
  hr_name text,
  hr_mail text,

  -- Student Details
  student_name text not null,
  student_id text not null, -- Register Number
  student_mail text,
  student_address text,
  department text, -- e.g. CSE, ECE
  current_year int, -- e.g. 4
  semester int, -- e.g. 7

  -- Offer Details
  offer_type text, -- e.g. Placement, Internship, Both
  salary decimal, -- Monthly or base
  package_lpa decimal, -- LPA
  join_date date,
  ref_no text -- Reference Number/Offer Letter ID
);

-- Policy to allow authenticated users to view
create policy "Enable read access for all authenticated users"
on student_placements for select
to authenticated
using (true);

-- Policy to allow authenticated users (TPO/Admin) to insert/update/delete
create policy "Enable write access for authenticated users"
on student_placements for all
to authenticated
using (true)
with check (true);

-- Enable RLS
alter table student_placements enable row level security;
