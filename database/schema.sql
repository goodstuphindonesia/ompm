create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null default '',
  role text not null default 'user' check (role in ('user', 'reviewer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  vendor_name text not null,
  pic_name text not null,
  pic_contact_number text not null,
  email text not null,
  bank_account_name text not null,
  bank_account_address text not null,
  bank_name text not null,
  bank_account_number text not null,
  bank_address text not null,
  swift_code text not null,
  account_currency text not null default 'IDR',
  npwp_number text,
  ktp_file_name text,
  ktp_file_url text,
  ktp_file_metadata jsonb,
  pph_final_umkm_file_name text,
  pph_final_umkm_file_url text,
  pph_final_umkm_file_metadata jsonb,
  information_confirmed boolean not null default false,
  tax_acknowledged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_npwp_or_ktp check (
    nullif(npwp_number, '') is not null
    or nullif(ktp_file_url, '') is not null
    or nullif(ktp_file_name, '') is not null
  )
);

alter table vendors add column if not exists account_currency text not null default 'IDR';
alter table vendors add column if not exists pph_final_umkm_file_name text;
alter table vendors add column if not exists pph_final_umkm_file_url text;
alter table vendors add column if not exists pph_final_umkm_file_metadata jsonb;
alter table vendors add column if not exists information_confirmed boolean not null default false;
alter table vendors add column if not exists tax_acknowledged boolean not null default false;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  attention_name text not null default '',
  contact_number text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, address, attention_name)
);

create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  client_name text not null,
  client_address text not null default '',
  attention_name text not null default '',
  contact_number text not null default '',
  job_number text not null default '',
  estimate_number text not null default '',
  campaign_period text not null default '',
  estimate_date date not null,
  currency text not null default 'SGD',
  version text not null default '1',
  project_title text not null,
  payment_terms text not null default '',
  prepared_by text not null default '',
  status text not null default 'Draft' check (status in ('Draft', 'Submitted for Approval', 'Approved', 'Rejected')),
  xero_status text not null default 'Not ready',
  created_by uuid references profiles(id) on delete set null,
  approved_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists estimate_external_lines (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references estimates(id) on delete cascade,
  item text not null default '',
  description text not null default '',
  supplier_name text not null default '',
  invoice_number text not null default '',
  estimated_cost numeric(14, 2) not null default 0,
  billed_amount numeric(14, 2) not null default 0,
  actual_cost numeric(14, 2) not null default 0,
  remarks text not null default '',
  sort_order integer not null default 0
);

create table if not exists estimate_internal_lines (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references estimates(id) on delete cascade,
  item text not null default '',
  description text not null default '',
  cost numeric(14, 2) not null default 0,
  units numeric(14, 2) not null default 0,
  sort_order integer not null default 0
);

create table if not exists payment_requests (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete restrict,
  estimate_id uuid not null references estimates(id) on delete restrict,
  attribution_line_id uuid references estimate_external_lines(id) on delete set null,
  job_number text not null default '',
  project_title text not null default '',
  currency text not null default 'SGD',
  subtotal numeric(14, 2) not null default 0,
  pph numeric(14, 2) not null default 0,
  ppn numeric(14, 2) not null default 0,
  amount numeric(14, 2) generated always as (subtotal - pph + ppn) stored,
  due_date date not null,
  invoice_number text not null,
  reviewer_note text not null default '',
  status text not null default 'Submitted' check (status in ('Submitted', 'Approved', 'Rejected')),
  submitted_by uuid references profiles(id) on delete set null,
  reviewed_by uuid references profiles(id) on delete set null,
  admin_email_preview text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vendors_email_idx on vendors(email);
create index if not exists estimates_status_idx on estimates(status);
create index if not exists estimates_client_name_idx on estimates(client_name);
create index if not exists payment_requests_status_idx on payment_requests(status);
create index if not exists payment_requests_vendor_id_idx on payment_requests(vendor_id);
create index if not exists payment_requests_estimate_id_idx on payment_requests(estimate_id);
