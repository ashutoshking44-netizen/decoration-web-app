-- ==============================================================================
-- SUPABASE COMPREHENSIVE SEED DATA
-- ==============================================================================
-- Includes:
-- 1. Supabase Auth Users with Avatars/Photos & Full Metadata
-- 2. Decor Companies & Profiles (Work Suvash, Everest Events, Royal Orchid, etc.)
-- 3. High-Quality Catalog Decorations with Photos & Itemized Breakdowns
-- 4. User Enquiries / Inbound Leads with Reference Photos & Contact Details
-- 5. Booked Clients with Event Ceremonies, Pricing & Payment Tracking
-- 6. Payment QR Accounts
-- Safe to re-run: uses ON CONFLICT DO UPDATE.
-- ==============================================================================

-- Enable UUID & cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure schema columns exist across table versions
ALTER TABLE public.decorations ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.decorations ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.booked_clients ADD COLUMN IF NOT EXISTS enquiry_id TEXT;
ALTER TABLE public.booked_clients ADD COLUMN IF NOT EXISTS company_id TEXT;

-- Ensure company_profile table exists
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

-- Ensure company_profiles table exists (for multi-tenant and test assertions)
CREATE TABLE IF NOT EXISTS public.company_profiles (
  company_id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  tagline TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  city TEXT,
  website TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  brand_colors JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 1. SUPABASE AUTH USERS (With Photos, Passwords & Metadata)
-- ------------------------------------------------------------------------------
-- Automatically populated when running in Supabase environment with auth schema.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES
    (
      '00000000-0000-0000-0000-000000000000',
      'a0000000-0000-0000-0000-000000000001',
      'authenticated',
      'authenticated',
      'worksuvash@gmail.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{
        "full_name": "Suvash Shrestha",
        "name": "Suvash Shrestha",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        "phone": "+977-9801234567",
        "company_id": "company-3",
        "company_name": "Work Suvash",
        "role": "decorator_lead"
      }'::jsonb,
      now(),
      now(),
      '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      'a0000000-0000-0000-0000-000000000002',
      'authenticated',
      'authenticated',
      'sunil@everestevents.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{
        "full_name": "Sunil Shrestha",
        "name": "Sunil Shrestha",
        "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
        "phone": "+977-9851023456",
        "company_id": "company-1",
        "company_name": "Everest Events & Decor",
        "role": "owner"
      }'::jsonb,
      now(),
      now(),
      '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      'a0000000-0000-0000-0000-000000000003',
      'authenticated',
      'authenticated',
      'pooja@royalorchid.com.np',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{
        "full_name": "Pooja Gurung",
        "name": "Pooja Gurung",
        "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
        "phone": "+977-9841234567",
        "company_id": "company-2",
        "company_name": "Royal Orchid Events",
        "role": "event_director"
      }'::jsonb,
      now(),
      now(),
      '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      'a0000000-0000-0000-0000-000000000004',
      'authenticated',
      'authenticated',
      'aarav.sharma@gmail.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{
        "full_name": "Aarav Sharma",
        "name": "Aarav Sharma",
        "avatar_url": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
        "phone": "+977-9801987654",
        "city": "Kathmandu",
        "role": "client"
      }'::jsonb,
      now(),
      now(),
      '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      'a0000000-0000-0000-0000-000000000005',
      'authenticated',
      'authenticated',
      'priya.adhikari@yahoo.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{
        "full_name": "Priya Adhikari",
        "name": "Priya Adhikari",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        "phone": "+977-9841567890",
        "city": "Lalitpur",
        "role": "client"
      }'::jsonb,
      now(),
      now(),
      '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      'a0000000-0000-0000-0000-000000000006',
      'authenticated',
      'authenticated',
      'rohan.shrestha@outlook.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{
        "full_name": "Rohan Shrestha",
        "name": "Rohan Shrestha",
        "avatar_url": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80",
        "phone": "+977-9851087654",
        "city": "Kathmandu",
        "role": "client"
      }'::jsonb,
      now(),
      now(),
      '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000007',
      'a0000000-0000-0000-0000-000000000007',
      'authenticated',
      'authenticated',
      'sneha.karki@gmail.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{
        "full_name": "Sneha Karki",
        "name": "Sneha Karki",
        "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
        "phone": "+977-9813456789",
        "city": "Kathmandu",
        "role": "client"
      }'::jsonb,
      now(),
      now(),
      '', '', '', ''
    )
    ON CONFLICT (id) DO UPDATE SET
      raw_user_meta_data = EXCLUDED.raw_user_meta_data,
      updated_at = now();
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. COMPANY PROFILES (public.company_profile & public.company_profiles)
-- ------------------------------------------------------------------------------
INSERT INTO public.company_profile (
  id,
  name,
  owner_name,
  phone,
  email,
  city,
  services,
  event_types,
  team_size,
  years_active,
  about,
  updated_at
) VALUES
(
  'default',
  'Everest Events & Decor',
  'Sunil Shrestha',
  '+977 9851023456',
  'hello@everestevents.com',
  'Kathmandu',
  '["Floral Decoration", "Stage & Mandap Setup", "Lighting & Effects", "Outdoor / Tent Setup", "Rigging & Structures"]'::jsonb,
  '["Weddings", "Receptions", "Engagements", "Corporate Events"]'::jsonb,
  '40+',
  '8+ years',
  'Nepal premier luxury event & destination wedding decorators. Specialized in regal stages, fresh imported orchid arches, and crystal chandeliers.',
  now()
),
(
  'company-1',
  'Everest Events & Decor',
  'Sunil Shrestha',
  '+977 9851023456',
  'hello@everestevents.com',
  'Kathmandu',
  '["Floral Decoration", "Stage & Mandap Setup", "Lighting & Effects", "Outdoor / Tent Setup", "Rigging & Structures"]'::jsonb,
  '["Weddings", "Receptions", "Engagements", "Corporate Events"]'::jsonb,
  '40+',
  '8+ years',
  'Nepal premier luxury event & destination wedding decorators. Specialized in regal stages, fresh imported orchid arches, and crystal chandeliers.',
  now()
),
(
  'company-2',
  'Royal Orchid Events',
  'Pooja Gurung',
  '+977 9841234567',
  'info@royalorchid.com.np',
  'Lalitpur',
  '["Stage & Mandap Setup", "Floral Decoration", "Fabric & Draping", "Table & Seating Setup"]'::jsonb,
  '["Weddings", "Receptions", "Engagements", "Religious Ceremonies"]'::jsonb,
  '16–40',
  '4–7 years',
  'Crafting royal celebration aesthetics with grand hydraulic platforms, traditional Vedic mandaps, and bespoke banquet styling.',
  now()
),
(
  'company-3',
  'Work Suvash',
  'Suvash Shrestha',
  '+977 9801234567',
  'worksuvash@gmail.com',
  'Kathmandu',
  '["Floral Decoration", "Stage & Mandap Setup", "Lighting & Effects", "Theme & Prop Styling", "Entrance & Pathway Decor"]'::jsonb,
  '["Weddings", "Receptions", "Mehendi & Haldi", "Engagements", "Anniversaries"]'::jsonb,
  '16–40',
  '4–7 years',
  'Bespoke wedding and celebration styling studio. Modern Roman arches, warm ambient illumination, and vibrant ceremonial floral artistry.',
  now()
),
(
  'company-4',
  'Lalitpur Bloom Studios',
  'Bikash KC',
  '+977 9860123456',
  'bikash.kc@bloomstudios.com',
  'Lalitpur',
  '["Floral Decoration", "Entrance & Pathway Decor", "Theme & Prop Styling", "Balloon Decoration"]'::jsonb,
  '["Weddings", "Engagements", "Birthdays", "Mehendi & Haldi"]'::jsonb,
  '6–15',
  '1–3 years',
  'Boutique floral design workshop known for aesthetic boho pampas grass photobooths, neon custom signs, and dreamy entryway tunnels.',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  owner_name = EXCLUDED.owner_name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  city = EXCLUDED.city,
  services = EXCLUDED.services,
  event_types = EXCLUDED.event_types,
  team_size = EXCLUDED.team_size,
  years_active = EXCLUDED.years_active,
  about = EXCLUDED.about,
  updated_at = now();

-- Also mirror into company_profiles table for schema completeness
INSERT INTO public.company_profiles (
  company_id,
  company_name,
  tagline,
  contact_phone,
  contact_email,
  address,
  city,
  website,
  social_links,
  brand_colors,
  settings
) VALUES
(
  'royal-orchid',
  'Royal Orchid Events',
  'Crafting Unforgettable Royal Experiences Across Nepal',
  '+977 9841234567',
  'info@royalorchid.com.np',
  'Durbar Marg, Kathmandu',
  'Kathmandu',
  'https://royalorchid.com.np',
  '{"instagram": "https://instagram.com/royalorchid", "facebook": "https://facebook.com/royalorchid"}'::jsonb,
  '{"primary": "#881337", "secondary": "#F43F5E", "accent": "#BE123C"}'::jsonb,
  '{"currency": "NPR", "taxRate": 0.13, "defaultPaymentSchedule": "30-50-20"}'::jsonb
),
(
  'work-suvash',
  'Work Suvash',
  'Bespoke Event & Stage Styling with Premium Craftsmanship',
  '+977 9801234567',
  'worksuvash@gmail.com',
  'New Baneshwor, Kathmandu',
  'Kathmandu',
  'https://worksuvash.com',
  '{"instagram": "https://instagram.com/worksuvash"}'::jsonb,
  '{"primary": "#F43F5E", "secondary": "#FDA4AF", "accent": "#E11D48"}'::jsonb,
  '{"currency": "NPR", "taxRate": 0.13}'::jsonb
),
(
  'everest-events',
  'Everest Events & Decor',
  'Nepal Premier Destination Wedding & Stage Decorators',
  '+977 9851023456',
  'hello@everestevents.com',
  'Jhamsikhel, Lalitpur',
  'Lalitpur',
  'https://everestevents.com',
  '{"instagram": "https://instagram.com/everestevents"}'::jsonb,
  '{"primary": "#1E293B", "secondary": "#475569", "accent": "#0EA5E9"}'::jsonb,
  '{"currency": "NPR", "taxRate": 0.13}'::jsonb
)
ON CONFLICT (company_id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  tagline = EXCLUDED.tagline,
  contact_phone = EXCLUDED.contact_phone;

-- ------------------------------------------------------------------------------
-- 3. DECORATIONS CATALOG (Photos, Specs & Itemized Breakdowns)
-- ------------------------------------------------------------------------------
INSERT INTO public.decorations (
  id,
  sku,
  name,
  category,
  description,
  price,
  status,
  company_id,
  company_name,
  image_url,
  images,
  applicable_events,
  structure_type,
  dimensions,
  specifications,
  components,
  booking_count
) VALUES
(
  'decor-royal-stage-01',
  'STG-ROYAL-001',
  'Grand Royal Stage',
  'Stage',
  'Luxurious Roman Arch stage with imported magenta & white orchid arrangements, royal velvet carpeting, and chandelier platform lighting.',
  85000,
  'Live',
  'company-2',
  'Royal Orchid Events',
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  '["Wedding", "Reception", "Engagement"]'::jsonb,
  'Roman Arch Truss Structure',
  '{"width_ft": 24, "height_ft": 14, "depth_ft": 12, "summary": "24 × 14 ft"}'::jsonb,
  '{
    "inclusions": ["Grand Roman Arch", "Floral Setup", "Carpet"],
    "colours": ["Magenta", "White Orchid", "Gold"],
    "style": "Royal Roman Luxury",
    "setup_styles": ["Royal Roman Luxury", "Floral", "Modern Luxury"],
    "priceUnit": "Per Event",
    "floral": {
      "style": "Fresh Orchids & Cascading Roses",
      "varietyType": "Fresh",
      "flowers": [
        {"name": "White Orchid", "kind": "Fresh", "colour": "White"},
        {"name": "Magenta Rose", "kind": "Fresh", "colour": "Magenta"}
      ]
    },
    "platform": {"name": "Hydraulic Carpeted Stage", "price": 15000}
  }'::jsonb,
  '[
    {"name": "Base Arch & Drapes", "category": "Base Structure", "price": 45000, "description": "24x14ft Roman Arch with premium draped backdrop"},
    {"name": "Hydraulic Carpeted Platform", "category": "Platform", "price": 15000, "description": "Triple-tier stage with royal red carpet"},
    {"name": "Warm LED Warm Ambient & Spot", "category": "Lighting", "price": 10000, "description": "8 Warm spot lights and uplighting truss"},
    {"name": "Dual Royal Maharaja Throne", "category": "Furniture", "price": 15000, "description": "Gold leaf finish upholstered royal chairs"}
  ]'::jsonb,
  24
),
(
  'decor-suvash-arch-02',
  'STG-SUVASH-002',
  'Celestial Roman Arch Stage',
  'Stage',
  'Bespoke architectural curved arches illuminated with warm Edison pendants, ivory draping, and blush rose floral gardens.',
  115000,
  'Live',
  'company-3',
  'Work Suvash',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  '["Wedding", "Reception", "Sangeet"]'::jsonb,
  'Triple Curved Roman Arch',
  '{"width_ft": 28, "height_ft": 14, "summary": "28 × 14 ft"}'::jsonb,
  '{
    "inclusions": ["Triple Arches", "Warm Edison Lights", "Blush Florals"],
    "colours": ["Blush Pink", "Warm Ivory", "Matte Gold"],
    "style": "Modern Minimalist",
    "setup_styles": ["Modern Minimalist", "Floral", "Romantic"],
    "priceUnit": "Per Event",
    "floral": {
      "style": "Blush Roses & Baby Breath Mix",
      "varietyType": "Mixed (Fresh & Silk)",
      "flowers": [
        {"name": "Blush Garden Rose", "kind": "Fresh", "colour": "Pink"},
        {"name": "Gypsophila (Baby Breath)", "kind": "Fresh", "colour": "White"}
      ]
    }
  }'::jsonb,
  '[
    {"name": "Triple Roman Arch Structure", "category": "Base Structure", "price": 60000},
    {"name": "Floral Garden Installation", "category": "Florals", "price": 30000},
    {"name": "Edison Cluster & Uplighting", "category": "Lighting", "price": 15000},
    {"name": "Curved Stage Furniture", "category": "Furniture", "price": 10000}
  ]'::jsonb,
  18
),
(
  'decor-everest-crystal-03',
  'STG-EVEREST-003',
  'Grand Crystal Chandelier Stage',
  'Stage',
  'Majestic grand stage setup with suspended Austrian crystal chandeliers, gloss reflective mirror aisle, and cascading floral hedge.',
  145000,
  'Live',
  'company-1',
  'Everest Events & Decor',
  'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  '["Wedding", "Reception"]'::jsonb,
  'Rigged Truss & Crystal Canopy',
  '{"width_ft": 32, "height_ft": 16, "summary": "32 × 16 ft"}'::jsonb,
  '{
    "inclusions": ["5 Crystal Chandeliers", "Mirror Reflection Aisle", "White Orchids"],
    "colours": ["Crystal White", "Champagne Gold", "Silver"],
    "style": "Royal Roman Luxury",
    "setup_styles": ["Royal Roman Luxury", "Glamour", "Contemporary"],
    "priceUnit": "Per Event"
  }'::jsonb,
  '[
    {"name": "Rigged Truss & Mirror Stage", "category": "Base Structure", "price": 70000},
    {"name": "Austrian Crystal Chandeliers", "category": "Lighting", "price": 35000},
    {"name": "Full Width Floral Hedge", "category": "Florals", "price": 25000},
    {"name": "Luxury Loveseat & Accent Stands", "category": "Furniture", "price": 15000}
  ]'::jsonb,
  31
),
(
  'decor-suvash-mandap-04',
  'MND-SUVASH-004',
  'Vedic Golden Dome Marigold Mandap',
  'Mandap',
  'Sacred 4-pillar Vedic Mandap topped with a dense golden marigold flower dome, brass oil kalash lanterns, and havan enclosure.',
  75000,
  'Live',
  'company-3',
  'Work Suvash',
  'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  '["Wedding", "Bratabandha", "Puja"]'::jsonb,
  '4-Pillar Carved Vedic Mandap',
  '{"width_ft": 16, "height_ft": 12, "depth_ft": 16, "summary": "16 × 12 ft"}'::jsonb,
  '{
    "inclusions": ["4 Golden Pillars", "Fresh Marigold Dome", "Sacred Havan Pit"],
    "colours": ["Golden Yellow", "Saffron Red", "Vermillion"],
    "style": "Vedic Traditional",
    "setup_styles": ["Vedic Traditional", "Floral", "Cultural"],
    "priceUnit": "Per Event"
  }'::jsonb,
  '[
    {"name": "Carved Wooden Mandap Pillars", "category": "Base Structure", "price": 40000},
    {"name": "Fresh Marigold & Jasmine Dome", "category": "Florals", "price": 25000},
    {"name": "Brass Ceremonial Set & Low Seats", "category": "Furniture", "price": 10000}
  ]'::jsonb,
  42
),
(
  'decor-everest-mandap-05',
  'MND-EVEREST-005',
  'Royal Carved Wooden Mandap',
  'Mandap',
  'Handcrafted teakwood pillars with intricate heritage carvings, overhead floral mesh, and ceremonial seating for the couple and priest.',
  98000,
  'Live',
  'company-1',
  'Everest Events & Decor',
  'https://images.unsplash.com/photo-1545232979-fbf68fe9b1af?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1545232979-fbf68fe9b1af?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  '["Wedding", "Religious Ceremonies"]'::jsonb,
  'Antique Wooden Heritage Mandap',
  '{"width_ft": 18, "height_ft": 14, "depth_ft": 18, "summary": "18 × 14 ft"}'::jsonb,
  '{
    "inclusions": ["Carved Teak Pillars", "Overhead Floral Lattice", "Brass Diya Stands"],
    "colours": ["Teak Brown", "Crimson Red", "Gold"],
    "style": "Heritage Royal",
    "setup_styles": ["Heritage Royal", "Cultural"],
    "priceUnit": "Per Event"
  }'::jsonb,
  '[
    {"name": "Heritage Teakwood Pillars & Beams", "category": "Base Structure", "price": 55000},
    {"name": "Overhead Floral Mesh & Hanging Bells", "category": "Florals", "price": 28000},
    {"name": "Low Floor Cushions & Brass Accessories", "category": "Furniture", "price": 15000}
  ]'::jsonb,
  15
),
(
  'decor-orchid-entrance-06',
  'ENT-ORCHID-006',
  'Grand Floral Tunnel Gateway',
  'Entrance',
  'A 30-foot walk-through tunnel of lush greenery, hanging wisteria, fairy lights, and elevated pedestals with floral urns.',
  48000,
  'Live',
  'company-2',
  'Royal Orchid Events',
  'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  '["Wedding", "Reception", "Engagement"]'::jsonb,
  'Arch Tunnel Structure',
  '{"width_ft": 10, "height_ft": 11, "depth_ft": 30, "summary": "10 × 30 ft"}'::jsonb,
  '{
    "inclusions": ["Tunnel Arches", "Hanging Wisteria", "Warm Fairy Lights"],
    "colours": ["Emerald Green", "White Wisteria", "Warm Glow"],
    "style": "Floral Enchanted",
    "setup_styles": ["Floral Enchanted", "Romantic"],
    "priceUnit": "Per Event"
  }'::jsonb,
  '[
    {"name": "Steel Modular Tunnel Arches", "category": "Base Structure", "price": 24000},
    {"name": "Wisteria & Foliage Installation", "category": "Florals", "price": 16000},
    {"name": "Fairy Light String Canopy", "category": "Lighting", "price": 8000}
  ]'::jsonb,
  29
),
(
  'decor-suvash-entrance-07',
  'ENT-SUVASH-007',
  'Moroccan Lantern & Draped Archway',
  'Entrance',
  'Exquisite multi-tiered archway draped in ivory chiffon, flanked by tall brass Moroccan filigree lanterns with pillar candles.',
  36000,
  'Live',
  'company-3',
  'Work Suvash',
  'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  '["Wedding", "Reception", "Sangeet"]'::jsonb,
  'Draped Geometric Arch',
  '{"width_ft": 12, "height_ft": 10, "summary": "12 × 10 ft"}'::jsonb,
  '{
    "inclusions": ["Geometric Arch", "Ivory Chiffon", "12 Moroccan Lanterns"],
    "colours": ["Ivory", "Brass Gold", "Amber"],
    "style": "Bohemian Luxe",
    "setup_styles": ["Bohemian Luxe", "Moroccan", "Romantic"],
    "priceUnit": "Per Event"
  }'::jsonb,
  '[
    {"name": "Geometric Metal Arch Frame", "category": "Base Structure", "price": 18000},
    {"name": "Set of 12 Brass Filigree Lanterns", "category": "Lighting", "price": 10000},
    {"name": "Foliage Cluster & Chiffon Draping", "category": "Florals", "price": 8000}
  ]'::jsonb,
  22
),
(
  'decor-bloom-boho-08',
  'PBO-BLOOM-008',
  'Boho Pampas & Neon Glam Photobooth',
  'Photobooth',
  'Double circular hoop dressed with fluffy dried pampas grass, blush peonies, warm Edison bulbs, and customizable neon signage.',
  28000,
  'Live',
  'company-4',
  'Lalitpur Bloom Studios',
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  '["Engagement", "Reception", "Birthday", "Mehendi"]'::jsonb,
  'Double Circular Hoop Arch',
  '{"width_ft": 10, "height_ft": 8, "summary": "10 × 8 ft"}'::jsonb,
  '{
    "inclusions": ["Double Hoop", "Pampas Clusters", "Custom Neon Text", "Edison Bulbs"],
    "colours": ["Natural Sand", "Blush Pink", "Warm Amber"],
    "style": "Boho Chic",
    "setup_styles": ["Boho Chic", "Floral", "Modern Minimalist"],
    "priceUnit": "Per Event"
  }'::jsonb,
  '[
    {"name": "Double Metal Hoop Frame", "category": "Base Structure", "price": 12000},
    {"name": "Dried Pampas & Silk Flower Cluster", "category": "Florals", "price": 10000},
    {"name": "Neon Sign & Edison Wiring", "category": "Lighting", "price": 6000}
  ]'::jsonb,
  53
),
(
  'decor-everest-moon-09',
  'PBO-EVEREST-009',
  'Vintage Floral Crescent Moon Photobooth',
  'Photobooth',
  'Giant 8-foot crescent moon structure covered in fresh white roses and eucalyptus leaves, paired with a starlit dark velvet backdrop.',
  34000,
  'Live',
  'company-1',
  'Everest Events & Decor',
  'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  '["Engagement", "Wedding", "Sangeet"]'::jsonb,
  'Crescent Moon Frame & Backdrop',
  '{"width_ft": 10, "height_ft": 9, "summary": "10 × 9 ft"}'::jsonb,
  '{
    "inclusions": ["Crescent Moon Bench", "Fresh Rose Vines", "Starlit Curtains"],
    "colours": ["Moon White", "Eucalyptus Green", "Deep Navy"],
    "style": "Celestial Romance",
    "setup_styles": ["Celestial Romance", "Romantic"],
    "priceUnit": "Per Event"
  }'::jsonb,
  '[
    {"name": "Structural Moon Frame & Seating Bench", "category": "Base Structure", "price": 16000},
    {"name": "Fresh White Rose & Foliage Vines", "category": "Florals", "price": 12000},
    {"name": "Fairy Light Starlight Curtain", "category": "Lighting", "price": 6000}
  ]'::jsonb,
  38
),
(
  'decor-orchid-table-10',
  'TBL-ORCHID-010',
  'Imperial Banquet Table & Candelabras',
  'Table',
  'Head table dining setup with a continuous 20-foot elevated fresh floral bridge, crystal candelabras, and gold charger plates.',
  26000,
  'Live',
  'company-2',
  'Royal Orchid Events',
  'https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  '["Wedding Reception", "VIP Banquet", "Anniversary"]'::jsonb,
  'Banquet Bridge Runner Structure',
  '{"width_ft": 20, "height_ft": 3.5, "summary": "20 ft Length"}'::jsonb,
  '{
    "inclusions": ["Elevated Flower Bridge", "6 Crystal Candelabras", "Gold Charger Place Settings"],
    "colours": ["Blush", "Burgundy", "Antique Gold"],
    "style": "Royal Roman Luxury",
    "setup_styles": ["Royal Roman Luxury", "Formal"],
    "priceUnit": "Per Table"
  }'::jsonb,
  '[
    {"name": "Elevated Acrylic Bridge Risers", "category": "Base Structure", "price": 10000},
    {"name": "Dense Hydrangea & Rose Garland", "category": "Florals", "price": 10000},
    {"name": "Crystal 5-Arm Candelabras", "category": "Lighting", "price": 6000}
  ]'::jsonb,
  19
),
(
  'decor-suvash-fairy-11',
  'BD-SUVASH-011',
  'Pastel Draped Fairy Light Backdrop',
  'Backdrops',
  'Cascading flowing chiffon fabric in soft blush and ivory, backed with a dense wall of warm twinkling fairy lights and floral tie-backs.',
  38000,
  'Live',
  'company-3',
  'Work Suvash',
  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  '["Wedding", "Reception", "Engagement", "Photo Area"]'::jsonb,
  'Pipe & Drape System',
  '{"width_ft": 24, "height_ft": 12, "summary": "24 × 12 ft"}'::jsonb,
  '{
    "inclusions": ["Pipe & Drape Truss", "Triple Layer Chiffon", "1000 LED Warm Micro Lights"],
    "colours": ["Soft Blush", "Pure Ivory", "Warm Gold"],
    "style": "Romantic Classic",
    "setup_styles": ["Romantic Classic", "Modern Minimalist"],
    "priceUnit": "Per Event"
  }'::jsonb,
  '[
    {"name": "Heavy Duty Telescopic Pipe Truss", "category": "Base Structure", "price": 16000},
    {"name": "High Density LED Fairy Light Matrix", "category": "Lighting", "price": 12000},
    {"name": "Layered Chiffon & Silk Rose Clusters", "category": "Florals", "price": 10000}
  ]'::jsonb,
  45
),
(
  'decor-bloom-blossom-12',
  'ENT-BLOOM-012',
  'Cherry Blossom Garden Walkway',
  'Entrance',
  'Enchanting Japanese-inspired walkway lined with full-bloom silk cherry blossom trees, Japanese stone lanterns, and petal carpets.',
  42000,
  'Live',
  'company-4',
  'Lalitpur Bloom Studios',
  'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  '["Wedding Reception", "Mehendi & Sangeet", "Cocktail Night"]'::jsonb,
  'Arched Blossom Tree Avenue',
  '{"width_ft": 12, "height_ft": 10, "depth_ft": 24, "summary": "12 × 24 ft"}'::jsonb,
  '{
    "inclusions": ["8 Cherry Blossom Trees", "Pathway Spotlights", "Rose Petal Carpet"],
    "colours": ["Sakura Pink", "Snow White", "Garden Green"],
    "style": "Floral Enchanted",
    "setup_styles": ["Floral Enchanted", "Contemporary"],
    "priceUnit": "Per Event"
  }'::jsonb,
  '[
    {"name": "8 Steel Weighted Blossom Trees", "category": "Base Structure", "price": 22000},
    {"name": "Silk Blossom Foliage & Petals", "category": "Florals", "price": 12000},
    {"name": "Low Angle In-Ground Uplights", "category": "Lighting", "price": 8000}
  ]'::jsonb,
  27
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  status = EXCLUDED.status,
  company_id = EXCLUDED.company_id,
  company_name = EXCLUDED.company_name,
  image_url = EXCLUDED.image_url,
  images = EXCLUDED.images,
  applicable_events = EXCLUDED.applicable_events,
  structure_type = EXCLUDED.structure_type,
  dimensions = EXCLUDED.dimensions,
  specifications = EXCLUDED.specifications,
  components = EXCLUDED.components,
  booking_count = EXCLUDED.booking_count,
  updated_at = now();

