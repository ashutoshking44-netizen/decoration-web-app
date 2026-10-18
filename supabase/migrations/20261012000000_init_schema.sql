-- ==============================================================================
-- DECORATION SUITE: SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Compatible with both:
-- 1. Admin Dashboard (Decoration Studio Management)
-- 2. Client-Facing Public Project / Website / Mobile App
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DECORATIONS CATALOG TABLE
CREATE TABLE IF NOT EXISTS public.decorations (
  id TEXT PRIMARY KEY,
  sku TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Live',
  image_url TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  applicable_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  structure_type TEXT,
  dimensions JSONB DEFAULT '{}'::jsonb,
  specifications JSONB DEFAULT '{}'::jsonb,
  components JSONB DEFAULT '[]'::jsonb,
  booking_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ENQUIRIES TABLE
CREATE TABLE IF NOT EXISTS public.enquiries (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp_number TEXT,
  email TEXT,
  location TEXT,
  source TEXT NOT NULL DEFAULT 'Website',
  ceremony_type TEXT,
  date_bs TEXT,
  date_ad TEXT,
  date_iso TEXT,
  venue TEXT,
  availability_status TEXT DEFAULT 'free',
  availability_summary TEXT,
  status TEXT NOT NULL DEFAULT 'unreviewed',
  order_type TEXT DEFAULT 'quotation-request',
  estimated_budget_npr NUMERIC,
  package_tier TEXT,
  time_slot TEXT,
  guest_count INTEGER,
  private_note TEXT,
  assigned_handler TEXT,
  prompt_state TEXT DEFAULT 'idle',
  decline_reason TEXT,
  responded_at TIMESTAMPTZ,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  reference_images JSONB DEFAULT '[]'::jsonb,
  quotation_number TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. BOOKED CLIENTS / QUOTATIONS TABLE
CREATE TABLE IF NOT EXISTS public.booked_clients (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  event_type TEXT,
  event_date TEXT,
  venue TEXT,
  stage TEXT NOT NULL DEFAULT 'confirmed',
  payment_status TEXT NOT NULL DEFAULT 'balance_due',
  payment_note TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC NOT NULL DEFAULT 0,
  days_to_event TEXT DEFAULT '30',
  needs_attention BOOLEAN DEFAULT false,
  source TEXT,
  city TEXT,
  location_type TEXT,
  handler TEXT,
  events_count INTEGER DEFAULT 1,
  quotation_status TEXT NOT NULL DEFAULT 'Draft',
  proposal_id TEXT UNIQUE,
  ceremonies JSONB NOT NULL DEFAULT '[]'::jsonb,
  decorations JSONB DEFAULT '[]'::jsonb,
  paid_addons JSONB DEFAULT '[]'::jsonb,
  crew_assignments JSONB DEFAULT '[]'::jsonb,
  payment_accounts JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. PAYMENT QR ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.payment_qrs (
  id TEXT PRIMARY KEY,
  owner_name TEXT NOT NULL,
  label TEXT NOT NULL,
  account_number TEXT,
  image TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. COMPANY PROFILE TABLE
CREATE TABLE IF NOT EXISTS public.company_profile (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  services JSONB DEFAULT '[]'::jsonb,
  event_types JSONB DEFAULT '[]'::jsonb,
  team_size TEXT,
  years_active TEXT,
  about TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  target_id TEXT,
  target_label TEXT,
  performed_by TEXT,
  detail TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. PROPOSAL ACTIVITY TABLE
CREATE TABLE IF NOT EXISTS public.proposal_activity (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  type TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. PHOTOGRAPHER GALLERY TABLE
CREATE TABLE IF NOT EXISTS public.photographer_gallery (
  id TEXT PRIMARY KEY,
  title TEXT,
  category TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_decorations_category ON public.decorations(category);
CREATE INDEX IF NOT EXISTS idx_decorations_status ON public.decorations(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON public.enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON public.enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booked_clients_stage ON public.booked_clients(stage);
CREATE INDEX IF NOT EXISTS idx_booked_clients_proposal_id ON public.booked_clients(proposal_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.decorations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booked_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_qrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photographer_gallery ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated access for client app & admin suite
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['decorations', 'enquiries', 'booked_clients', 'payment_qrs', 'company_profile', 'audit_logs', 'proposal_activity', 'photographer_gallery']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_anon_all_%I" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "allow_anon_all_%I" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;

-- Enable Supabase Realtime for instant updates across projects
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.decorations, public.enquiries, public.booked_clients, public.payment_qrs, public.company_profile;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
  END;
END $$;
