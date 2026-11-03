import { useCallback, useEffect, useState } from "react";
import { fetchPaymentQrsFromSupabase, savePaymentQrsToSupabase } from "./supabase-service";

/** Payment QR codes the studio shows to clients (eSewa, Fonepay, bank…). Max 4. */
export interface PaymentQr {
  id: string;
  /** Account holder / owner name */
  ownerName: string;
  /** Bank / wallet name, e.g. "Nabil Bank" or "eSewa" */
  label: string;
  /** Account number (optional) */
  accountNumber?: string | undefined;
  /** Image data URL or public URL */
  image: string;
}

export const MAX_PAYMENT_QRS = 4;
const KEY = "decoration-portal:payment-qrs";

export function loadPaymentQrs(): PaymentQr[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as PaymentQr[]) : [];
    return Array.isArray(list) ? list.slice(0, MAX_PAYMENT_QRS) : [];
  } catch {
    return [];
  }
}

/** Returns false if the browser refused to store it (quota). */
export function savePaymentQrs(list: PaymentQr[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_PAYMENT_QRS)));
    return true;
  } catch {
    return false;
  }
}

let qrsRemoteLoad: Promise<PaymentQr[] | undefined> | null = null;
let qrsRemoteLoadedAt = 0;
const QRS_FRESH_MS = 30_000;

/** Resolves the Supabase QR list, or undefined if the request failed (never [] on failure). */
function loadRemoteQrs(): Promise<PaymentQr[] | undefined> {
  if (qrsRemoteLoad && Date.now() - qrsRemoteLoadedAt < QRS_FRESH_MS) return qrsRemoteLoad;
  qrsRemoteLoadedAt = Date.now();
  qrsRemoteLoad = fetchPaymentQrsFromSupabase().catch((err) => {
    console.warn("[payment-qr] Loading payment QRs from Supabase failed:", err);
    qrsRemoteLoad = null;
    return undefined;
  });
  return qrsRemoteLoad;
}

export function usePaymentQrs() {
  const [qrs, setQrs] = useState<PaymentQr[]>(loadPaymentQrs);

  useEffect(() => {
    let active = true;
    // Initial fetch from Supabase (one request shared by every user of the hook)
    void loadRemoteQrs().then((data) => {
      if (!active || data === undefined) return; // request failed: keep local QRs, write nothing
      if (data.length > 0) {
        setQrs(data);
        savePaymentQrs(data);
      } else {
        // Supabase confirmed it has none yet: upload the local ones.
        const local = loadPaymentQrs();
        if (local.length > 0) {
          void savePaymentQrsToSupabase(local);
        }
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback((next: PaymentQr[]): boolean => {
    setQrs(next);
    savePaymentQrs(next);
    void savePaymentQrsToSupabase(next);
    return true;
  }, []);

  return { qrs, update };
}