-- ------------------------------------------------------------------------------
-- 4. USER ENQUIRIES / INBOUND LEADS (Client Data, Photos & Events)
-- ------------------------------------------------------------------------------
INSERT INTO public.enquiries (
  id,
  client_name,
  phone,
  whatsapp_number,
  email,
  location,
  source,
  ceremony_type,
  date_bs,
  date_ad,
  date_iso,
  venue,
  availability_status,
  availability_summary,
  status,
  order_type,
  estimated_budget_npr,
  package_tier,
  time_slot,
  guest_count,
  assigned_handler,
  reference_images,
  events,
  created_at
) VALUES
(
  'enq-aarav-sharma',
  'Aarav Sharma',
  '+977 9801987654',
  '+977 9801987654',
  'aarav.sharma@gmail.com',
  'Kathmandu',
  'Website',
  'Wedding Reception',
  '2083-02-18 BS',
  'Jun 1, 2026',
  '2026-06-01',
  'Soaltee Hotel Grand Ballroom, Tahachal',
  'free',
  'Date open across all crew slots',
  'unreviewed',
  'quotation-request',
  175000,
  'Premium Luxury',
  'Evening (5:00 PM - 10:30 PM)',
  600,
  'Suvash Shrestha',
  '["https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  '[
    {
      "ceremonyName": "Wedding Reception",
      "date": "2083-02-18 BS",
      "venue": "Soaltee Grand Ballroom",
      "decorationId": "decor-suvash-arch-02",
      "decorationTitle": "Celestial Roman Arch Stage",
      "companyId": "company-3",
      "companyName": "Work Suvash",
      "budget": 115000,
      "inclusions": ["Triple Arches", "Warm Edison Lights", "Blush Florals"],
      "image": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80"
    }
  ]'::jsonb,
  now() - interval '2 hours'
),
(
  'enq-priya-adhikari',
  'Priya Adhikari',
  '+977 9841567890',
  '+977 9841567890',
  'priya.adhikari@yahoo.com',
  'Lalitpur',
  'Instagram',
  'Engagement Ceremony',
  '2083-03-05 BS',
  'Jun 18, 2026',
  '2026-06-18',
  'Heritage Garden, Sanepa',
  'free',
  'Venue confirmed available',
  'interested',
  'quotation-request',
  95000,
  'Boutique Aesthetic',
  'Afternoon (11:00 AM - 4:00 PM)',
  250,
  'Pooja Gurung',
  '["https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  '[
    {
      "ceremonyName": "Ring Exchange & Lunch",
      "date": "2083-03-05 BS",
      "venue": "Heritage Courtyard Hall",
      "decorationId": "decor-bloom-boho-08",
      "decorationTitle": "Boho Pampas & Neon Glam Photobooth",
      "companyId": "company-4",
      "companyName": "Lalitpur Bloom Studios",
      "budget": 28000,
      "inclusions": ["Double Hoop", "Pampas Clusters", "Neon Sign"],
      "image": "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80"
    }
  ]'::jsonb,
  now() - interval '6 hours'
),
(
  'enq-rohan-anjali',
  'Rohan Shrestha',
  '+977 9851087654',
  '+977 9851087654',
  'rohan.shrestha@outlook.com',
  'Kathmandu',
  'Referral',
  'Traditional Biwaha & Sacred Mandap',
  '2083-01-28 BS',
  'May 11, 2026',
  '2026-05-11',
  'Hyatt Regency, Bouddha',
  'free',
  'High priority auspicious date',
  'quotation_created',
  'quotation-request',
  240000,
  'Royal Vedic Package',
  'Full Day Event',
  750,
  'Sunil Shrestha',
  '["https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  '[
    {
      "ceremonyName": "Biwaha Pooja & Havan",
      "date": "2083-01-28 BS",
      "venue": "Hyatt Regency Garden Lawn",
      "decorationId": "decor-suvash-mandap-04",
      "decorationTitle": "Vedic Golden Dome Marigold Mandap",
      "companyId": "company-3",
      "companyName": "Work Suvash",
      "budget": 75000,
      "image": "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80"
    },
    {
      "ceremonyName": "Grand Evening Reception",
      "date": "2083-01-28 BS",
      "venue": "Hyatt Regency Grand Ballroom",
      "decorationId": "decor-everest-crystal-03",
      "decorationTitle": "Grand Crystal Chandelier Stage",
      "companyId": "company-1",
      "companyName": "Everest Events & Decor",
      "budget": 145000,
      "image": "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=800&q=80"
    }
  ]'::jsonb,
  now() - interval '1 day'
),
(
  'enq-sneha-karki',
  'Sneha Karki',
  '+977 9813456789',
  '+977 9813456789',
  'sneha.karki@gmail.com',
  'Kathmandu',
  'Facebook',
  'Mehendi & Sangeet Night',
  '2083-02-12 BS',
  'May 26, 2026',
  '2026-05-26',
  'Alice Receptions, Gairidhara',
  'free',
  'Slot confirmed free',
  'unreviewed',
  'quotation-request',
  110000,
  'Vibrant Bohemian',
  'Evening (4:00 PM - 10:00 PM)',
  300,
  'Suvash Shrestha',
  '["https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  '[
    {
      "ceremonyName": "Sangeet Dance Floor & Backdrop",
      "date": "2083-02-12 BS",
      "venue": "Alice Receptions Main Hall",
      "decorationId": "decor-suvash-fairy-11",
      "decorationTitle": "Pastel Draped Fairy Light Backdrop",
      "companyId": "company-3",
      "companyName": "Work Suvash",
      "budget": 38000,
      "image": "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80"
    }
  ]'::jsonb,
  now() - interval '2 days'
),
(
  'enq-ram-thapa',
  'Ram Thapa',
  '+977 9801234567',
  '+977 9801234567',
  'ram.thapa@gmail.com',
  'Kathmandu',
  'Website',
  'Wedding Reception',
  '2083-02-15 BS',
  'May 29, 2026',
  '2026-05-29',
  'Soaltee Hotel, Tahachal',
  'free',
  'Date open',
  'unreviewed',
  'quotation-request',
  150000,
  'Standard',
  'Evening (5:00 PM - 10:00 PM)',
  500,
  'Sunil Shrestha',
  '["https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  '[
    {
      "ceremonyName": "Wedding Reception",
      "date": "2083-02-15 BS",
      "venue": "Soaltee Grand Ballroom",
      "decorationId": "decor-royal-stage-01",
      "decorationTitle": "Grand Royal Stage",
      "companyName": "Royal Orchid Events",
      "budget": 85000,
      "inclusions": ["Grand Roman Arch", "Floral Setup", "Carpet"],
      "style": "Royal Roman Luxury",
      "colours": "Magenta & White Orchid",
      "dimensions": "24 × 14 ft",
      "priceUnit": "Per Event",
      "image": "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80"
    }
  ]'::jsonb,
  now() - interval '3 days'
)
ON CONFLICT (id) DO UPDATE SET
  client_name = EXCLUDED.client_name,
  phone = EXCLUDED.phone,
  whatsapp_number = EXCLUDED.whatsapp_number,
  email = EXCLUDED.email,
  location = EXCLUDED.location,
  ceremony_type = EXCLUDED.ceremony_type,
  date_bs = EXCLUDED.date_bs,
  date_ad = EXCLUDED.date_ad,
  venue = EXCLUDED.venue,
  status = EXCLUDED.status,
  estimated_budget_npr = EXCLUDED.estimated_budget_npr,
  events = EXCLUDED.events,
  reference_images = EXCLUDED.reference_images;

