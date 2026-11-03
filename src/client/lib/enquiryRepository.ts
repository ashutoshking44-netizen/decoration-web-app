export interface StoredEnquiryItem {
  id: string;
  client_name: string;
  phone: string;
  whatsapp_number?: string | undefined;
  whatsappNumber?: string | undefined;
  whatsappSameAsPhone?: boolean | undefined;
  email?: string | undefined;
  venue?: string | null | undefined;
  ceremony_type?: string | null | undefined;
  date_iso?: string | null | undefined;
  source: string;
  status: string;
  order_type: string;
  estimated_budget_npr: number;
  private_note?: string | null | undefined;
  events?: any[] | undefined;
  company_id?: string | undefined;
  owner_company_id?: string | undefined;
  owner_company_name?: string | undefined;
  created_at: string;
  updated_at: string;
}

export const ENQUIRY_STORAGE_KEY = "decoration_app_enquiries_v1";

export class EnquiryRepository {
  private readonly storageKey = ENQUIRY_STORAGE_KEY;

  getAll(): StoredEnquiryItem[] {
    try {
      if (typeof window === "undefined") return [];
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("[EnquiryRepository] Error reading enquiries from localStorage:", err);
      return [];
    }
  }

  save(items: StoredEnquiryItem[]): boolean {
    try {
      if (typeof window === "undefined") return false;
      localStorage.setItem(this.storageKey, JSON.stringify(items));
      window.dispatchEvent(new Event("enquiries-synced"));
      return true;
    } catch (err) {
      console.error("[EnquiryRepository] Error saving enquiries to localStorage:", err);
      return false;
    }
  }

  add(item: StoredEnquiryItem): boolean {
    const list = this.getAll();
    const filtered = list.filter((e) => e.id !== item.id);
    filtered.unshift(item);
    return this.save(filtered);
  }

  addMany(items: StoredEnquiryItem[]): boolean {
    const list = this.getAll();
    const newIds = new Set(items.map((i) => i.id));
    const filtered = list.filter((e) => !newIds.has(e.id));
    filtered.unshift(...items);
    return this.save(filtered);
  }
}

export const enquiryRepository = new EnquiryRepository();
