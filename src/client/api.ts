import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { enquiryRepository, StoredEnquiryItem } from "./lib/enquiryRepository";
import { cachedQuery, CacheKeys, CacheTTL } from "../lib/cache";

// Optional fallback to legacy local server if explicitly configured
export const API_BASE: string = (
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() || ""
).replace(/\/+$/, "");

export interface ApiDecoration {
  id: string;
  name: string;
  category: string;
  description: string;
  status: string;
  price: number;
  images: string[];
  events: string[];
  structure: string;
  dimensions: string;
  flowers: string;
  platform: string;
  /** Same floral details the admin view shows. */
  floral?:
    | {
        style: string;
        varietyType: string;
        flowers: { name: string; kind: string; colour: string }[];
      }
    | undefined;
  /** Platform / lighting / furniture that come with the design. */
  addons?: { title: string; sub: string; price: number }[] | undefined;
  /** For the Style and Color filters. */
  styles?: string[] | undefined;
  colors?: string[] | undefined;
  vendor: string;
  ownerCompanyId?: string | undefined;
  ownerCompanyName?: string | undefined;
}

export function mapRowToDecoration(
  row: any,
  defaultVendor = "Everest Events & Decor",
  companyNames: Record<string, string> = {},
): ApiDecoration {
  const specs = row.specifications || {};

  // Dimensions (handles width_ft, height_ft, width, height, summary, or string)
  let dimensionsStr = "";
  const dims = row.dimensions || specs.dimensions;
  if (typeof dims === "string") {
    dimensionsStr = dims;
  } else if (dims && typeof dims === "object") {
    if (dims.summary) {
      dimensionsStr = String(dims.summary);
    } else if (dims.width_ft && dims.height_ft) {
      dimensionsStr = `${dims.width_ft} × ${dims.height_ft} ft`;
    } else if (dims.width && dims.height) {
      dimensionsStr = `${dims.width} × ${dims.height} ft`;
    }
  }

  // Images list
  let images: string[] = [];
  if (Array.isArray(row.images) && row.images.length > 0) {
    images = row.images;
  } else if (row.image_url) {
    images = [row.image_url];
  } else if (Array.isArray(specs.images)) {
    images = specs.images;
  }

  // Applicable events
  const events: string[] =
    Array.isArray(row.applicable_events) && row.applicable_events.length > 0
      ? row.applicable_events
      : Array.isArray(specs.applicable_events)
        ? specs.applicable_events
        : Array.isArray(specs.events)
          ? specs.events
          : [];

  // Floral details
  let floralObj: {
    style: string;
    varietyType: string;
    flowers: { name: string; kind: string; colour: string }[];
  } = {
    style: "",
    varietyType: "",
    flowers: [],
  };

  if (specs.floral && typeof specs.floral === "object") {
    floralObj = {
      style: typeof specs.floral.style === "string" ? specs.floral.style : "",
      varietyType: typeof specs.floral.varietyType === "string" ? specs.floral.varietyType : "",
      flowers: Array.isArray(specs.floral.flowers)
        ? specs.floral.flowers.map((f: any) => ({
            name: typeof f.name === "string" ? f.name : "Flower",
            kind: typeof (f.kind || f.type) === "string" ? f.kind || f.type : "Fresh",
            colour: typeof (f.colour || f.color) === "string" ? f.colour || f.color : "",
          }))
        : [],
    };
  } else if (Array.isArray(specs.flowers)) {
    floralObj = {
      style:
        specs.floral_tag === "with_flowers"
          ? "Fresh & Artificial Mix"
          : typeof specs.floral_tag === "string"
            ? specs.floral_tag
            : "Floral Decor",
      varietyType: String(specs.flowers[0]?.type || specs.flowers[0]?.kind || "Standard"),
      flowers: specs.flowers.map((f: any) => ({
        name: typeof f.name === "string" ? f.name : "Flower",
        kind: typeof (f.type || f.kind) === "string" ? f.type || f.kind : "",
        colour: typeof (f.colour || f.color) === "string" ? f.colour || f.color : "",
      })),
    };
  } else if (typeof specs.flowers === "string") {
    floralObj = {
      style: specs.flowers,
      varietyType: "",
      flowers: [],
    };
  }

  if (!floralObj.style) {
    if (specs.floral_tag === "with_flowers") floralObj.style = "Fresh Flowers Included";
    else if (specs.floral_tag === "without_flowers")
      floralObj.style = "Without Flowers (Structure Only)";
    else floralObj.style = "Floral Decor";
  }

  if (events.length === 0) {
    events.push("Wedding", "Reception", "Engagement", "Haldi", "Mehndi", "Sangeet");
  }

  // Addons
  const addons: { title: string; sub: string; price: number }[] = [];
  if (Array.isArray(specs.addons)) {
    specs.addons.forEach((a: any) => {
      if (a && typeof a === "object") {
        addons.push({
          title: String(a.title || a.name || "Add-on"),
          sub: String(a.sub || a.description || ""),
          price: Number(a.price) || 0,
        });
      }
    });
  }
  if (Array.isArray(specs.platforms)) {
    specs.platforms.forEach((p: any) => {
      if (p) {
        addons.push({
          title: `Platform · ${p.name || "Stage Platform"}`,
          sub: p.size ? `${p.size} · ${p.color || ""}` : p.color || "",
          price: Number(p.price) || 0,
        });
      }
    });
  }
  if (Array.isArray(specs.lighting)) {
    specs.lighting.forEach((l: any) => {
      if (l) {
        addons.push({
          title: `Lighting · ${l.name || "Ambient Lights"}`,
          sub: l.qty ? `Quantity: ${l.qty}` : "",
          price: Number(l.price) || 0,
        });
      }
    });
  }

  const ownerCompanyId =
    row.company_id ||
    row.owner_company_id ||
    row.ownerCompanyId ||
    specs.ownerCompanyId ||
    "company-1";
  const ownerCompanyName =
    companyNames[ownerCompanyId] ||
    row.company_name ||
    row.owner_company_name ||
    row.ownerCompanyName ||
    specs.ownerCompanyName ||
    row.vendor ||
    specs.vendor ||
    defaultVendor;

  const structure = String(
    specs.main_structure ||
      row.structure_type ||
      specs.structure_type ||
      specs.structure ||
      row.category ||
      "Standard",
  );

  const styles: string[] =
    Array.isArray(specs.setup_styles) && specs.setup_styles.length > 0
      ? specs.setup_styles
      : Array.isArray(specs.styles)
        ? specs.styles
        : Array.isArray(row.styles)
          ? row.styles
          : [];

  return {
    id: String(row.id),
    name: row.name || "Untitled Decoration",
    category: row.category || "Stage",
    description: row.description || specs.summary || "",
    status: row.status || "live",
    price: Number(row.price) || 0,
    images,
    events,
    structure,
    dimensions: dimensionsStr,
    flowers: floralObj.style,
    platform: typeof specs.platform === "string" ? specs.platform : specs.platform?.name || "",
    floral: floralObj,
    addons: addons.length > 0 ? addons : undefined,
    styles,
    colors: Array.isArray(specs.colors)
      ? specs.colors
      : Array.isArray(row.colors)
        ? row.colors
        : [],
    vendor: ownerCompanyName,
    ownerCompanyId,
    ownerCompanyName,
  };
}

