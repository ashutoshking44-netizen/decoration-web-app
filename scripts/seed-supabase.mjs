import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const { Client } = pg;
const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, "../.env");

// Load .env
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2]?.replace(/^['"](.*)['"]$/, "$1") || "";
    }
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_USER = process.env.DB_USER || "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME || "postgres";

async function seedViaPg(sqlContent) {
  console.log(`Connecting directly to PostgreSQL at ${DB_HOST}:${DB_PORT}...`);
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected successfully! Executing seed script...");
    await client.query(sqlContent);
    console.log("✅ Seed executed successfully via direct PostgreSQL connection!");
  } finally {
    await client.end();
  }
}

async function seedViaRest() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  }

  console.log(`Seeding via Supabase REST client: ${supabaseUrl}...`);
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Company profiles
  const companyProfiles = [
    {
      id: "company-3",
      name: "Work Suvash",
      owner_name: "Suvash Shrestha",
      phone: "+977 9801234567",
      email: "worksuvash@gmail.com",
      city: "Kathmandu",
      services: [
        "Floral Decoration",
        "Stage & Mandap Setup",
        "Lighting & Effects",
        "Theme & Prop Styling",
      ],
      event_types: ["Weddings", "Receptions", "Mehendi & Haldi", "Engagements"],
      team_size: "16–40",
      years_active: "4–7 years",
      about:
        "Bespoke wedding and celebration styling studio. Modern Roman arches, warm ambient illumination, and vibrant ceremonial floral artistry.",
    },
    {
      id: "company-1",
      name: "Everest Events & Decor",
      owner_name: "Sunil Shrestha",
      phone: "+977 9851023456",
      email: "hello@everestevents.com",
      city: "Kathmandu",
      services: [
        "Floral Decoration",
        "Stage & Mandap Setup",
        "Lighting & Effects",
        "Outdoor / Tent Setup",
      ],
      event_types: ["Weddings", "Receptions", "Engagements", "Corporate Events"],
      team_size: "40+",
      years_active: "8+ years",
      about:
        "Nepal premier luxury event & destination wedding decorators. Specialized in regal stages, fresh imported orchid arches, and crystal chandeliers.",
    },
    {
      id: "company-2",
      name: "Royal Orchid Events",
      owner_name: "Pooja Gurung",
      phone: "+977 9841234567",
      email: "info@royalorchid.com.np",
      city: "Lalitpur",
      services: [
        "Stage & Mandap Setup",
        "Floral Decoration",
        "Fabric & Draping",
        "Table & Seating Setup",
      ],
      event_types: ["Weddings", "Receptions", "Engagements"],
      team_size: "16–40",
      years_active: "4–7 years",
      about:
        "Crafting royal celebration aesthetics with grand hydraulic platforms, traditional Vedic mandaps, and bespoke banquet styling.",
    },
    {
      id: "company-4",
      name: "Lalitpur Bloom Studios",
      owner_name: "Bikash KC",
      phone: "+977 9860123456",
      email: "bikash.kc@bloomstudios.com",
      city: "Lalitpur",
      services: ["Floral Decoration", "Entrance & Pathway Decor", "Theme & Prop Styling"],
      event_types: ["Weddings", "Engagements", "Birthdays"],
      team_size: "6–15",
      years_active: "1–3 years",
      about:
        "Boutique floral design workshop known for aesthetic boho pampas grass photobooths, neon custom signs, and dreamy entryway tunnels.",
    },
    {
      id: "default",
      name: "Everest Events & Decor",
      owner_name: "Sunil Shrestha",
      phone: "+977 9851023456",
      email: "hello@everestevents.com",
      city: "Kathmandu",
      services: ["Floral Decoration", "Stage & Mandap Setup", "Lighting & Effects"],
      event_types: ["Weddings", "Receptions", "Engagements"],
      team_size: "40+",
      years_active: "8+ years",
      about: "Nepal premier luxury event & destination wedding decorators.",
    },
  ];

  const { error: coError } = await supabase
    .from("company_profile")
    .upsert(companyProfiles, { onConflict: "id" });
  if (coError) console.warn("Notice (company_profile):", coError.message);
  else console.log(`✓ Seeded ${companyProfiles.length} company profiles.`);

  // 2. Decorations
  const decorations = [
    {
      id: "decor-royal-stage-01",
      sku: "STG-ROYAL-001",
      name: "Grand Royal Stage",
      category: "Stage",
      description:
        "Luxurious Roman Arch stage with imported magenta & white orchid arrangements, royal velvet carpeting, and chandelier platform lighting.",
      price: 85000,
      status: "Live",
      company_id: "company-2",
      company_name: "Royal Orchid Events",
      image_url:
        "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
      ],
      applicable_events: ["Wedding", "Reception", "Engagement"],
      structure_type: "Roman Arch Truss Structure",
      dimensions: { width_ft: 24, height_ft: 14, summary: "24 × 14 ft" },
      specifications: {
        inclusions: ["Grand Roman Arch", "Floral Setup", "Carpet"],
        colours: ["Magenta", "White Orchid", "Gold"],
        style: "Royal Roman Luxury",
        setup_styles: ["Royal Roman Luxury", "Floral"],
        priceUnit: "Per Event",
      },
      booking_count: 24,
    },
    {
      id: "decor-suvash-arch-02",
      sku: "STG-SUVASH-002",
      name: "Celestial Roman Arch Stage",
      category: "Stage",
      description:
        "Bespoke architectural curved arches illuminated with warm Edison pendants, ivory draping, and blush rose floral gardens.",
      price: 115000,
      status: "Live",
      company_id: "company-3",
      company_name: "Work Suvash",
      image_url:
        "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
      ],
      applicable_events: ["Wedding", "Reception", "Sangeet"],
      structure_type: "Triple Curved Roman Arch",
      dimensions: { width_ft: 28, height_ft: 14, summary: "28 × 14 ft" },
      specifications: {
        inclusions: ["Triple Arches", "Warm Edison Lights", "Blush Florals"],
        colours: ["Blush Pink", "Warm Ivory", "Matte Gold"],
        style: "Modern Minimalist",
        setup_styles: ["Modern Minimalist", "Floral", "Romantic"],
        priceUnit: "Per Event",
      },
      booking_count: 18,
    },
    {
      id: "decor-everest-crystal-03",
      sku: "STG-EVEREST-003",
      name: "Grand Crystal Chandelier Stage",
      category: "Stage",
      description:
        "Majestic grand stage setup with suspended Austrian crystal chandeliers, gloss reflective mirror aisle, and cascading floral hedge.",
      price: 145000,
      status: "Live",
      company_id: "company-1",
      company_name: "Everest Events & Decor",
      image_url:
        "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1200&q=80",
      ],
      applicable_events: ["Wedding", "Reception"],
      structure_type: "Rigged Truss & Crystal Canopy",
      dimensions: { width_ft: 32, height_ft: 16, summary: "32 × 16 ft" },
      specifications: {
        inclusions: ["5 Crystal Chandeliers", "Mirror Reflection Aisle", "White Orchids"],
        colours: ["Crystal White", "Champagne Gold"],
        style: "Royal Roman Luxury",
        setup_styles: ["Royal Roman Luxury", "Glamour"],
        priceUnit: "Per Event",
      },
      booking_count: 31,
    },
    {
      id: "decor-suvash-mandap-04",
      sku: "MND-SUVASH-004",
      name: "Vedic Golden Dome Marigold Mandap",
      category: "Mandap",
      description:
        "Sacred 4-pillar Vedic Mandap topped with a dense golden marigold flower dome, brass oil kalash lanterns, and havan enclosure.",
      price: 75000,
      status: "Live",
      company_id: "company-3",
      company_name: "Work Suvash",
      image_url:
        "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80",
      ],
      applicable_events: ["Wedding", "Bratabandha", "Puja"],
      structure_type: "4-Pillar Carved Vedic Mandap",
      dimensions: { width_ft: 16, height_ft: 12, summary: "16 × 12 ft" },
      specifications: {
        inclusions: ["4 Golden Pillars", "Fresh Marigold Dome", "Sacred Havan Pit"],
        colours: ["Golden Yellow", "Saffron Red"],
        style: "Vedic Traditional",
        setup_styles: ["Vedic Traditional", "Floral"],
        priceUnit: "Per Event",
      },
      booking_count: 42,
    },
    {
      id: "decor-orchid-entrance-06",
      sku: "ENT-ORCHID-006",
      name: "Grand Floral Tunnel Gateway",
      category: "Entrance",
      description:
        "A 30-foot walk-through tunnel of lush greenery, hanging wisteria, fairy lights, and elevated pedestals with floral urns.",
      price: 48000,
      status: "Live",
      company_id: "company-2",
      company_name: "Royal Orchid Events",
      image_url:
        "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80",
      ],
      applicable_events: ["Wedding", "Reception"],
      structure_type: "Arch Tunnel Structure",
      dimensions: { width_ft: 10, height_ft: 11, summary: "10 × 30 ft" },
      specifications: {
        inclusions: ["Tunnel Arches", "Hanging Wisteria", "Warm Fairy Lights"],
        colours: ["Emerald Green", "White Wisteria"],
        style: "Floral Enchanted",
        setup_styles: ["Floral Enchanted", "Romantic"],
        priceUnit: "Per Event",
      },
      booking_count: 29,
    },
    {
      id: "decor-bloom-boho-08",
      sku: "PBO-BLOOM-008",
      name: "Boho Pampas & Neon Glam Photobooth",
      category: "Photobooth",
      description:
        "Double circular hoop dressed with fluffy dried pampas grass, blush peonies, warm Edison bulbs, and customizable neon signage.",
      price: 28000,
      status: "Live",
      company_id: "company-4",
      company_name: "Lalitpur Bloom Studios",
      image_url:
        "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80",
      ],
      applicable_events: ["Engagement", "Reception", "Birthday"],
      structure_type: "Double Circular Hoop Arch",
      dimensions: { width_ft: 10, height_ft: 8, summary: "10 × 8 ft" },
      specifications: {
        inclusions: ["Double Hoop", "Pampas Clusters", "Custom Neon Text"],
        colours: ["Natural Sand", "Blush Pink"],
        style: "Boho Chic",
        setup_styles: ["Boho Chic", "Modern Minimalist"],
        priceUnit: "Per Event",
      },
      booking_count: 53,
    },
    {
      id: "decor-suvash-fairy-11",
      sku: "BD-SUVASH-011",
      name: "Pastel Draped Fairy Light Backdrop",
      category: "Backdrop",
      description:
        "Cascading flowing chiffon fabric in soft blush and ivory, backed with a dense wall of warm twinkling fairy lights and floral tie-backs.",
      price: 38000,
      status: "Live",
      company_id: "company-3",
      company_name: "Work Suvash",
      image_url:
        "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80",
      ],
      applicable_events: ["Wedding", "Reception", "Engagement"],
      structure_type: "Pipe & Drape System",
      dimensions: { width_ft: 24, height_ft: 12, summary: "24 × 12 ft" },
      specifications: {
        inclusions: ["Pipe & Drape Truss", "Triple Layer Chiffon", "Warm LED Lights"],
        colours: ["Soft Blush", "Pure Ivory"],
        style: "Romantic Classic",
        setup_styles: ["Romantic Classic"],
        priceUnit: "Per Event",
      },
      booking_count: 45,
    },
  ];

  const { error: decorError } = await supabase
    .from("decorations")
    .upsert(decorations, { onConflict: "id" });
  if (decorError) console.warn("Notice (decorations):", decorError.message);
  else console.log(`✓ Seeded ${decorations.length} catalog decorations.`);

  // 3. User Enquiries / Inbound Leads
  const enquiries = [
    {
      id: "enq-aarav-sharma",
      client_name: "Aarav Sharma",
      phone: "+977 9801987654",
      whatsapp_number: "+977 9801987654",
      email: "aarav.sharma@gmail.com",
      location: "Kathmandu",
      source: "Website",
      ceremony_type: "Wedding Reception",
      date_bs: "2083-02-18 BS",
      date_ad: "Jun 1, 2026",
      date_iso: "2026-06-01",
      venue: "Soaltee Hotel Grand Ballroom, Tahachal",
      availability_status: "free",
      status: "unreviewed",
      estimated_budget_npr: 175000,
      reference_images: [
        "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80",
      ],
      events: [
        {
          ceremonyName: "Wedding Reception",
          date: "2083-02-18 BS",
          venue: "Soaltee Grand Ballroom",
          decorationId: "decor-suvash-arch-02",
          decorationTitle: "Celestial Roman Arch Stage",
          companyId: "company-3",
          companyName: "Work Suvash",
          budget: 115000,
        },
      ],
    },
    {
      id: "enq-priya-adhikari",
      client_name: "Priya Adhikari",
      phone: "+977 9841567890",
      whatsapp_number: "+977 9841567890",
      email: "priya.adhikari@yahoo.com",
      location: "Lalitpur",
      source: "Instagram",
      ceremony_type: "Engagement Ceremony",
      date_bs: "2083-03-05 BS",
      date_ad: "Jun 18, 2026",
      date_iso: "2026-06-18",
      venue: "Heritage Garden, Sanepa",
      availability_status: "free",
      status: "interested",
      estimated_budget_npr: 95000,
      reference_images: [
        "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80",
      ],
      events: [
        {
          ceremonyName: "Ring Exchange & Lunch",
          date: "2083-03-05 BS",
          venue: "Heritage Courtyard Hall",
          decorationId: "decor-bloom-boho-08",
          decorationTitle: "Boho Pampas & Neon Glam Photobooth",
          companyId: "company-4",
          companyName: "Lalitpur Bloom Studios",
          budget: 28000,
        },
      ],
    },
    {
      id: "enq-ram-thapa",
      client_name: "Ram Thapa",
      phone: "+977 9801234567",
      whatsapp_number: "+977 9801234567",
      email: "ram.thapa@gmail.com",
      location: "Kathmandu",
      source: "Website",
      ceremony_type: "Wedding Reception",
      date_bs: "2083-02-15 BS",
      date_ad: "May 29, 2026",
      venue: "Soaltee Hotel, Tahachal",
      status: "unreviewed",
      estimated_budget_npr: 150000,
      events: [
        {
          ceremonyName: "Wedding Reception",
          date: "2083-02-15 BS",
          venue: "Soaltee Grand Ballroom",
          decorationId: "decor-royal-stage-01",
          decorationTitle: "Grand Royal Stage",
          companyName: "Royal Orchid Events",
          budget: 85000,
          inclusions: ["Grand Roman Arch", "Floral Setup", "Carpet"],
          style: "Royal Roman Luxury",
          colours: "Magenta & White Orchid",
          dimensions: "24 × 14 ft",
          priceUnit: "Per Event",
        },
      ],
    },
  ];

  const { error: enqError } = await supabase
    .from("enquiries")
    .upsert(enquiries, { onConflict: "id" });
  if (enqError) console.warn("Notice (enquiries):", enqError.message);
  else console.log(`✓ Seeded ${enquiries.length} user enquiries.`);

  // 4. Booked Clients
  const bookings = [
    {
      id: "booking-bikram-rai",
      client_name: "Bikram Rai",
      phone: "+977 9849876543",
      whatsapp: "+977 9849876543",
      email: "bikram.rai@hotmail.com",
      event_type: "Wedding Ceremony",
      event_date: "2083-01-28",
      venue: "Hyatt Regency, Bouddha",
      stage: "confirmed",
      payment_status: "partial",
      total_amount: 135000,
      paid_amount: 65000,
      balance_due: 70000,
      proposal_id: "prop-bikram-2026",
      enquiry_id: "enq-ram-thapa",
      company_id: "company-2",
      ceremonies: [
        {
          ceremonyName: "Traditional Biwaha & Grand Stage",
          date: "2083-01-28",
          items: [{ name: "Grand Royal Stage", rate: 85000, qty: 1 }],
          dayTotal: 85000,
        },
      ],
    },
  ];

  const { error: bookError } = await supabase
    .from("booked_clients")
    .upsert(bookings, { onConflict: "id" });
  if (bookError) console.warn("Notice (booked_clients):", bookError.message);
  else console.log(`✓ Seeded ${bookings.length} booked clients.`);

  console.log("✅ Seed completed successfully over Supabase REST!");
}

async function main() {
  const seedSqlPath = path.resolve(here, "../supabase/seed.sql");
  const sqlContent = fs.readFileSync(seedSqlPath, "utf8");

  if (DB_HOST && DB_PASSWORD) {
    try {
      await seedViaPg(sqlContent);
      return;
    } catch (err) {
      console.warn(
        "Direct PostgreSQL connection failed, attempting REST API fallback:",
        err.message,
      );
    }
  }

  // REST API fallback
  await seedViaRest();
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
