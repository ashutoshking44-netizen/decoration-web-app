export type Category =
  "All" | "Stage" | "Entrance" | "Mandap" | "Table" | "Backdrops" | "Welcome Board";

/** Structured details shown on a decoration's detail page. */
export interface DecorationSpecs {
  summary: string;
  structure: string;
  dimensions: string;
  events: string[];
  floral: {
    style: string;
    varietyType: string;
    flowers: { name: string; kind: string; colour?: string }[];
    variety: string;
    color: string;
  };
  /** Platform / lighting / furniture that come with the design (from the dashboard). */
  addons?: { title: string; sub: string; price: number }[];
  platform?: { name: string; size: string; color: string; price: number };
  lighting?: { name: string; qty: string; price: number };
  /** Core design price. Starting price = base + platform + lighting. */
  basePrice: number;
}

/**
 * A decoration in the client catalog. Single source of truth for the client
 * portal (home page, detail page, cards, carousel, modals).
 */
export interface DecorationItem {
  id: number;
  /** Id of the decoration in the dashboard (absent for built-in samples). */
  sid?: string | undefined;
  /** All photos of the decoration (dashboard decorations only); `img` is the first. */
  images?: string[] | undefined;
  /** Style / colour tags for the filters (dashboard decorations only). */
  styles?: string[] | undefined;
  colors?: string[] | undefined;
  specs?: DecorationSpecs | undefined;
  vendor?: string | undefined;
  dimensions?: string | undefined;
  inclusions?: string[] | undefined;
  priceUnit?: string | undefined;
  ownerCompanyId?: string | undefined;
  ownerCompanyName?: string | undefined;
  imagesCount?: number | undefined;
  tags?: string[] | undefined;
  cat: Category | string;
  t: string;
  d: string;
  p: number;
  u?: string | undefined;
  h?: number | undefined;
  g: [string, string];
  e: string;
  img: string;
}

export interface InquiryFormData {
  name: string;
  phone: string;
  email: string;
  date: string;
  location: string;
  message: string;
}
