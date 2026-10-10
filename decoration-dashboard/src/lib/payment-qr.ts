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

export function usePaymentQrs() {
  const [qrs, setQrs] = useState<PaymentQr[]>(loadPaymentQrs);

  useEffect(() => {
    // Initial fetch from Supabase
    fetchPaymentQrsFromSupabase().then((data) => {
      if (data && data.length > 0) {
        setQrs(data);
        savePaymentQrs(data);
      } else {
        const local = loadPaymentQrs();
        if (local.length > 0) {
          void savePaymentQrsToSupabase(local);
        }
      }
    });
  }, []);

  const update = useCallback((next: PaymentQr[]): boolean => {
    setQrs(next);
    savePaymentQrs(next);
    void savePaymentQrsToSupabase(next);
    return true;
  }, []);

  return { qrs, update };
}
