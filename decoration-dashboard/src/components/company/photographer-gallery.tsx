import { useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { GalleryPhoto } from "@/lib/photographer-gallery";

/** Photo list of what photographers have sent. Staff add photos here for now. */
export function PhotographerGallery({
  photos,
  ready,
  onAdd,
  onRemove,
  onCreateDecoration,
}: {
  photos: GalleryPhoto[];
  ready: boolean;
  onAdd: (files: File[], meta: { photographer: string; event: string }) => Promise<number>;
  onRemove: (id: string) => void | Promise<void>;
  onCreateDecoration?: (photo: GalleryPhoto) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photographer, setPhotographer] = useState("");
  const [event, setEvent] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("All");
  const [preview, setPreview] = useState<GalleryPhoto | null>(null);

  const photographers = useMemo(
    () => ["All", ...Array.from(new Set(photos.map((p) => p.photographer || "Unnamed")))],
    [photos],
  );
  const shown = photos.filter((p) => filter === "All" || (p.photographer || "Unnamed") === filter);

  const handleFiles = async (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (fileRef.current) fileRef.current.value = "";
    if (files.length === 0) return;
    setBusy(true);
    const saved = await onAdd(files, { photographer, event });
    setBusy(false);
    if (saved === 0) toast.error("Couldn't save the photos in this browser.");
    else toast.success(`${saved} photo${saved > 1 ? "s" : ""} added to the gallery`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Photographer Gallery
            </h1>
            <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground shadow-2xs">
              {photos.length} {photos.length === 1 ? "photo" : "photos"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Photos received from your event photographers.
          </p>
        </div>
      </div>

      {/* Add photos */}
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Photographer
          </span>
          <Input
            value={photographer}
            onChange={(e) => setPhotographer(e.target.value)}
            placeholder="e.g. Ram Studio"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Event (optional)
          </span>
          <Input
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            placeholder="e.g. Sharma wedding"
          />
        </label>
        <Button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="h-10 gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          Add photos
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {photographers.length > 2 && (
        <div className="flex flex-wrap gap-2">
          {photographers.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setFilter(name)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                filter === name
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {!ready ? null : shown.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
          <Camera className="mb-3 size-8 text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">No photos yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Photos from your photographers will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((p) => (
            <div
              key={p.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setPreview(p)}
                className="block aspect-square w-full cursor-zoom-in"
              >
                <img src={p.src} alt={p.event || "Photographer photo"} className="size-full object-cover" />
              </button>
              <div className="px-2.5 py-2">
                <p className="truncate text-xs font-semibold text-foreground">
                  {p.photographer || "Unnamed"}
                </p>
                {p.event && <p className="truncate text-[11px] text-muted-foreground">{p.event}</p>}
                {onCreateDecoration && (
                  <button
                    type="button"
                    onClick={() => onCreateDecoration(p)}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-1.5 text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    <Sparkles className="size-3" />
                    Create decoration
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => void onRemove(p.id)}
                aria-label="Delete photo"
                className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-white/90 text-stone-600 opacity-0 shadow transition hover:text-rose-600 group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-stone-800"
            onClick={() => setPreview(null)}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
          <img
            src={preview.src}
            alt="Photographer photo"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {onCreateDecoration && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const photo = preview;
                setPreview(null);
                onCreateDecoration(photo);
              }}
              className="absolute bottom-6 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg"
            >
              <Sparkles className="size-4" />
              Create decoration from this photo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