/**
 * Live catalog decorations, cache-first (shared by the home page and the
 * decoration detail page). Pass `{ force: true }` to bypass the cache, e.g.
 * after a realtime change. Never throws: resolves to [] when nothing could be
 * loaded and nothing is cached (same contract as before caching was added).
 */
export async function fetchLiveDecorations(
  options: { force?: boolean } = {},
): Promise<ApiDecoration[]> {
  if (!isSupabaseConfigured && !API_BASE) {
    return [];
  }
  try {
    return await cachedQuery({
      key: CacheKeys.liveDecorations(),
      ttl: CacheTTL.liveDecorations,
      force: options.force,
      fetcher: loadLiveDecorationsFromNetwork,
      isValid: Array.isArray,
    });
  } catch (err) {
    console.warn("Live decorations unavailable:", err);
    return [];
  }
}

/** Network loader. Throws when every source failed, so failures are never cached. */
async function loadLiveDecorationsFromNetwork(): Promise<ApiDecoration[]> {
  try {
    // 1. Fetch company profile name if available
    let companyName = "Everest Events & Decor";
    const companyNames: Record<string, string> = {};
    try {
      const { data: cos } = await supabase.from("company_profile").select("id,name");
      (cos || []).forEach((c: any) => {
        const id = c.id === "default" ? "company-1" : String(c.id);
        if (c.name?.trim()) companyNames[id] = c.name.trim();
      });
      if (companyNames["company-1"]) companyName = companyNames["company-1"];
    } catch {}

    // 2. Query decorations table from Supabase
    const { data, error } = await supabase
      .from("decorations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase decorations fetch error:", error);
      throw error;
    }

    if (data && Array.isArray(data)) {
      const liveData = data.filter(
        (d: any) => !d.status || String(d.status).trim().toLowerCase() === "live",
      );
      const list = liveData.length > 0 ? liveData : data;
      return list.map((row: any) => mapRowToDecoration(row, companyName, companyNames));
    }
    return [];
  } catch (err) {
    console.warn("Supabase query failed, checking fallback:", err);
    if (API_BASE) {
      const res = await fetch(`${API_BASE}/api/decorations?status=live`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.decorations)) return json.decorations;
      }
    }
    throw err;
  }
}

