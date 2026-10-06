import { useState, useEffect } from "react";

export type BookingStage =
  | "confirmed"
  | "decor_confirmed"
  | "crew_assigned"
  | "setup_scheduled"
  | "delivered"
  | "closed";

export type PaymentStatus = "paid" | "partial" | "balance_due";

export interface ClientFlowerItem {
  name: string;
  price: number;
  quantity: number;
}

export interface ClientDecorationItem {
  name: string;
  type: string;
  price?: number;
  flowers?: ClientFlowerItem[];
}

export function computeDecorationItemPrice(item: ClientDecorationItem): number {
  if (item.flowers && item.flowers.length > 0) {
    return item.flowers.reduce((sum, f) => sum + (Number(f.price) || 0) * (Number(f.quantity) || 0), 0);
  }
  return Number(item.price) || 0;
}

export type QuotationStatus = "Draft" | "Sent via WhatsApp" | "Approved" | "Pending Review";

export interface CeremonySetupItem {
  id?: string | undefined;
  name: string;
  price: number;
  setupId?: string | undefined;
  category?: string | undefined;
  imageUrl?: string | undefined;
  description?: string | undefined;
  pending?: boolean | undefined;
}

export interface ClientPaidAddon {
  id: string;
  name: string;
  quantity?: number | undefined;
  unit?: string | undefined;
  unitPrice?: number | undefined;
  price?: number | undefined;
  category?: string | undefined;
  description?: string | undefined;
  icon?: string | undefined;
}

export interface ClientCeremonyItem {
  id?: string | undefined;
  name: string; // e.g. "Haldi Day", "Wedding Day"
  date: string; // e.g. "Mangsir 2, 2083"
  venue: string; // e.g. "Residence, Bhaisepati"
  setupId?: string | undefined;
  setupName?: string | undefined;
  setupPrice?: number | undefined;
  setupImage?: string | undefined;
  category?: string | undefined;
  items?: CeremonySetupItem[] | undefined;
  notes?: string[] | string | undefined;
}

export interface BookedClient {
  /** Bank/QR accounts the client may pay the advance to (ids from payment-qr settings) */
  payment_accounts?: { id: string; role: "main" | "optional" }[] | undefined;
  id: string;
  client_name: string;
  event_type: string;
  event_date: string;
  venue: string;
  stage: BookingStage;
  payment_status: PaymentStatus;
  payment_note: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  days_to_event: number | "today" | "complete";
  needs_attention: boolean;
  phone?: string | undefined;
  decorations?: ClientDecorationItem[] | undefined;
  crew_assignments?: { role: string; name: string }[] | undefined;
  notes?: string | undefined;

  // New fields for Multi-Ceremony Card Selection and Quotation Overview
  handler?: string | undefined;
  events_count?: number | undefined;
  quotation_status?: QuotationStatus | undefined;
  proposal_id?: string | undefined;
  ceremonies?: ClientCeremonyItem[] | undefined;
  paid_addons?: ClientPaidAddon[] | undefined;
  addOns?: ClientPaidAddon[] | undefined;

  // Soft-delete fields
  deleted_at?: string | undefined;
  deleted_by?: string | undefined;
}

export function convertEnquiryToBookedClient(enq: {
  id: string;
  client_name: string;
  ceremony_type: string;
  date_bs?: string | undefined;
  date_ad?: string | undefined;
  venue?: string | undefined;
  estimated_budget_npr?: number | undefined;
  phone?: string | undefined;
  assigned_handler?: string | undefined;
  private_note?: string | undefined;
}): BookedClient {
  return {
    id: enq.id,
    client_name: enq.client_name,
    event_type: enq.ceremony_type,
    event_date: `${enq.date_bs || ""}${enq.date_ad ? ` (${enq.date_ad})` : ""}`.trim() || "Scheduled Date",
    venue: enq.venue || "Kathmandu Venue",
    stage: "confirmed",
    payment_status: "balance_due",
    payment_note: "Quotation created from incoming enquiry",
    total_amount: enq.estimated_budget_npr || 85000,
    paid_amount: 0,
    balance_due: enq.estimated_budget_npr || 85000,
    days_to_event: 30,
    needs_attention: false,
    phone: enq.phone,
    handler: enq.assigned_handler || "Pooja Thapa",
    events_count: 1,
    quotation_status: "Draft",
    proposal_id: `prop-${enq.id.replace("enq-", "")}`,
    ceremonies: [
      {
        id: "c-1",
        name: enq.ceremony_type,
        date: `${enq.date_bs || ""}${enq.date_ad ? ` · ${enq.date_ad}` : ""}`.trim() || "Date on record",
        venue: enq.venue || "Kathmandu Venue",
        setupPrice: enq.estimated_budget_npr || 85000,
      },
    ],
    notes: enq.private_note,
  };
}

