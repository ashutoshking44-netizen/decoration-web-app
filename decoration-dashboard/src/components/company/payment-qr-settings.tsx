import { useRef } from "react";
import { Plus, QrCode, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/photographer-gallery";
import { MAX_PAYMENT_QRS, usePaymentQrs, type PaymentQr } from "@/lib/payment-qr";

const inputCls =
  "w-full h-8 px-3 rounded-lg border border-[#E7DCD6] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#E8546F]";

/** Settings section: up to 4 payment QR codes, each with the owner's name. */
export function PaymentQrSettings({ bare = false }: { bare?: boolean } = {}) {
  const { qrs, update } = usePaymentQrs();
  const fileRef = useRef<HTMLInputElement>(null);
  const targetId = useRef<string | null>(null);

  const commit = (next: PaymentQr[]) => {
    if (!update(next)) toast.error("Couldn't save — browser storage is full.");
  };

  const add = () => {
    if (qrs.length >= MAX_PAYMENT_QRS) return;
    commit([
      ...qrs,
      { id: `qr-${Date.now().toString(36)}`, ownerName: "", label: "", image: "" },
    ]);
  };

  const patch = (id: string, p: Partial<PaymentQr>) =>
    commit(qrs.map((q) => (q.id === id ? { ...q, ...p } : q)));

  const pick = (id: string) => {
    targetId.current = id;
    fileRef.current?.click();
  };

  const onFile = async (files: FileList | null) => {
    const file = files?.[0];
    const id = targetId.current;
    if (fileRef.current) fileRef.current.value = "";
    if (!file || !id || !file.type.startsWith("image/")) return;
    try {
      patch(id, { image: await compressImage(file, 700, 0.92) });
    } catch {
      toast.error("Couldn't read that image.");
    }
  };

  return (
    <div className={bare ? "space-y-3" : "space-y-3 border-t border-[#E7DCD6] pt-4"}>
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-1.5 font-bold text-stone-700">
            <QrCode className="size-4 text-[#E8546F]" />
            Payment QR codes
          </p>
          <span className="text-[10px] text-[#8A7B76]">
            Add up to {MAX_PAYMENT_QRS} QR codes, each with the owner&apos;s name ({qrs.length}/
            {MAX_PAYMENT_QRS}).
          </span>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={qrs.length >= MAX_PAYMENT_QRS}
          className="inline-flex items-center gap-1 rounded-lg border border-[#FDC2CD] bg-[#FFF0F3] px-2.5 py-1.5 text-[11px] font-semibold text-[#C2284E] transition hover:bg-[#FFE4EA] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-3" />
          Add QR
        </button>
      </div>

      {qrs.length === 0 && (
        <p className="rounded-lg border border-dashed border-[#E7DCD6] px-3 py-5 text-center text-[11px] text-[#8A7B76]">
          No QR codes yet. Tap &ldquo;Add QR&rdquo; to upload one.
        </p>
      )}

      {qrs.map((q) => (
        <div key={q.id} className="flex gap-3 rounded-xl border border-[#E7DCD6] bg-[#FAF9F8] p-3">
          <button
            type="button"
            onClick={() => pick(q.id)}
            className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-[#E7DCD6] bg-white text-[10px] font-semibold text-[#8A7B76] transition hover:border-[#E8546F]"
            title={q.image ? "Replace QR image" : "Upload QR image"}
          >
            {q.image ? (
              <img src={q.image} alt="QR code" className="size-full object-contain" />
            ) : (
              <span className="flex flex-col items-center gap-1">
                <Upload className="size-4" />
                Upload QR
              </span>
            )}
          </button>
          <div className="min-w-0 flex-1 space-y-2">
            <input
              value={q.label}
              onChange={(e) => patch(q.id, { label: e.target.value })}
              placeholder="Bank / wallet name (e.g. Nabil Bank)"
              className={inputCls}
            />
            <input
              value={q.ownerName}
              onChange={(e) => patch(q.id, { ownerName: e.target.value })}
              placeholder="Account owner name"
              className={inputCls}
            />
            <input
              value={q.accountNumber ?? ""}
              onChange={(e) => patch(q.id, { accountNumber: e.target.value })}
              placeholder="Account number (optional)"
              className={inputCls}
            />
          </div>
          <button
            type="button"
            onClick={() => commit(qrs.filter((x) => x.id !== q.id))}
            aria-label="Remove QR"
            className="grid size-7 shrink-0 place-items-center rounded-full text-stone-400 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onFile(e.target.files)}
      />
    </div>
  );
}
