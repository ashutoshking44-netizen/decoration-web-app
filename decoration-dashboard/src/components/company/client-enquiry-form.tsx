import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ImagePlus,
  Link as LinkIcon,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Pencil,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  loadStoredEnquiries,
  saveStoredEnquiries,
  type EnquiryEvent,
  type EnquiryItem,
} from "@/lib/enquiries";
import { upsertEnquiryInSupabase } from "@/lib/supabase-service";
import { convertAdToBs } from "@/lib/event-schedule";
import { saveEnquiryPhotos } from "@/lib/enquiry-photos";
import {
  EnquiryDatePicker,
  adDateLabel,
  bsDateLabel,
  type PickedDate,
} from "./enquiry-date-picker";

/**
 * Public, client-facing enquiry form (/enquire).
 *
 * Supports several events in one enquiry (e.g. Mehendi + Wedding + Reception)
 * and optional reference photos. Submissions are stored as a new "unreviewed"
 * enquiry in the same store the Enquiries & Quotations page reads.
 *
 * Because this app persists to browser localStorage (no backend), a submission
 * made on the client's own phone cannot reach the studio's browser by itself —
 * so after submitting, the client is offered a one-tap "Send to studio on
 * WhatsApp" with the enquiry pre-filled (photos are shared in that chat).
 */

const CEREMONY_OPTIONS = [
  "Wedding",
  "Wedding Reception",
  "Engagement / Ring Exchange",
  "Mehendi",
  "Haldi",
  "Sangeet / Cocktail",
  "Bratabandha",
  "Pasni (Rice Feeding)",
  "Baby Shower",
  "Birthday",
  "Anniversary",
  "Corporate Event",
  "Other",
];

const LOCATION_OPTIONS = ["Inside Kathmandu Valley", "Outside Kathmandu Valley"];

/** What the client can ask for at each event (kept short: 6 options). */
const DECOR_NEEDS = [
  { id: "Stage", hint: "Main stage & seating backdrop", placeholder: "e.g. Floral arch, sofa styling, backdrop draping..." },
  { id: "Mandap", hint: "Wedding / ritual mandap", placeholder: "e.g. 4-pillar traditional, pastel florals, open canopy..." },
  { id: "Entrance Gate", hint: "Welcome arch at the entrance", placeholder: "e.g. Floral walkway, fairy lights, welcoming arches..." },
  { id: "Backdrop", hint: "Photo & selfie backdrop", placeholder: "e.g. Neon sign, floral photo wall, selfie frame..." },
  { id: "Welcome Board", hint: "Name & welcome signage", placeholder: "e.g. Acrylic mirror with easel, floral corner swag..." },
  { id: "Flowers & Lighting", hint: "Floral styling and lights", placeholder: "e.g. Marigold strings, warm ambient fairy lights..." },
] as const;
const MAX_EVENTS = 6;
const MAX_PHOTOS = 5;
const STEPS = ["Details", "Dates", "Events", "Review"] as const;
const LAST_STEP = STEPS.length - 1;

export interface ClientEnquiryFormProps {
  studioName?: string | undefined;
  studioWhatsapp?: string | undefined;
}

export interface CategoryDetail {
  note: string;
  photo?: Photo | null;
  link?: string | undefined;
}

interface EventForm {
  key: string;
  ceremony: string;
  ceremonyOther: string;
  dateAd: string; // "" when the date is still pending
  pendingLabel: string; // e.g. "Kartik 2083" for pending dates
  venue: string;
  needs: string[];
  categoryDetails?: Record<string, CategoryDetail>;
  note: string; // optional note for the studio about this event
  photos: Photo[]; // optional reference photos for this event
}

interface Photo {
  key: string;
  name: string;
  dataUrl: string;
}

interface FormState {
  name: string;
  phone: string;
  whatsappSame: boolean;
  email: string;
  whatsapp: string;
  city: string;
  locationType: string;
  website: string; // honeypot — real users never see/fill this
}

const EMPTY: FormState = {
  name: "",
  phone: "",
  whatsappSame: true,
  email: "",
  whatsapp: "",
  city: "",
  locationType: LOCATION_OPTIONS[0] ?? "",
  website: "",
};

let keySeq = 0;
const newKey = () => `k${Date.now().toString(36)}${keySeq++}`;

function newEvent(ceremony: string, date: PickedDate, prev?: EventForm): EventForm {
  return {
    key: newKey(),
    ceremony,
    ceremonyOther: "",
    dateAd: date.dateAd,
    pendingLabel: date.pendingLabel ?? "",
    venue: prev?.venue ?? "",
    needs: [],
    categoryDetails: {},
    note: "",
    photos: [],
  };
}

const NAME_SUGGESTIONS = [
  "Wedding",
  "Wedding Reception",
  "Mehendi",
  "Haldi",
  "Sangeet / Cocktail",
  "Engagement / Ring Exchange",
];

const dateKey = (d: { dateAd: string; pendingLabel?: string | undefined }) =>
  d.dateAd || `pending:${d.pendingLabel ?? ""}`;

/** Builds the events list from the chosen dates, keeping anything already filled in. */
function syncEventsFromDates(dates: PickedDate[], prev: EventForm[]): EventForm[] {
  const ordered = [...dates].sort((a, b) => {
    if (!a.dateAd && b.dateAd) return 1;
    if (a.dateAd && !b.dateAd) return -1;
    return a.dateAd.localeCompare(b.dateAd) || (a.pendingLabel ?? "").localeCompare(b.pendingLabel ?? "");
  });
  const out: EventForm[] = [];
  for (const d of ordered) {
    const existing = prev.filter((e) => dateKey(e) === dateKey(d));
    if (existing.length) {
      out.push(...existing);
      continue;
    }
    const used = new Set([...prev, ...out].map((e) => e.ceremony));
    const suggestion = NAME_SUGGESTIONS.find((c) => !used.has(c)) ?? "Other";
    out.push(newEvent(suggestion, d, out[out.length - 1] ?? prev[prev.length - 1]));
  }
  return out;
}

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