export const BOOKING_STAGES: { key: BookingStage; label: string; step: number }[] = [
  { key: "confirmed", label: "Confirmed", step: 1 },
  { key: "decor_confirmed", label: "Decor Confirmed", step: 2 },
  { key: "crew_assigned", label: "Crew Assigned", step: 3 },
  { key: "setup_scheduled", label: "Setup Scheduled", step: 4 },
  { key: "delivered", label: "Delivered", step: 5 },
  { key: "closed", label: "Closed", step: 6 },
];

export const INITIAL_BOOKED_CLIENTS: BookedClient[] = [
  {
    id: "bk-rohan-sneha",
    client_name: "Rohan & Sneha",
    event_type: "Grand 4-Day Royal Wedding",
    event_date: "2026-11-27 (Mangsir 11)",
    venue: "The Soaltee, Grand Ballroom, Kathmandu",
    stage: "confirmed",
    payment_status: "balance_due",
    payment_note: "Quotation created · Awaiting client confirmation",
    total_amount: 230000,
    paid_amount: 0,
    balance_due: 230000,
    days_to_event: 42,
    needs_attention: false,
    phone: "+977 9841234900",
    handler: "Pooja Thapa",
    events_count: 4,
    quotation_status: "Draft",
    proposal_id: "prop-rohan-sneha-2083",
    ceremonies: [
      {
        id: "c-rs-1",
        name: "Haldi Day",
        date: "Mangsir 9, 2083 (Nov 25)",
        venue: "Client Residence Lawn, Bhaisepati",
        setupName: "Marigold Yellow Floral Wall & Swing",
        setupPrice: 35000,
        category: "Backdrop",
        setupImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80",
      },
      {
        id: "c-rs-2",
        name: "Mehendi Day",
        date: "Mangsir 10, 2083 (Nov 26)",
        venue: "Heritage Garden, Sanepa",
        setupName: "Bohemian Pastel Floral Canopy",
        setupPrice: 55000,
        category: "Entrance Gate",
        setupImage: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&auto=format&fit=crop&q=80",
      },
      {
        id: "c-rs-3",
        name: "Wedding Day",
        date: "Mangsir 11, 2083 (Nov 27)",
        venue: "The Soaltee, Grand Ballroom",
        setupName: "Royal Dome Mandap with Red Roses & Crystal Chandeliers",
        setupPrice: 140000,
        category: "Mandap",
        setupImage: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&auto=format&fit=crop&q=80",
      },
      {
        id: "c-rs-4",
        name: "Reception Night",
        date: "Mangsir 12, 2083 (Nov 28)",
        venue: "Hyatt Regency, Bouddha",
        setupName: "Kinetic Champagne Shimmer Wall & VIP Lounge",
        setupPrice: 0,
        category: "Stage",
        setupImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    id: "bk-aarav-riya",
    client_name: "Aarav & Riya",
    event_type: "Grand Wedding & Reception",
    event_date: "2026-09-20 (Mangsir 4)",
    venue: "The Soaltee, Grand Ballroom, Kathmandu",
    stage: "crew_assigned",
    payment_status: "balance_due",
    payment_note: "50% advance received · ₹45,000 due before dispatch",
    total_amount: 90000,
    paid_amount: 45000,
    balance_due: 45000,
    days_to_event: "today",
    needs_attention: true,
    phone: "+977 9801234512",
    handler: "suvash mukhiya",
    events_count: 3,
    quotation_status: "Sent via WhatsApp",
    proposal_id: "prop-aarav-riya-8841",
    ceremonies: [
      {
        id: "c-1",
        name: "Haldi Day",
        date: "Mangsir 2, 2083 (Nov 18)",
        venue: "Residence, Bhaisepati",
        setupName: "Marigold Yellow Floral Wall Setup",
        setupPrice: 22000,
        category: "Backdrop",
        setupImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80",
      },
      {
        id: "c-2",
        name: "Mehendi Day",
        date: "Mangsir 3, 2083 (Nov 19)",
        venue: "Residence, Bhaisepati",
        setupName: "Boho Wooden Arch with Pampas & Rose",
        setupPrice: 18000,
        category: "Entrance Gate",
        setupImage: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&auto=format&fit=crop&q=80",
      },
      {
        id: "c-3",
        name: "Wedding Day",
        date: "Mangsir 4, 2083 (Nov 20)",
        venue: "The Soaltee, Grand Ballroom",
        setupName: "6-Pillar Royal Dome Mandap",
        setupPrice: 50000,
        category: "Mandap",
        setupImage: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&auto=format&fit=crop&q=80",
      },
    ],
    decorations: [
      {
        name: "6-Pillar Royal Dome Mandap",
        type: "Mandap",
        flowers: [
          { name: "Natural Fresh Dutch Red Roses", price: 1200, quantity: 25 },
          { name: "White Orchid Cascades", price: 2500, quantity: 10 },
        ],
        price: 55000,
      },
      {
        name: "Royal Grand Floral Arch Gate",
        type: "Entrance Gate",
        flowers: [
          { name: "Natural Fresh Dutch Red Roses", price: 1200, quantity: 10 },
          { name: "Artificial Silk Hydrangea Swag", price: 1800, quantity: 5 },
          { name: "Gypsophila Baby's Breath", price: 500, quantity: 2 },
        ],
        price: 22000,
      },
      {
        name: "Warm Fairy Light Waterfall Drape",
        type: "Backdrop",
        flowers: [
          { name: "Champagne Carnations", price: 650, quantity: 20 },
        ],
        price: 13000,
      },
    ],
    crew_assignments: [
      { role: "Lead Designer", name: "Nisha Maharjan" },
      { role: "Senior Florist", name: "Suman Shrestha" },
      { role: "Lighting Tech", name: "Ramesh Thapa" },
      { role: "Rigging Crew", name: "Bikram & Team (4)" },
    ],
    notes: "Requires heavy truss anchors. Load-in starts at 6:00 AM sharp.",
  },
  {
    id: "bk-shrestha-reception",
    client_name: "Shrestha Family",
    event_type: "Traditional Reception Ceremony",
    event_date: "2026-09-23 (Mangsir 7)",
    venue: "Hotel Himalaya, Lalitpur",
    stage: "setup_scheduled",
    payment_status: "paid",
    payment_note: "Fully paid via Bank Transfer · Receipt #TR-8821",
    total_amount: 68000,
    paid_amount: 68000,
    balance_due: 0,
    days_to_event: 3,
    needs_attention: false,
    phone: "+977 9801234563",
    handler: "Satya Raj Ghimire",
    events_count: 2,
    quotation_status: "Approved",
    proposal_id: "prop-shrestha-9024",
    ceremonies: [
      {
        id: "c-shrestha-1",
        name: "Wedding Day",
        date: "Mangsir 6, 2083 (Nov 22)",
        venue: "Hotel Himalaya, Lalitpur",
        setupName: "Minimalist Modern Geometric Arch Mandap",
        setupPrice: 38000,
        category: "Mandap",
        setupImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80",
      },
      {
        id: "c-shrestha-2",
        name: "Reception Ceremony",
        date: "Mangsir 7, 2083 (Nov 23)",
        venue: "Hotel Himalaya, Lalitpur",
        setupName: "Kinetic Champagne Shimmer Wall",
        setupPrice: 30000,
        category: "Backdrop",
        setupImage: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&auto=format&fit=crop&q=80",
      },
    ],
    decorations: [
      {
        name: "Minimalist Modern Geometric Arch",
        type: "Entrance Gate",
        flowers: [
          { name: "White Lilies", price: 1000, quantity: 10 },
          { name: "Eucalyptus Leaves & Pampas", price: 600, quantity: 10 },
        ],
        price: 16000,
      },
      {
        name: "Kinetic Champagne Shimmer Wall",
        type: "Backdrop",
        flowers: [
          { name: "Champagne Roses", price: 1200, quantity: 15 },
          { name: "Baby's Breath", price: 600, quantity: 10 },
        ],
        price: 24000,
      },
      {
        name: "Table Centerpieces (12 Sets)",
        type: "Centerpiece",
        flowers: [
          { name: "Mixed Pastel Floral Swags", price: 1400, quantity: 20 },
        ],
        price: 28000,
      },
    ],
    crew_assignments: [
      { role: "Lead Designer", name: "Nisha Maharjan" },
      { role: "Rigging Crew", name: "Sunil Rai" },
      { role: "Teardown Lead", name: "Prakash KC" },
    ],
  },
  {
    id: "bk-karki-mehendi",
    client_name: "Anisha Karki",
    event_type: "Sangeet & Mehendi Night",
    event_date: "2026-09-24 (Mangsir 8)",
    venue: "Heritage Garden, Sanepa, Lalitpur",
    stage: "decor_confirmed",
    payment_status: "partial",
    payment_note: "Token advance ₹20,000 received · Remaining due on delivery",
    total_amount: 52000,
    paid_amount: 20000,
    balance_due: 32000,
    days_to_event: 4,
    needs_attention: true,
    phone: "+977 9801234541",
    handler: "ANWESHA ADHIKARI",
    events_count: 2,
    quotation_status: "Draft",
    proposal_id: "prop-karki-7719",
    ceremonies: [
      {
        id: "c-karki-1",
        name: "Haldi Morning",
        date: "Mangsir 7, 2083 (Nov 23)",
        venue: "Heritage Garden, Sanepa",
        setupName: "Marigold Yellow Floral Wall",
        setupPrice: 22000,
        category: "Backdrop",
        setupImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80",
      },
      {
        id: "c-karki-2",
        name: "Sangeet & Mehendi Night",
        date: "Mangsir 8, 2083 (Nov 24)",
        venue: "Heritage Garden, Sanepa",
        setupName: "Boho Wooden Arch with Pampas & Rose",
        setupPrice: 30000,
        category: "Entrance Gate",
        setupImage: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&auto=format&fit=crop&q=80",
      },
    ],
    decorations: [
      {
        name: "Boho Wooden Arch with Pampas & Rose",
        type: "Entrance Gate",
        flowers: [
          { name: "Peach Roses & Pampas", price: 1200, quantity: 15 },
        ],
        price: 18000,
      },
      {
        name: "Marigold Yellow Floral Wall",
        type: "Backdrop",
        flowers: [
          { name: "Fresh Yellow Marigold Garlands", price: 440, quantity: 50 },
        ],
        price: 22000,
      },
      {
        name: "Floor Seating & Low Diwan Sets",
        type: "Furniture",
        flowers: [
          { name: "Marigold Tassels & Petals", price: 300, quantity: 40 },
        ],
        price: 12000,
      },
    ],
    crew_assignments: [
      { role: "Florist", name: "Suman Shrestha" },
      { role: "Fabric & Drapes", name: "Sita Tamang" },
    ],
    notes: "Outdoor lawn venue — waterproof covers required for night dewing.",
  },
  {
    id: "bk-rai-corporate",
    client_name: "Rai Corporate Group",
    event_type: "Annual Gala & Award Dinner",
    event_date: "2026-09-28 (Mangsir 12)",
    venue: "Hyatt Regency, Regency Ballroom, Kathmandu",
    stage: "confirmed",
    payment_status: "partial",
    payment_note: "Purchase Order #CORP-902 confirmed · 50% invoice processed",
    total_amount: 115000,
    paid_amount: 57500,
    balance_due: 57500,
    days_to_event: 8,
    needs_attention: false,
    phone: "+977 9801234588",
    handler: "Satya Raj Ghimire",
    events_count: 1,
    quotation_status: "Approved",
    proposal_id: "prop-rai-3108",
    ceremonies: [
      {
        id: "c-rai-1",
        name: "Annual Gala Dinner",
        date: "Mangsir 12, 2083 (Nov 28)",
        venue: "Hyatt Regency, Regency Ballroom",
        setupName: "Modern Metallic Grid Backdrop with Neon",
        setupPrice: 115000,
        category: "Stage",
        setupImage: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&auto=format&fit=crop&q=80",
      },
    ],
    decorations: [
      {
        name: "Modern Metallic Grid Backdrop with Neon",
        type: "Backdrop",
        flowers: [
          { name: "White Anthuriums & Monsteras", price: 1400, quantity: 30 },
        ],
        price: 42000,
      },
      {
        name: "Stage Lighting & Spotlight Package",
        type: "Lighting",
        flowers: [
          { name: "Stage Floral Runners", price: 1900, quantity: 20 },
        ],
        price: 38000,
      },
      {
        name: "VIP Lounge Modular Sofas",
        type: "Furniture",
        flowers: [
          { name: "Lounge Floral Arrangements", price: 2500, quantity: 14 },
        ],
        price: 35000,
      },
    ],
    crew_assignments: [
      { role: "Production Lead", name: "Anand Joshi" },
      { role: "Lighting Tech", name: "Ramesh Thapa" },
    ],
  },
  {
    id: "bk-thapa-engagement",
    client_name: "Thapa Family",
    event_type: "Ring Ceremony & Engagement",
    event_date: "2026-10-02 (Mangsir 16)",
    venue: "Vivanta Kathmandu, Jhamsikhel",
    stage: "decor_confirmed",
    payment_status: "paid",
    payment_note: "Full payment cleared via eSewa",
    total_amount: 44000,
    paid_amount: 44000,
    balance_due: 0,
    days_to_event: 12,
    needs_attention: false,
    phone: "+977 9801234594",
    handler: "suvash mukhiya",
    events_count: 2,
    quotation_status: "Sent via WhatsApp",
    proposal_id: "prop-thapa-4402",
    ceremonies: [
      {
        id: "c-thapa-1",
        name: "Ring Ceremony",
        date: "Mangsir 15, 2083 (Dec 1)",
        venue: "Vivanta Kathmandu, Jhamsikhel",
        setupName: "Pastel Rose Floral Ring Backdrop",
        setupPrice: 28000,
        category: "Backdrop",
        setupImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80",
      },
      {
        id: "c-thapa-2",
        name: "Family Cocktail Dinner",
        date: "Mangsir 16, 2083 (Dec 2)",
        venue: "Vivanta Kathmandu, Jhamsikhel",
        setupName: "Fairy Light Ceiling Canopy & Lounge",
        setupPrice: 16000,
        category: "Lighting",
        setupImage: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&auto=format&fit=crop&q=80",
      },
    ],
    decorations: [
      {
        name: "Pastel Rose Floral Ring Backdrop",
        type: "Backdrop",
        flowers: [
          { name: "Dutch Pink Roses", price: 1400, quantity: 20 },
        ],
        price: 28000,
      },
      {
        name: "Welcome Easel Board with Calligraphy",
        type: "Welcome Board",
        flowers: [
          { name: "Corner Floral Swag", price: 1200, quantity: 5 },
        ],
        price: 6000,
      },
      {
        name: "Fairy Light Ceiling Canopy",
        type: "Lighting",
        flowers: [
          { name: "Wisteria & Ivy Garlands", price: 500, quantity: 20 },
        ],
        price: 10000,
      },
    ],
    crew_assignments: [
      { role: "Lead Designer", name: "Nisha Maharjan" },
      { role: "Fabric & Drapes", name: "Sita Tamang" },
    ],
  },
  {
    id: "bk-lama-anniversary",
    client_name: "Lama Family",
    event_type: "25th Silver Jubilee Anniversary",
    event_date: "2026-09-12 (Bhadra 27)",
    venue: "Gokarna Forest Resort, Kathmandu",
    stage: "closed",
    payment_status: "paid",
    payment_note: "All accounts settled & event closed successfully",
    total_amount: 72000,
    paid_amount: 72000,
    balance_due: 0,
    days_to_event: "complete",
    needs_attention: false,
    phone: "+977 9801234599",
    handler: "suvash mukhiya",
    events_count: 1,
    quotation_status: "Approved",
    proposal_id: "prop-lama-1192",
    ceremonies: [
      {
        id: "c-lama-1",
        name: "Silver Jubilee Celebration",
        date: "Bhadra 27, 2083 (Sep 12)",
        venue: "Gokarna Forest Resort, Kathmandu",
        setupName: "Silver Shimmer & White Wisteria Setup",
        setupPrice: 72000,
        category: "Mandap",
        setupImage: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&auto=format&fit=crop&q=80",
      },
    ],
    decorations: [
      {
        name: "Silver Shimmer & White Wisteria Setup",
        type: "Mandap",
        flowers: [
          { name: "White Wisteria Clusters", price: 1500, quantity: 30 },
        ],
        price: 45000,
      },
      {
        name: "Memory Photo Walkway Panels",
        type: "Props",
        flowers: [
          { name: "Floral Border Vines", price: 750, quantity: 20 },
        ],
        price: 15000,
      },
      {
        name: "Ambient Warm Uplights (8 units)",
        type: "Lighting",
        flowers: [
          { name: "Uplight Floral Base Pots", price: 1500, quantity: 8 },
        ],
        price: 12000,
      },
    ],
    crew_assignments: [
      { role: "Event Lead", name: "Prakash KC" },
      { role: "Florist", name: "Suman Shrestha" },
    ],
    notes: "Client left a 5-star review! Restocking completed.",
  },
];

const STORAGE_KEY = "decoration-portal:booked-clients";

export function loadStoredBookedClients(includeDeleted = false): BookedClient[] {
  if (typeof window === "undefined") return INITIAL_BOOKED_CLIENTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BOOKED_CLIENTS));
      return INITIAL_BOOKED_CLIENTS;
    }
    const parsed = JSON.parse(raw) as BookedClient[];
    // Migrate stored data if handler or ceremony information is missing
    if (!parsed[0]?.handler || !parsed[0]?.ceremonies) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BOOKED_CLIENTS));
      return INITIAL_BOOKED_CLIENTS;
    }
    if (!parsed.some(c => c.id === "bk-rohan-sneha")) {
      const first = INITIAL_BOOKED_CLIENTS[0];
      const merged: BookedClient[] = first ? [first, ...parsed] : [...parsed];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    // Filter out soft-deleted records unless caller opts in
    return includeDeleted ? parsed : parsed.filter((c) => !c.deleted_at);
  } catch {
    return INITIAL_BOOKED_CLIENTS;
  }
}