-- ------------------------------------------------------------------------------
-- 5. BOOKED CLIENTS / CONFIRMED BOOKINGS
-- ------------------------------------------------------------------------------
INSERT INTO public.booked_clients (
  id,
  client_name,
  phone,
  whatsapp,
  email,
  event_type,
  event_date,
  venue,
  stage,
  payment_status,
  total_amount,
  paid_amount,
  balance_due,
  proposal_id,
  enquiry_id,
  company_id,
  ceremonies,
  created_at
) VALUES
(
  'booking-bikram-rai',
  'Bikram Rai',
  '+977 9849876543',
  '+977 9849876543',
  'bikram.rai@hotmail.com',
  'Wedding Ceremony',
  '2083-01-28',
  'Hyatt Regency, Bouddha',
  'confirmed',
  'partial',
  135000,
  65000,
  70000,
  'prop-bikram-2026',
  'enq-ram-thapa',
  'company-2',
  '[
    {
      "ceremonyName": "Traditional Biwaha & Grand Stage",
      "date": "2083-01-28",
      "venue": "Hyatt Regency Grand Ballroom",
      "items": [
        {"name": "Grand Royal Stage", "rate": 85000, "qty": 1, "photo": "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80"},
        {"name": "Grand Floral Tunnel Gateway", "rate": 48000, "qty": 1, "photo": "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=600&q=80"}
      ],
      "dayTotal": 133000
    }
  ]'::jsonb,
  now() - interval '4 days'
),
(
  'booking-kishor-sharma',
  'Kishor Sharma',
  '+977 9802345678',
  '+977 9802345678',
  'kishor.sharma@gmail.com',
  'Wedding Reception',
  '2083-02-05',
  'Soaltee Hotel Grand Ballroom',
  'delivered',
  'paid',
  210000,
  210000,
  0,
  'prop-kishor-2026',
  'enq-aarav-sharma',
  'company-3',
  '[
    {
      "ceremonyName": "Reception Gala",
      "date": "2083-02-05",
      "venue": "Soaltee Grand Ballroom",
      "items": [
        {"name": "Celestial Roman Arch Stage", "rate": 115000, "qty": 1, "photo": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80"},
        {"name": "Moroccan Lantern & Draped Archway", "rate": 36000, "qty": 1, "photo": "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=600&q=80"},
        {"name": "Pastel Draped Fairy Light Backdrop", "rate": 38000, "qty": 1, "photo": "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=600&q=80"}
      ],
      "dayTotal": 189000
    }
  ]'::jsonb,
  now() - interval '12 days'
),
(
  'booking-samir-shrestha',
  'Samir Shrestha',
  '+977 9811223344',
  '+977 9811223344',
  'samir.shrestha@yahoo.com',
  'Engagement Party',
  '2083-02-22',
  'Heritage Garden, Sanepa',
  'setup_scheduled',
  'partial',
  88000,
  30000,
  58000,
  'prop-samir-2026',
  'enq-priya-adhikari',
  'company-4',
  '[
    {
      "ceremonyName": "Boho Chic Engagement",
      "date": "2083-02-22",
      "venue": "Heritage Courtyard Hall",
      "items": [
        {"name": "Boho Pampas & Neon Glam Photobooth", "rate": 28000, "qty": 1, "photo": "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=600&q=80"},
        {"name": "Cherry Blossom Garden Walkway", "rate": 42000, "qty": 1, "photo": "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80"}
      ],
      "dayTotal": 70000
    }
  ]'::jsonb,
  now() - interval '8 days'
)
ON CONFLICT (id) DO UPDATE SET
  client_name = EXCLUDED.client_name,
  phone = EXCLUDED.phone,
  total_amount = EXCLUDED.total_amount,
  paid_amount = EXCLUDED.paid_amount,
  balance_due = EXCLUDED.balance_due,
  stage = EXCLUDED.stage,
  payment_status = EXCLUDED.payment_status,
  ceremonies = EXCLUDED.ceremonies;

-- ------------------------------------------------------------------------------
-- 6. PAYMENT QR ACCOUNTS
-- ------------------------------------------------------------------------------
INSERT INTO public.payment_qrs (
  id,
  owner_name,
  label,
  account_number,
  image,
  display_order
) VALUES
(
  'qr-worksuvash-fonepay',
  'Work Suvash Events Pvt. Ltd.',
  'Fonepay / Nabil Bank QR',
  '01901017500123',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
  1
),
(
  'qr-everest-esewa',
  'Everest Events & Decor',
  'eSewa Merchant QR',
  '9851023456',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
  2
),
(
  'qr-royalorchid-nic',
  'Royal Orchid Events Nepal',
  'NIC Asia Corporate QR',
  '2440501234567890',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
  3
)
ON CONFLICT (id) DO UPDATE SET
  owner_name = EXCLUDED.owner_name,
  label = EXCLUDED.label,
  image = EXCLUDED.image;