/** Normalise a Nepali mobile to international digits for wa.me (977XXXXXXXXXX). */
function toWhatsappDigits(v: string) {
  const d = digitsOnly(v);
  if (d.startsWith("977")) return d;
  if (d.length === 10) return `977${d}`;
  return d;
}

function formatAdLong(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Shrinks a photo to ≤1000px JPEG so several fit in browser storage. */
function compressImage(file: File, maxDim = 1000, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unsupported image"));
    };
    img.src = url;
  });
}

type EventErrors = Partial<Record<"ceremonyOther", string>>;

export function ClientEnquiryForm({ studioName, studioWhatsapp }: ClientEnquiryFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [dates, setDates] = useState<PickedDate[]>([]);
  const [dateError, setDateError] = useState("");
  const [events, setEvents] = useState<EventForm[]>([]);
  const [photoError, setPhotoError] = useState<{ key: string; msg: string } | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [eventErrors, setEventErrors] = useState<Record<string, EventErrors>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ enquiry: EnquiryItem; photosSaved: boolean } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string>("");
  const [step, setStep] = useState(0);
  const [eventIdx, setEventIdx] = useState(0); // which event is shown on the Events step
  const evIdx = Math.min(eventIdx, Math.max(events.length - 1, 0));

  const scrollTop = () => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goToStep = (n: number) => {
    setStep(n);
    scrollTop();
  };

  const studio = studioName?.trim() || "our studio";
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const patchEvent = (key: string, patch: Partial<EventForm>) =>
    setEvents((list) => list.map((e) => (e.key === key ? { ...e, ...patch } : e)));

  // Another event on the same date (e.g. Mehendi + Haldi on one day).
  const addEventSameDay = (source: EventForm) => {
    if (events.length >= MAX_EVENTS) return;
    const used = new Set(events.map((e) => e.ceremony));
    const suggestion = NAME_SUGGESTIONS.find((c) => !used.has(c)) ?? "Other";
    setEvents((list) => {
      const at = list.findIndex((e) => e.key === source.key);
      const next = newEvent(suggestion, { id: "", dateAd: source.dateAd, pendingLabel: source.pendingLabel }, source);
      const copy = [...list];
      copy.splice(at + 1, 0, next);
      return copy;
    });
    setEventIdx(evIdx + 1);
    scrollTop();
  };
  // Removing an event also removes its date if nothing else uses it.
  const removeEvent = (ev: EventForm) => {
    setEvents((list) => list.filter((e) => e.key !== ev.key));
    const stillUsed = events.some((e) => e.key !== ev.key && dateKey(e) === dateKey(ev));
    if (!stillUsed) setDates((ds) => ds.filter((d) => dateKey(d) !== dateKey(ev)));
    setEventIdx((i) => Math.max(0, Math.min(i, events.length - 2)));
  };

  const [categoryPhotoBusy, setCategoryPhotoBusy] = useState<string | null>(null);
  /** "Do you have a reference photo?" answer per event item, keyed `${eventKey}-${needId}`. */
  const [refChoice, setRefChoice] = useState<Record<string, "yes" | "no">>({});

  const updateCategoryNote = (eventKey: string, categoryId: string, note: string) => {
    setEvents((list) =>
      list.map((e) => {
        if (e.key !== eventKey) return e;
        const currentDetails = e.categoryDetails ?? {};
        const prevDetail = currentDetails[categoryId] ?? { note: "" };
        return {
          ...e,
          categoryDetails: {
            ...currentDetails,
            [categoryId]: {
              ...prevDetail,
              note,
            },
          },
        };
      })
    );
  };

  const updateCategoryLink = (eventKey: string, categoryId: string, link: string) => {
    setEvents((list) =>
      list.map((e) => {
        if (e.key !== eventKey) return e;
        const currentDetails = e.categoryDetails ?? {};
        const prevDetail = currentDetails[categoryId] ?? { note: "" };
        return {
          ...e,
          categoryDetails: {
            ...currentDetails,
            [categoryId]: {
              ...prevDetail,
              link,
            },
          },
        };
      })
    );
  };

  const handleCategoryPhotoUpload = async (
    eventKey: string,
    categoryId: string,
    files: FileList | null
  ) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 25 * 1024 * 1024) {
      toast.error("Please select a valid image file (JPG or PNG up to 25MB).");
      return;
    }

    const busyKey = `${eventKey}-${categoryId}`;
    setCategoryPhotoBusy(busyKey);

    try {
      const dataUrl = await compressImage(file);
      const photo: Photo = {
        key: newKey(),
        name: file.name,
        dataUrl,
      };

      setEvents((list) =>
        list.map((e) => {
          if (e.key !== eventKey) return e;
          const currentDetails = e.categoryDetails ?? {};
          const prevDetail = currentDetails[categoryId] ?? { note: "" };
          return {
            ...e,
            categoryDetails: {
              ...currentDetails,
              [categoryId]: {
                ...prevDetail,
                photo,
              },
            },
          };
        })
      );
      toast.success(`Photo attached for ${categoryId}!`);
    } catch {
      toast.error("Could not process this image. Please try another photo.");
    } finally {
      setCategoryPhotoBusy(null);
    }
  };

  const removeCategoryPhoto = (eventKey: string, categoryId: string) => {
    setEvents((list) =>
      list.map((e) => {
        if (e.key !== eventKey) return e;
        const currentDetails = e.categoryDetails ?? {};
        const prevDetail = currentDetails[categoryId];
        if (!prevDetail) return e;
        return {
          ...e,
          categoryDetails: {
            ...currentDetails,
            [categoryId]: {
              ...prevDetail,
              photo: null,
            },
          },
        };
      })
    );
  };

  async function handleFiles(files: FileList | null) {
    const key = uploadTarget.current;
    const target = events.find((e) => e.key === key);
    if (!files || files.length === 0 || !target) return;
    setPhotoError(null);
    const room = MAX_PHOTOS - target.photos.length;
    if (room <= 0) {
      setPhotoError({ key, msg: `You can attach up to ${MAX_PHOTOS} photos per event.` });
      return;
    }
    setPhotoBusy(true);
    const added: Photo[] = [];
    let skipped = 0;
    for (const file of Array.from(files).slice(0, room)) {
      if (!file.type.startsWith("image/") || file.size > 25 * 1024 * 1024) {
        skipped++;
        continue;
      }
      try {
        added.push({ key: newKey(), name: file.name, dataUrl: await compressImage(file) });
      } catch {
        skipped++;
      }
    }
    if (files.length > room)
      setPhotoError({ key, msg: `Only ${MAX_PHOTOS} photos can be attached per event.` });
    else if (skipped)
      setPhotoError({ key, msg: "Some files couldn't be added (use JPG or PNG photos)." });
    setEvents((list) =>
      list.map((e) => (e.key === key ? { ...e, photos: [...e.photos, ...added] } : e)),
    );
    setPhotoBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function validateStep(n: number) {
    if (n === 0) {
      const e: Partial<Record<keyof FormState, string>> = {};
      if (form.name.trim().length < 2) e.name = "Please enter your name.";
      if (digitsOnly(form.phone).length < 9) e.phone = "Enter a valid phone number.";
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
        e.email = "Enter a valid email or leave it blank.";
      if (!form.whatsappSame && digitsOnly(form.whatsapp).length < 9)
        e.whatsapp = "Enter a valid WhatsApp number.";
      if (!form.city.trim()) e.city = "Tell us the city or area.";
      setErrors(e);
      return Object.keys(e).length === 0;
    }
    if (n === 1) {
      if (dates.length === 0) {
        setDateError("Select at least one event date.");
        return false;
      }
      setDateError("");
      return true;
    }
    if (n === 2) {
      const ee: Record<string, EventErrors> = {};
      for (const ev of events) {
        if (ev.ceremony === "Other" && !ev.ceremonyOther.trim())
          ee[ev.key] = { ceremonyOther: "Name the event." };
      }
      setEventErrors(ee);
      return Object.keys(ee).length === 0;
    }
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    if (step === 1) {
      setEvents((prev) => syncEventsFromDates(dates, prev));
      setEventIdx(0);
    }
    goToStep(Math.min(step + 1, LAST_STEP));
  }

  /** Continue/Back inside the Events step move between events, one per page. */
  function nextEventOrStep() {
    const ev = events[evIdx];
    if (ev && ev.ceremony === "Other" && !ev.ceremonyOther.trim()) {
      setEventErrors((e) => ({ ...e, [ev.key]: { ceremonyOther: "Name the event." } }));
      return;
    }
    if (evIdx < events.length - 1) {
      setEventIdx(evIdx + 1);
      scrollTop();
      return;
    }
    goNext();
  }

  function goBack() {
    if (step === 2 && evIdx > 0) {
      setEventIdx(evIdx - 1);
      scrollTop();
      return;
    }
    if (step === 3) setEventIdx(Math.max(0, events.length - 1));
    goToStep(step - 1);
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (form.website) return; // bot
    if (step === 2) {
      nextEventOrStep();
      return;
    }
    if (step < LAST_STEP) {
      goNext();
      return;
    }
    if (!validateStep(0)) return goToStep(0);
    if (!validateStep(1)) return goToStep(1);
    if (!validateStep(2)) {
      setEventIdx(
        Math.max(0, events.findIndex((e) => e.ceremony === "Other" && !e.ceremonyOther.trim())),
      );
      return goToStep(2);
    }
    setSubmitting(true);

    const now = new Date();
    const phone = form.phone.trim();
    const whatsapp = toWhatsappDigits(form.whatsappSame ? phone : form.whatsapp);

    // Convert form events → stored events, earliest date first.
    const stored: (EnquiryEvent & { iso: string; _photos: string[] })[] = events
      .map((e) => {
        const bs = e.dateAd ? convertAdToBs(e.dateAd) : null;

        // Collect category photos, links, and notes to build category_details map
        const categoryPhotos: Photo[] = [];
        const categoryDetailsMap: Record<string, { note?: string; photoUrl?: string; link?: string }> = {};

        for (const cat of e.needs) {
          const detail = e.categoryDetails?.[cat];
          if (detail) {
            if (detail.photo?.dataUrl) {
              categoryPhotos.push(detail.photo);
            }
            const catEntry: { note?: string; photoUrl?: string; link?: string } = {};
            if (detail.note?.trim()) {
              catEntry.note = detail.note.trim();
            }
            if (detail.photo?.dataUrl) {
              catEntry.photoUrl = detail.photo.dataUrl;
            }
            if (detail.link?.trim()) {
              catEntry.link = detail.link.trim();
            }
            if (catEntry.note || catEntry.photoUrl || catEntry.link) {
              categoryDetailsMap[cat] = catEntry;
            }
          }
        }

        // Combined photos: general event photos + category specific photos
        const allEventPhotos = [...e.photos, ...categoryPhotos];

        // Format combined note with category notes & links clearly labeled
        const catNotesSummary = Object.entries(categoryDetailsMap)
          .filter(([_, d]) => d.note || d.link)
          .map(([cat, d]) => {
            const parts: string[] = [];
            if (d.note) parts.push(d.note);
            if (d.link) parts.push(`Link: ${d.link}`);
            return `[${cat}]: ${parts.join(" · ")}`;
          })
          .join("\n");
        const combinedNote = [e.note.trim(), catNotesSummary].filter(Boolean).join("\n\n");

        return {
          iso: e.dateAd || "9999-12-31",
          name: e.ceremony === "Other" ? e.ceremonyOther.trim() : e.ceremony,
          date_ad: e.dateAd ? formatAdLong(e.dateAd) : "Date pending",
          date_iso: e.dateAd || undefined,
          date_bs: e.dateAd
            ? bs
              ? `${bs.formatted} BS`
              : ""
            : `${e.pendingLabel} BS (exact date pending)`,
          venue: e.venue.trim() || "Venue to be decided",
          requirements: e.needs.length ? e.needs : undefined,
          category_details: Object.keys(categoryDetailsMap).length ? categoryDetailsMap : undefined,
          note: combinedNote || undefined,
          photo_count: allEventPhotos.length || undefined,
          _photos: allEventPhotos.map((p) => p.dataUrl),
        };
      })
      .sort((a, b) => a.iso.localeCompare(b.iso));
    const eventList: EnquiryEvent[] = stored.map(
      ({ iso: _iso, _photos: _photos, ...rest }) => rest,
    );
    const first = eventList[0]!;

    const enquiry: EnquiryItem = {
      id: `enq-web-${now.getTime().toString(36)}`,
      client_name: form.name.trim(),
      phone,
      whatsapp_number: whatsapp,
      email: form.email.trim() || undefined,
      location: `${form.city.trim()} · ${form.locationType}`,
      source: "Website",
      created_at: now.toISOString(),
      time_ago_display: now.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      ceremony_type: first.name,
      date_bs: first.date_bs,
      date_ad: first.date_ad,
      venue: first.venue,
      availability_status: "free",
      availability_summary:
        "New online enquiry — check the calendar to confirm these dates are available.",
      status: "unreviewed",
      private_note: "",
      events: eventList,
    };

    // Photos go to IndexedDB (big quota), one entry per event. Do this before
    // saving the enquiry so we know whether they were stored.
    let photosSaved = true;
    let totalPhotos = 0;
    for (let i = 0; i < stored.length; i++) {
      const ph = stored[i]!._photos;
      if (ph.length === 0) continue;
      totalPhotos += ph.length;
      const ok = await saveEnquiryPhotos(`${enquiry.id}#${i}`, ph);
      eventList[i]!.photos_saved = ok;
      if (!ok) photosSaved = false;
    }
    if (totalPhotos > 0) {
      enquiry.reference_photo_count = totalPhotos;
      enquiry.reference_photos_saved = photosSaved;
    }

    try {
      const all = loadStoredEnquiries(true);
      saveStoredEnquiries([enquiry, ...all]);
      void upsertEnquiryInSupabase(enquiry);
    } catch {
      /* storage unavailable — WhatsApp hand-off below still works */
    }

    setSubmitted({ enquiry, photosSaved });
    setSubmitting(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Success state ──────────────────────────────────────────────────────
  if (submitted) {
    const q = submitted.enquiry;
    const evs = q.events ?? [];
    return (
      <Shell studio={studio}>
        <div className="rounded-[28px] border border-[#F3D5DB] bg-white p-8 text-center shadow-[0_12px_40px_rgba(232,84,111,.08)] sm:p-12">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-[#FFF0F3] text-[#D6415C]">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-[#5A1A26]">
            Thank you, {q.client_name.split(" ")[0]}!
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#6E5D57]">
            Your enquiry for{" "}
            <strong>{evs.length > 1 ? `${evs.length} events` : q.ceremony_type}</strong> has been
            recorded. {studio} will review it and send you a quotation.
          </p>
          {evs.length > 1 && (
            <ul className="mx-auto mt-4 max-w-xs space-y-1 text-left text-xs text-[#6E5D57]">
              {evs.map((e, i) => (
                <li key={i} className="flex justify-between gap-3 rounded-lg bg-[#FBF6F3] px-3 py-2">
                  <span className="font-semibold text-[#5A1A26]">{e.name}</span>
                  <span>{e.date_ad}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8">
            <button
              type="button"
              onClick={() => {
                setSubmitted(null);
                setForm(EMPTY);
                setDates([]);
                setEvents([]);
                setErrors({});
                setEventErrors({});
                setStep(0);
              }}
              className="text-xs font-semibold text-[#D6415C] underline-offset-2 hover:underline cursor-pointer"
            >
              Submit another enquiry
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────
  return (
    <Shell studio={studio}>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6 rounded-3xl border border-[#F3D5DB] bg-white p-4 shadow-[0_12px_40px_rgba(232,84,111,.08)] sm:space-y-8 sm:rounded-[28px] sm:p-10 lg:p-12"
      >
        <Stepper step={step} />

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />

        {/* Honeypot */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </label>
        </div>

        {step === 0 && (
          <Section icon={<User className="size-4" />} title="About you">
            {/* 1. Full name */}
            <Field label="Full name" error={errors.name} required>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8A7B76]" />
                <input
                  className={`${inputCls(!!errors.name)} pl-10`}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Sunita Sharma"
                  autoComplete="name"
                />
              </div>
            </Field>

            {/* 2. Phone number */}
            <Field label="Phone number" error={errors.phone} required>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8A7B76]" />
                <input
                  className={`${inputCls(!!errors.phone)} pl-10`}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="98XXXXXXXX"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
            </Field>

            {/* 3. WhatsApp number */}
            <div>
              <Field label="WhatsApp number" error={errors.whatsapp} required={!form.whatsappSame}>
                <div className="relative">
                  <MessageCircle className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#25D366]" />
                  <input
                    className={`${inputCls(!!errors.whatsapp)} pl-10 ${
                      form.whatsappSame ? "cursor-not-allowed bg-[#F3EDEA] text-[#8A7B76]" : ""
                    }`}
                    value={form.whatsappSame ? form.phone : form.whatsapp}
                    onChange={(e) => set("whatsapp", e.target.value)}
                    readOnly={form.whatsappSame}
                    placeholder="98XXXXXXXX"
                    inputMode="tel"
                  />
                </div>
              </Field>
              <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-xs font-medium text-[#6E5D57] select-none">
                <input
                  type="checkbox"
                  checked={form.whatsappSame}
                  onChange={(e) => {
                    set("whatsappSame", e.target.checked);
                    if (!e.target.checked && !form.whatsapp) set("whatsapp", form.phone);
                  }}
                  className="size-4 rounded accent-[#E8546F] cursor-pointer"
                />
                WhatsApp number is the same as my phone number
              </label>
            </div>

            {/* 4. Email address */}
            <Field label="Email address (optional)" error={errors.email}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8A7B76]" />
                <input
                  type="email"
                  className={`${inputCls(!!errors.email)} pl-10`}
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </Field>

            {/* 5. City / Area */}
            <Field label="City / area" error={errors.city} required>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8A7B76]" />
                <input
                  className={`${inputCls(!!errors.city)} pl-10`}
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="e.g. Kathmandu, Bouddha"
                />
              </div>
            </Field>

            {/* 6. Event location */}
            <Field label="Event location">
              <select
                className={inputCls(false)}
                value={form.locationType}
                onChange={(e) => set("locationType", e.target.value)}
              >
                {LOCATION_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
          </Section>
        )}
        {step === 1 && (
          <Section icon={<CalendarDays className="size-4" />} title="When is your event?">
            <p className="-mt-1 text-xs text-[#8A7B76]">
              Tap every date you need decoration. Mehendi, Wedding and Reception on different days?
              Select each day.
            </p>
            <EnquiryDatePicker
              dates={dates}
              onChange={(d) => {
                setDates(d);
                if (d.length) setDateError("");
              }}
              error={dateError}
            />
          </Section>
        )}
        {step === 2 && (
          <Section icon={<Sparkles className="size-4" />} title="Name your events & what you need">
            <p className="-mt-1 text-xs text-[#8A7B76]">
              One page per event. Name it, tick the decoration you'd like, and optionally add
              reference photos and a note. Not sure? Leave it — we'll guide you.
            </p>
            {events.slice(evIdx, evIdx + 1).map((ev) => {
              const idx = evIdx;
              const er = eventErrors[ev.key] ?? {};
              return (
                <div
                  key={ev.key}
                  className="space-y-5 rounded-2xl border border-[#F0E4DE] bg-[#FDFAF8] p-5 sm:p-7"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#9A6A1C]">
                        Event {idx + 1} of {events.length}
                      </span>
                      <p className="text-sm font-semibold text-[#5A1A26]">
                        {ev.dateAd ? bsDateLabel(ev.dateAd) : `${ev.pendingLabel} (date pending)`}
                      </p>
                      {ev.dateAd && (
                        <p className="text-[11px] text-[#8A7B76]">{adDateLabel(ev.dateAd)}</p>
                      )}
                    </div>
                    {events.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEvent(ev)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8A7B76] hover:text-[#D6415C]"
                      >
                        <Trash2 className="size-3.5" /> Remove
                      </button>
                    )}
                  </div>

                  {/* 1. Event name */}
                  <Field label="Event name" required>
                    <select
                      className={inputCls(false)}
                      value={ev.ceremony}
                      onChange={(e) => patchEvent(ev.key, { ceremony: e.target.value })}
                    >
                      {CEREMONY_OPTIONS.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>

                  {/* Name of event (if Other selected) */}
                  {ev.ceremony === "Other" && (
                    <Field label="Name of event" error={er.ceremonyOther} required>
                      <input
                        className={inputCls(!!er.ceremonyOther)}
                        value={ev.ceremonyOther}
                        onChange={(e) => patchEvent(ev.key, { ceremonyOther: e.target.value })}
                        placeholder="e.g. Sangeet, Haldi, Baby Shower"
                      />
                    </Field>
                  )}

                  {/* 2. Venue */}
                  <Field label="Venue (optional)">
                    <input
                      className={inputCls(false)}
                      value={ev.venue}
                      onChange={(e) => patchEvent(ev.key, { venue: e.target.value })}
                      placeholder="e.g. Majestic Grand"
                    />
                  </Field>

                  {/* Selection Grid (Top) */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-xs font-semibold text-[#5B4C47]">
                        What do you need?
                        <span className="ml-1 text-[11px] font-normal text-[#8A7B76]">
                          (Select all items that apply to this event)
                        </span>
                      </p>
                      {ev.needs.length > 0 && (
                        <span className="text-xs font-semibold text-[#E8546F]">
                          {ev.needs.length} selected
                        </span>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {DECOR_NEEDS.map((n) => {
                        const on = ev.needs.includes(n.id);

                        return (
                          <div
                            key={n.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              patchEvent(ev.key, {
                                needs: on
                                  ? ev.needs.filter((x) => x !== n.id)
                                  : [...ev.needs, n.id],
                              });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === " " || e.key === "Enter") {
                                e.preventDefault();
                                patchEvent(ev.key, {
                                  needs: on
                                    ? ev.needs.filter((x) => x !== n.id)
                                    : [...ev.needs, n.id],
                                });
                              }
                            }}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-all duration-200 select-none",
                              on
                                ? "border-[#E8546F] bg-[#FFF8F9] shadow-xs ring-1 ring-[#E8546F]/20"
                                : "border-[#E7DCD6] bg-white hover:border-[#FDC2CD] hover:bg-[#FFFDFD]"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => {}} // toggled by card onClick
                              className="mt-0.5 size-4 rounded accent-[#E8546F] cursor-pointer shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="block text-sm font-semibold text-[#2B2320]">
                                  {n.id}
                                </span>
                                {on && (
                                  <span className="rounded-full bg-[#FFE6EC] px-2 py-0.5 text-[10px] font-bold text-[#E8546F] shrink-0">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <span className="block text-[11px] text-[#8A7B76] leading-snug mt-0.5">
                                {n.hint}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dynamic Sub-Sections (Bottom): Automatically appears when items are selected */}
                  {ev.needs.length > 0 && (
                    <div className="space-y-4 border-t border-[#F0E4DE] pt-5 animate-in fade-in-50 duration-200">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-[#5A1A26]">
                            Selected Items Details ({ev.needs.length})
                          </h4>
                          <span className="text-xs text-[#8A7B76]">
                            {ev.needs.length} item{ev.needs.length > 1 ? "s" : ""} to customize
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#8A7B76]">
                          Add reference photos, inspiration links (Pinterest/Instagram), or specific notes for each selected item.
                        </p>
                      </div>

                      <div className="space-y-4">
                        {ev.needs.map((needId) => {
                          const needMeta = DECOR_NEEDS.find((d) => d.id === needId);
                          const detail = ev.categoryDetails?.[needId] ?? { note: "" };
                          const isBusy = categoryPhotoBusy === `${ev.key}-${needId}`;
                          const choice: "yes" | "no" | undefined =
                            refChoice[`${ev.key}-${needId}`] ?? (detail.photo || detail.link ? "yes" : undefined);

                          return (
                            <div
                              key={needId}
                              className="rounded-2xl border border-[#F0E4DE] bg-white p-4 sm:p-5 shadow-xs transition-all space-y-4 animate-in fade-in-50 duration-200"
                            >
                              {/* Clear heading for this item */}
                              <div className="flex items-center justify-between border-b border-[#F5EAE6] pb-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="flex size-7 items-center justify-center rounded-lg bg-[#FFF0F3] text-xs font-bold text-[#D6415C]">
                                    {ev.needs.indexOf(needId) + 1}
                                  </span>
                                  <div>
                                    <h5 className="text-sm font-bold text-[#2B2320]">
                                      {needId}
                                    </h5>
                                    {needMeta && (
                                      <span className="text-[11px] text-[#8A7B76]">
                                        {needMeta.hint}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    patchEvent(ev.key, {
                                      needs: ev.needs.filter((x) => x !== needId),
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 rounded-full border border-[#F0E4DE] px-2.5 py-1 text-[11px] font-medium text-[#8A7B76] transition hover:bg-[#FFF0F3] hover:text-[#D6415C]"
                                  title={`Remove ${needId}`}
                                >
                                  <X className="size-3" />
                                  <span>Remove</span>
                                </button>
                              </div>

                              <div className="space-y-3.5">
                                {/* Simple yes / no question — the upload only appears after "Yes" */}
                                <div className="space-y-2">
                                  <p className="text-sm font-semibold text-[#2B2320]">
                                    Do you have a reference?
                                  </p>
                                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Reference photo">
                                    {(
                                      [
                                        ["yes", "Yes"],
                                        ["no", "No"],
                                      ] as const
                                    ).map(([value, label]) => (
                                      <button
                                        key={value}
                                        type="button"
                                        role="radio"
                                        aria-checked={choice === value}
                                        onClick={() => {
                                          setRefChoice((prev) => ({ ...prev, [`${ev.key}-${needId}`]: value }));
                                          // Answering "No" drops any photo already attached
                                          if (value === "no" && detail.photo) removeCategoryPhoto(ev.key, needId);
                                        }}
                                        className={cn(
                                          "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition active:scale-[0.98]",
                                          choice === value
                                            ? "border-[#E8546F] bg-[#FFF0F3] text-[#D6415C]"
                                            : "border-[#E7DCD6] bg-white text-[#5B4C47] hover:border-[#F0B5C0]",
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            "flex size-4 items-center justify-center rounded-full border",
                                            choice === value ? "border-[#E8546F]" : "border-[#CBBDB6]",
                                          )}
                                        >
                                          {choice === value && <span className="size-2 rounded-full bg-[#E8546F]" />}
                                        </span>
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {choice === "yes" && (
                                  <>
                                <div className="space-y-1.5">

                                  {detail.photo ? (
                                    <div className="flex items-center gap-3.5 rounded-xl border border-[#F0D5DC] bg-[#FFF8F9] p-3 max-w-md">
                                      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-[#F0D5DC] bg-white shadow-2xs">
                                        <img
                                          src={detail.photo.dataUrl}
                                          alt={`${needId} reference`}
                                          className="size-full object-cover"
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1 space-y-1">
                                        <p
                                          className="truncate text-xs font-semibold text-[#2B2320]"
                                          title={detail.photo.name}
                                        >
                                          {detail.photo.name}
                                        </p>
                                        <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                                          <span className="inline-block size-1.5 rounded-full bg-emerald-500 shrink-0" />
                                          Photo attached
                                        </p>
                                        <div className="flex items-center gap-2 pt-0.5">
                                          <label
                                            htmlFor={`cat-file-${ev.key}-${needId}`}
                                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#E7DCD6] bg-white px-2 py-0.5 text-[11px] font-medium text-[#5B4C47] shadow-2xs hover:border-[#E8546F] hover:text-[#D6415C] transition"
                                          >
                                            <Upload className="size-2.5" />
                                            <span>Change</span>
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => removeCategoryPhoto(ev.key, needId)}
                                            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-[#8A7B76] hover:bg-[#FFF0F3] hover:text-[#D6415C] transition"
                                          >
                                            <Trash2 className="size-2.5" />
                                            <span>Remove</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap items-center gap-2.5">
                                      <label
                                        htmlFor={`cat-file-${ev.key}-${needId}`}
                                        className={cn(
                                          "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition shadow-2xs select-none",
                                          isBusy
                                            ? "border-[#E8546F] bg-[#FFF0F3] text-[#D6415C] opacity-75 cursor-not-allowed"
                                            : "border-[#F0D5DC] bg-[#FFF8F9] text-[#D6415C] hover:border-[#E8546F] hover:bg-[#FFF0F3] active:scale-[0.98]"
                                        )}
                                      >
                                        {isBusy ? (
                                          <>
                                            <Loader2 className="size-3.5 animate-spin" />
                                            <span>Compressing photo...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Upload className="size-3.5" />
                                            <span>Upload</span>
                                          </>
                                        )}
                                      </label>
                                      <span className="text-[11px] text-[#8A7B76]">PNG, JPG up to 25MB</span>
                                    </div>
                                  )}

                                  <input
                                    type="file"
                                    id={`cat-file-${ev.key}-${needId}`}
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isBusy}
                                    onChange={(e) => {
                                      handleCategoryPhotoUpload(ev.key, needId, e.target.files);
                                      e.target.value = "";
                                    }}
                                  />
                                </div>

                                {/* Reference link (optional) */}
                                <div>
                                  <label
                                    htmlFor={`cat-link-${ev.key}-${needId}`}
                                    className="mb-1 block text-xs font-semibold text-[#5B4C47]"
                                  >
                                    Reference link <span className="font-normal text-[#8A7B76]">(optional)</span>
                                  </label>
                                  <div className="relative">
                                    <LinkIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8A7B76]" />
                                    <input
                                      id={`cat-link-${ev.key}-${needId}`}
                                      type="url"
                                      className="w-full rounded-xl border border-[#E7DCD6] bg-white pl-8 pr-3 py-2 text-xs text-[#2B2320] outline-none transition placeholder:text-[#B5A7A1] focus:border-[#E8546F] focus:ring-2 focus:ring-[#E8546F]/15"
                                      value={detail.link || ""}
                                      onChange={(e) => updateCategoryLink(ev.key, needId, e.target.value)}
                                      placeholder="e.g. Instagram or Pinterest link"
                                    />
                                  </div>
                                </div>
                                  </>
                                )}

                                {/* Specific notes for item (optional) */}
                                <div>
                                  <label
                                    htmlFor={`cat-note-${ev.key}-${needId}`}
                                    className="mb-1 block text-xs font-semibold text-[#5B4C47]"
                                  >
                                    Specific notes for {needId}{" "}
                                    <span className="font-normal text-[#8A7B76]">(optional)</span>
                                  </label>
                                  <textarea
                                    id={`cat-note-${ev.key}-${needId}`}
                                    rows={2}
                                    className="w-full rounded-xl border border-[#E7DCD6] bg-white px-3 py-2 text-xs text-[#2B2320] outline-none transition placeholder:text-[#B5A7A1] focus:border-[#E8546F] focus:ring-2 focus:ring-[#E8546F]/15 resize-none"
                                    value={detail.note || ""}
                                    onChange={(e) => updateCategoryNote(ev.key, needId, e.target.value)}
                                    placeholder={needMeta?.placeholder || `Colours, style, or details for ${needId}…`}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-[#F0E4DE] pt-4">
                    <Field label="Overall note for the studio (optional)">
                      <textarea
                        rows={3}
                        className={inputCls(false)}
                        value={ev.note}
                        onChange={(e) => patchEvent(ev.key, { note: e.target.value })}
                        placeholder="Theme, colours, general ideas…"
                      />
                    </Field>
                  </div>

                  {events.length < MAX_EVENTS && (
                    <button
                      type="button"
                      onClick={() => addEventSameDay(ev)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D6415C] hover:underline"
                    >
                      <Plus className="size-3.5" />
                      Add another event on this date
                    </button>
                  )}
                </div>
              );
            })}
          </Section>
        )}
        {step === 3 && (
          <div className="space-y-5">
            <p className="text-sm font-semibold text-[#5A1A26]">
              Please check your details before sending.
            </p>

            <ReviewCard title="About you" onEdit={() => goToStep(0)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#2B2320]">{form.name}</p>
                  <p className="text-xs text-[#6E5D57]">
                    <span className="font-medium text-[#9A6A1C]">Phone: </span>
                    {form.phone}
                    {form.whatsappSame ? " (same for WhatsApp)" : form.whatsapp ? ` · WhatsApp ${form.whatsapp}` : ""}
                  </p>
                  {form.email.trim() && (
                    <p className="text-xs text-[#6E5D57]">
                      <span className="font-medium text-[#9A6A1C]">Email: </span>
                      {form.email.trim()}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-[#6E5D57]">
                    <span className="font-medium text-[#9A6A1C]">City / Area: </span>
                    <span className="font-semibold text-[#2B2320]">{form.city}</span>
                  </p>
                  <p className="text-xs text-[#6E5D57]">
                    <span className="font-medium text-[#9A6A1C]">Location: </span>
                    {form.locationType}
                  </p>
                </div>
              </div>
            </ReviewCard>

            <ReviewCard
              title={events.length > 1 ? `Events (${events.length})` : "Event"}
              onEdit={() => {
                setEventIdx(0);
                goToStep(2);
              }}
            >
              <div className="space-y-2.5">
                {events.map((ev) => {
                  const bs = ev.dateAd ? convertAdToBs(ev.dateAd)?.formatted : "";
                  return (
                    <div key={ev.key} className="rounded-lg bg-white px-3 py-2.5">
                      <p className="font-semibold text-[#2B2320]">
                        {ev.ceremony === "Other" ? ev.ceremonyOther : ev.ceremony}
                      </p>
                      <p>
                        {ev.dateAd
                          ? `${formatAdLong(ev.dateAd)}${bs ? ` (${bs} BS)` : ""}`
                          : `${ev.pendingLabel} — exact date pending`}
                      </p>
                      {ev.venue.trim() && <p>{ev.venue}</p>}

                      {ev.needs.length > 0 ? (
                        <div className="pt-2 space-y-1.5">
                          <span className="text-[11px] font-semibold text-[#9A6A1C] block">
                            Requested Items ({ev.needs.length}):
                          </span>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {ev.needs.map((needId) => {
                              const detail = ev.categoryDetails?.[needId];
                              return (
                                <div
                                  key={needId}
                                  className="rounded-xl border border-[#F0E4DE] bg-[#FBF6F3] p-2.5 space-y-1.5"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-[#2B2320]">
                                      {needId}
                                    </span>
                                    {detail?.photo && (
                                      <span className="text-[10px] text-[#D6415C] font-semibold bg-[#FFF0F3] px-1.5 py-0.5 rounded-full">
                                        📷 Photo attached
                                      </span>
                                    )}
                                  </div>
                                  {detail?.photo && (
                                    <img
                                      src={detail.photo.dataUrl}
                                      alt={`${needId} reference`}
                                      className="size-14 rounded-lg border border-[#E7DCD6] object-cover"
                                    />
                                  )}
                                  {detail?.link && (
                                    <p className="text-[11px] text-[#6E5D57] bg-white p-1.5 rounded-lg border border-[#EDE5DF] leading-snug truncate">
                                      <span className="font-semibold text-[#9A6A1C]">Link: </span>
                                      <a
                                        href={detail.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[#D6415C] hover:underline"
                                      >
                                        {detail.link}
                                      </a>
                                    </p>
                                  )}
                                  {detail?.note && (
                                    <p className="text-[11px] text-[#6E5D57] bg-white p-1.5 rounded-lg border border-[#EDE5DF] leading-snug">
                                      <span className="font-semibold text-[#9A6A1C]">Note: </span>
                                      {detail.note}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="pt-1 text-xs">
                          <span className="font-semibold text-[#9A6A1C]">Needs: </span>
                          Not selected — we'll guide you
                        </p>
                      )}

                      {ev.note.trim() && (
                        <p className="pt-1 text-xs">
                          <span className="font-semibold text-[#9A6A1C]">Overall Note: </span>
                          {ev.note.trim()}
                        </p>
                      )}
                      {ev.photos.length > 0 && (
                        <div className="pt-1.5 space-y-1">
                          <span className="text-[11px] font-semibold text-[#9A6A1C] block">
                            Overall Reference Photos:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {ev.photos.map((p) => (
                              <img
                                key={p.key}
                                src={p.dataUrl}
                                alt={p.name}
                                className="size-12 rounded-lg border border-[#E7DCD6] object-cover"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ReviewCard>
          </div>
        )}

        {/* On phones the actions stay pinned to the bottom so they're always under the thumb */}
        <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex items-center gap-3 rounded-b-3xl border-t border-[#F3D5DB] bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:pt-1 sm:backdrop-blur-none">
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-[#E7DCD6] bg-white px-5 py-3 text-base font-semibold text-[#5B4C47] transition hover:bg-[#FFF0F3] sm:text-sm"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || photoBusy}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E8546F] to-[#D6415C] px-6 py-3 text-base font-semibold text-white sm:text-sm shadow-[0_4px_14px_rgba(232,84,111,.3)] transition hover:brightness-95 disabled:opacity-60"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {step < LAST_STEP ? (
              <>
                {step === 2 && evIdx < events.length - 1
                  ? `Next: Event ${evIdx + 2}`
                  : step === 2
                    ? "Review enquiry"
                    : "Continue"}
                <ArrowRight className="size-4" />
              </>
            ) : (
              "Request a quotation"
            )}
          </button>
        </div>
        <p className="text-center text-[11px] text-[#8A7B76]">
          Your details are only used to prepare your quotation.
        </p>
      </form>
    </Shell>
  );
}

// ── small presentational helpers ──────────────────────────────────────────
function inputCls(hasError: boolean) {
  return [
    // 16px on phones stops iOS from zooming the page when a field is focused
    "w-full min-h-12 rounded-xl border bg-[#FBF6F3] px-3 py-2.5 text-base text-[#2B2320] outline-none transition sm:min-h-0 sm:text-sm",
    "placeholder:text-[#B5A7A1] focus:bg-white focus:ring-2 focus:ring-[#E8546F]/30",
    hasError ? "border-[#D6415C]" : "border-[#E7DCD6] focus:border-[#E8546F]",
  ].join(" ");
}

function Shell({ studio, children }: { studio: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FBF6F3] px-3 py-6 text-[#2B2320] sm:px-6 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-[850px]">
        <header className="mb-5 text-center sm:mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9A6A1C]">
            Decoration Enquiry
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold leading-tight text-[#5A1A26] sm:text-4xl">
            Plan your event with {studio}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[#6E5D57]">
            Share a few details and we'll prepare a personalised decoration quotation for you.
          </p>
        </header>
        {children}
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#5A1A26]">
        <span className="flex size-6 items-center justify-center rounded-full bg-[#FFF0F3] text-[#D6415C]">
          {icon}
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#5B4C47]">
        {label}
        {required && <span className="text-[#D6415C]"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] font-medium text-[#9A6A1C]">{hint}</p>}
      {error && <p className="mt-1 text-[11px] font-medium text-[#D6415C]">{error}</p>}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center justify-between gap-2 sm:gap-4" aria-label="Progress">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={[
                  "flex size-8 sm:size-9 items-center justify-center rounded-full text-xs font-bold transition",
                  done
                    ? "bg-[#E8546F] text-white shadow-xs"
                    : active
                      ? "bg-[#E8546F] text-white ring-4 ring-[#E8546F]/20 shadow-xs"
                      : "bg-[#F3EAE6] text-[#8A7B76]",
                ].join(" ")}
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </span>
              <span
                className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${
                  active ? "text-[#5A1A26]" : "text-[#8A7B76]"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={`mb-6 h-0.5 flex-1 rounded-full transition-colors ${done ? "bg-[#E8546F]" : "bg-[#F3EAE6]"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#F0E4DE] bg-[#FDFAF8] p-5 sm:p-6 text-sm text-[#6E5D57]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[#9A6A1C]">{title}</span>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#F0E4DE] bg-white px-3 py-1 text-[11px] font-semibold text-[#D6415C] transition hover:bg-[#FFF0F3]"
        >
          <Pencil className="size-3" /> Edit
        </button>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
