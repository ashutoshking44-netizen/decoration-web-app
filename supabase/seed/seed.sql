-- ==============================================================================
-- SUPABASE SEED DATA FOR TESTING & LOCAL DEVELOPMENT
-- ==============================================================================
-- Populates companies, catalog decorations, sample enquiries, and bookings.
-- Safe to re-run: uses ON CONFLICT DO UPDATE.
-- ==============================================================================

-- 1. COMPANY PROFILES
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
  'Royal Orchid Events & Décor',
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
  'grand-celebrations',
  'Grand Celebrations Décor',
  'Modern Minimalist & Luxury Stage Aesthetics',
  '+977 9851098765',
  'contact@grandcelebrations.com.np',
  'Jhamsikhel, Lalitpur',
  'Lalitpur',
  'https://grandcelebrations.com.np',
  '{"instagram": "https://instagram.com/grandcelebrations"}'::jsonb,
  '{"primary": "#1E293B", "secondary": "#475569", "accent": "#0EA5E9"}'::jsonb,
  '{"currency": "NPR", "taxRate": 0.13}'::jsonb
)
ON CONFLICT (company_id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  tagline = EXCLUDED.tagline,
  contact_phone = EXCLUDED.contact_phone;

-- 2. DECORATIONS CATALOG
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
  applicable_events,
  structure_type,
  dimensions,
  specifications,
  components
) VALUES
(
  'decor-royal-stage-01',
  'STG-ROYAL-001',
  'Grand Royal Stage',
  'Stage',
  'Luxurious Roman Arch stage with imported magenta & white orchid arrangements, royal velvet carpeting, and chandelier platform lighting.',
  85000,
  'Live',
  'royal-orchid',
  'Royal Orchid Events & Décor',
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
  '["Wedding", "Reception", "Engagement"]'::jsonb,
  'Roman Arch Truss Structure',
  '{"width": "24 ft", "height": "14 ft", "depth": "12 ft"}'::jsonb,
  '{"inclusions": ["Grand Roman Arch", "Floral Setup", "Carpet"], "colours": "Magenta & White Orchid", "style": "Royal Roman Luxury", "priceUnit": "Per Event"}'::jsonb,
  '[
    {"name": "Base Arch & Drapes", "category": "Base Structure", "price": 45000, "description": "24x14ft Roman Arch with premium draped backdrop"},
    {"name": "Hydraulic Carpeted Platform", "category": "Platform", "price": 15000, "description": "Triple-tier stage with royal red carpet"},
    {"name": "Warm LED Warm Ambient & Spot", "category": "Lighting", "price": 10000, "description": "8 Warm spot lights and uplighting truss"},
    {"name": "Dual Royal Maharaja Throne", "category": "Furniture", "price": 15000, "description": "Gold leaf finish upholstered royal chairs"}
  ]'::jsonb
),
(
  'decor-mandap-luxury-02',
  'MND-LUX-002',
  'Traditional Golden Dome Mandap',
  'Mandap',
  'Traditional 4-pillar Vedic Mandap with fresh marigold floral dome, brass ceremonial lamps, and holy fire pit enclosure.',
  65000,
  'Live',
  'royal-orchid',
  'Royal Orchid Events & Décor',
  'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
  '["Wedding", "Bratabandha"]'::jsonb,
  'Traditional 4-Pillar Sacred Mandap',
  '{"width": "16 ft", "height": "12 ft", "depth": "16 ft"}'::jsonb,
  '{"inclusions": ["4 Carved Pillars", "Fresh Marigold Dome", "Havankund"], "colours": "Golden Yellow & Red", "style": "Vedic Traditional"}'::jsonb,
  '[
    {"name": "Carved Wooden Pillars", "category": "Base Structure", "price": 35000},
    {"name": "Fresh Floral Dome", "category": "Florals", "price": 20000},
    {"name": "Traditional Pooja Seats & Enclosure", "category": "Furniture", "price": 10000}
  ]'::jsonb
),
(
  'decor-photo-booth-03',
  'PBO-BOHO-003',
  'Boho Floral Photobooth',
  'Photobooth',
  'Chic circular wooden arch with pampas grass, pastel garden roses, custom neon name signage, and Edison bulb accents.',
  28000,
  'Live',
  'royal-orchid',
  'Royal Orchid Events & Décor',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
  '["Engagement", "Reception", "Birthday", "Sangeet"]'::jsonb,
  'Circular Wooden Arch',
  '{"width": "10 ft", "height": "8 ft"}'::jsonb,
  '{"inclusions": ["Circular Arch", "Pampas Floral Cluster", "Neon Sign", "Warm Lights"]}'::jsonb,
  '[]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  status = EXCLUDED.status,
  components = EXCLUDED.components;

-- 3. SAMPLE ENQUIRIES
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
  venue,
  status,
  estimated_budget_npr,
  time_slot,
  guest_count,
  assigned_handler,
  events
) VALUES
(
  'enq-ram-thapa',
  'Ram Thapa',
  '+977 9801234567',
  '+977 9801234567',
  'ram.thapa@gmail.com',
  'Kathmandu',
  'Website',
  'Wedding Reception',
  '2083-02-15',
  '2026-05-29',
  'Soaltee Hotel, Tahachal',
  'unreviewed',
  150000,
  'Evening (5:00 PM - 10:00 PM)',
  500,
  'Bikash Shrestha',
  '[
    {
      "ceremonyName": "Wedding Reception",
      "date": "2083-02-15",
      "venue": "Soaltee Grand Ballroom",
      "decorationId": "decor-royal-stage-01",
      "decorationTitle": "Grand Royal Stage",
      "budget": 85000
    }
  ]'::jsonb
),
(
  'enq-sita-sharma',
  'Sita Sharma',
  '+977 9812345678',
  '+977 9812345678',
  'sita.sharma@outlook.com',
  'Lalitpur',
  'Instagram',
  'Engagement Ceremony',
  '2083-03-01',
  '2026-06-14',
  'Heritage Garden, Sanepa',
  'unreviewed',
  80000,
  'Day (11:00 AM - 4:00 PM)',
  250,
  'Pooja Gurung',
  '[
    {
      "ceremonyName": "Ring Exchange & Lunch",
      "date": "2083-03-01",
      "venue": "Courtyard Hall",
      "decorationId": "decor-photo-booth-03",
      "decorationTitle": "Boho Floral Photobooth",
      "budget": 28000
    }
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  client_name = EXCLUDED.client_name,
  phone = EXCLUDED.phone,
  status = EXCLUDED.status;

-- 4. BOOKED CLIENTS / CONFIRMED BOOKINGS
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
  ceremonies
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
  'advance_received',
  113000,
  50000,
  63000,
  'prop-bikram-2026',
  'enq-ram-thapa',
  'royal-orchid',
  '[
    {
      "ceremonyName": "Traditional Biwaha & Stage",
      "date": "2083-01-28",
      "items": [
        {"name": "Grand Royal Stage", "rate": 85000, "qty": 1},
        {"name": "Boho Floral Photobooth", "rate": 28000, "qty": 1}
      ],
      "dayTotal": 113000
    }
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  client_name = EXCLUDED.client_name,
  total_amount = EXCLUDED.total_amount,
  paid_amount = EXCLUDED.paid_amount,
  balance_due = EXCLUDED.balance_due;