export interface EnquiryPayload {
  /** Stable id for one submission so retries never create duplicate enquiries. */
  submissionKey?: string | undefined;
  type?: ("direct-order" | "quotation-request") | undefined;
  name: string;
  phone: string;
  whatsappNumber?: string | undefined;
  whatsappSameAsPhone?: boolean | undefined;
  message: string;
  venue?: string | undefined;
  grandTotal: number;
  companies?: string[] | undefined;
  events: {
    name: string;
    date: string;
    venue: string;
    subtotal: number;
    decorations: {
      id: string;
      decorationId?: string | undefined;
      title: string;
      name?: string | undefined;
      category: string;
      price: number;
      listedPrice?: number | undefined;
      image?: string | undefined;
      photo?: string | undefined;
      vendor?: string | undefined;
      ownerCompanyId?: string | undefined;
      ownerCompanyName?: string | undefined;
      description?: string | undefined;
    }[];
  }[];
}

export async function submitEnquiry(payload: EnquiryPayload): Promise<void> {
  const targetCompanies =
    payload.companies && payload.companies.length > 0
      ? payload.companies
      : ["Everest Events & Decor"];

  const rowsToInsert: any[] = [];
  const repoItems: StoredEnquiryItem[] = [];

  for (let idx = 0; idx < targetCompanies.length; idx++) {
    const company = targetCompanies[idx] ?? "Everest Events & Decor";
    const enquiryId = payload.submissionKey
      ? `enq-${payload.submissionKey}-${idx + 1}`
      : "enq-" +
        Date.now() +
        "-" +
        Math.random().toString(36).slice(2, 6) +
        (targetCompanies.length > 1 ? `-${idx + 1}` : "");

    // Every selected company receives the full quotation request (all decorations).
    const companyEvents = (payload.events || []).map((ev) => {
      const decorations = ev.decorations || [];
      const subtotal = decorations.reduce((sum, d) => sum + (d.price || 0), 0);
      return {
        ...ev,
        decorations,
        subtotal,
      };
    });

    const companyTotal =
      companyEvents.reduce((sum, ev) => sum + ev.subtotal, 0) || payload.grandTotal || 0;
    const firstEvent = companyEvents[0];
    const venue = payload.venue || firstEvent?.venue || null;
    const ceremonyType = firstEvent?.name || null;
    const dateIso = firstEvent?.date || null;

    const waNum = payload.whatsappNumber || payload.phone || "";
    const sameAsPhone = payload.whatsappSameAsPhone ?? waNum === payload.phone;

    const targetCoNote = `[Selected Company: ${company}]`;
    const waNote = `[WhatsApp: ${waNum}${sameAsPhone ? " (Same as phone)" : ""}]`;
    const note = [targetCoNote, waNote, payload.message].filter(Boolean).join("\n") || null;

    const row = {
      id: enquiryId,
      client_name: payload.name || "Anonymous Client",
      phone: payload.phone || "",
      whatsapp_number: waNum,
      venue,
      ceremony_type: ceremonyType,
      date_iso: dateIso,
      source: "client_panel",
      status: "unreviewed",
      order_type: payload.type || "quotation-request",
      estimated_budget_npr: companyTotal,
      private_note: note,
      events: companyEvents,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    rowsToInsert.push(row);

    repoItems.push({
      ...row,
      whatsappNumber: waNum,
      whatsappSameAsPhone: sameAsPhone,
      owner_company_name: company,
      company_id: company.toLowerCase().includes("royal") ? "company-2" : "company-1",
    });
  }

  // 1. Store locally through enquiryRepository
  enquiryRepository.addMany(repoItems);

  // 2. Insert one record per selected company into Supabase
  const { error } = await supabase
    .from("enquiries")
    .upsert(rowsToInsert, { onConflict: "id", ignoreDuplicates: true });
  if (error) {
    console.error("Failed to submit enquiry to Supabase:", error);
    if (API_BASE) {
      const res = await fetch(`${API_BASE}/api/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);
      if (res && res.ok) return;
    }
    throw new Error(error.message || "Could not send enquiry");
  }

  // 3. Fallback sync to local API if configured
  if (API_BASE) {
    for (const repoItem of repoItems) {
      await fetch(`${API_BASE}/api/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          id: repoItem.id,
          whatsappNumber: repoItem.whatsappNumber,
          whatsappSameAsPhone: repoItem.whatsappSameAsPhone,
          grandTotal: repoItem.estimated_budget_npr,
          events: repoItem.events,
        }),
      }).catch(() => null);
    }
  }
}

/** Uploaded images come back as full URL or "/uploads/x.jpg" - make them absolute. */
export const absoluteImage = (u: string) => {
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:")) {
    return u;
  }
  return u.startsWith("/") && API_BASE ? `${API_BASE}${u}` : u;
};