export function saveStoredBookedClients(clients: BookedClient[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  } catch (err) {
    console.error("Failed to save booked clients to localStorage:", err);
  }
}

export function useBookedClientsStore() {
  const [clients, setClients] = useState<BookedClient[]>(INITIAL_BOOKED_CLIENTS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load live data (excluding deleted) into reactive state
    setClients(loadStoredBookedClients());
    setIsLoaded(true);
  }, []);

  const updateClientStage = (clientId: string, nextStage: BookingStage) => {
    const updated = clients.map((c) =>
      c.id === clientId ? { ...c, stage: nextStage } : c
    );
    setClients(updated);
    saveStoredBookedClients(updated);
  };

  const updateClientPayment = (
    clientId: string,
    paidAmount: number,
    note?: string
  ) => {
    const updated = clients.map((c) => {
      if (c.id !== clientId) return c;
      const total = c.total_amount;
      const newPaid = Math.min(total, Math.max(0, paidAmount));
      const newBalance = total - newPaid;
      const newStatus: PaymentStatus =
        newBalance <= 0 ? "paid" : newPaid > 0 ? "partial" : "balance_due";
      return {
        ...c,
        paid_amount: newPaid,
        balance_due: newBalance,
        payment_status: newStatus,
        payment_note: note ?? c.payment_note,
      };
    });
    setClients(updated);
    saveStoredBookedClients(updated);
  };

  const updateClientQuotationStatus = (clientId: string, quotation_status: QuotationStatus) => {
    const updated = clients.map((c) =>
      c.id === clientId ? { ...c, quotation_status } : c
    );
    setClients(updated);
    saveStoredBookedClients(updated);
  };

  const updateClientCeremonies = (
    clientId: string,
    ceremonies: ClientCeremonyItem[],
    totalAmount?: number
  ) => {
    const updated = clients.map((c) => {
      if (c.id !== clientId) return c;
      const newTotal = totalAmount !== undefined ? totalAmount : c.total_amount;
      const newBalance = Math.max(0, newTotal - c.paid_amount);
      return {
        ...c,
        ceremonies,
        events_count: ceremonies.length,
        total_amount: newTotal,
        balance_due: newBalance,
      };
    });
    setClients(updated);
    saveStoredBookedClients(updated);
  };

  const resetClients = () => {
    setClients(INITIAL_BOOKED_CLIENTS);
    saveStoredBookedClients(INITIAL_BOOKED_CLIENTS);
  };

  /**
   * Soft-delete a booked client (quotation). Keeps the row in storage with
   * deleted_at/deleted_by set; removes it from the reactive client list.
   */
  const softDeleteClient = (clientId: string, deletedBy = "staff") => {
    // Operate on ALL rows (including previously deleted) to avoid data loss
    const all = loadStoredBookedClients(true);
    const updated = all.map((c) =>
      c.id === clientId
        ? { ...c, deleted_at: new Date().toISOString(), deleted_by: deletedBy }
        : c
    );
    saveStoredBookedClients(updated);
    // Reactive state only holds non-deleted records
    setClients(updated.filter((c) => !c.deleted_at));
  };

  /**
   * Restore a soft-deleted booked client (undo).
   */
  const undoDeleteClient = (clientId: string) => {
    const all = loadStoredBookedClients(true);
    const updated = all.map((c) =>
      c.id === clientId
        ? { ...c, deleted_at: undefined, deleted_by: undefined }
        : c
    );
    saveStoredBookedClients(updated);
    setClients(updated.filter((c) => !c.deleted_at));
  };

  return {
    clients,
    isLoaded,
    updateClientStage,
    updateClientPayment,
    updateClientQuotationStatus,
    updateClientCeremonies,
    resetClients,
    softDeleteClient,
    undoDeleteClient,
  };
}

export function upsertStoredBookedClient(client: BookedClient): void {
  const clients = loadStoredBookedClients();
  const existingIdx = clients.findIndex((c) => c.id === client.id);
  let updated: BookedClient[];
  if (existingIdx >= 0) {
    updated = clients.map((c, i) => (i === existingIdx ? client : c));
  } else {
    updated = [client, ...clients];
  }
  saveStoredBookedClients(updated);
}

export function findClientById(clientId: string): BookedClient | undefined {
  const clients = loadStoredBookedClients();
  return clients.find((c) => c.id === clientId);
}

export function parseEventDate(eventDateStr: string): {
  adDate: string;
  adYear: number;
  adMonth: number;
  adDay: number;
  bsText: string;
  bsMonthName?: string | undefined;
  bsDay?: number | undefined;
} {
  const match = eventDateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s*\(([^)]+)\))?/);
  if (!match || !match[1] || !match[2] || !match[3]) {
    return {
      adDate: "",
      adYear: 0,
      adMonth: 0,
      adDay: 0,
      bsText: "",
    };
  }
  const adYear = parseInt(match[1], 10);
  const adMonth = parseInt(match[2], 10);
  const adDay = parseInt(match[3], 10);
  const bsText = match[4] || "";
  const bsParts = bsText.trim().split(/\s+/);
  const bsMonthName = bsParts[0] || undefined;
  const rawDay = parseInt(bsParts[1] || "0", 10);
  const bsDay = isNaN(rawDay) || rawDay === 0 ? undefined : rawDay;

  return {
    adDate: `${match[1]}-${match[2]}-${match[3]}`,
    adYear,
    adMonth,
    adDay,
    bsText,
    bsMonthName,
    bsDay,
  };
}

export function getBookingsForDate(clients: BookedClient[], adDateStr: string): BookedClient[] {
  return clients.filter((c) => {
    const parsed = parseEventDate(c.event_date);
    return parsed.adDate === adDateStr;
  });
}
