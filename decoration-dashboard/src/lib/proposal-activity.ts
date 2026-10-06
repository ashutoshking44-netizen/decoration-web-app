import { useState, useEffect, useCallback } from "react";
import type { ClientCeremonyItem } from "./clients";

export interface ProposalActivity {
  proposalId: string;
  viewCount: number;
  lastViewedAt: string | null;
  addonsSelectedCount: number;
  interest: "interested" | "not_for_us" | null;
}

const STORAGE_PREFIX = "decor_proposal_activity_";

// Deterministic initial seed data so the cards look realistic immediately
function getInitialSeedActivity(proposalId: string): ProposalActivity {
  const lower = proposalId.toLowerCase();
  if (lower.includes("karki")) {
    return {
      proposalId,
      viewCount: 3,
      lastViewedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
      addonsSelectedCount: 2,
      interest: null,
    };
  }
  if (lower.includes("aarav") || lower.includes("riya")) {
    return {
      proposalId,
      viewCount: 5,
      lastViewedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45m ago
      addonsSelectedCount: 1,
      interest: "interested",
    };
  }
  if (lower.includes("sworup") || lower.includes("enq")) {
    return {
      proposalId,
      viewCount: 1,
      lastViewedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4h ago
      addonsSelectedCount: 0,
      interest: null,
    };
  }
  return {
    proposalId,
    viewCount: 0,
    lastViewedAt: null,
    addonsSelectedCount: 0,
    interest: null,
  };
}

export function getStoredProposalActivity(proposalId: string): ProposalActivity {
  if (typeof window === "undefined" || !proposalId) {
    return getInitialSeedActivity(proposalId || "default");
  }
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${proposalId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to read proposal activity", err);
  }
  const seeded = getInitialSeedActivity(proposalId);
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${proposalId}`, JSON.stringify(seeded));
  } catch {
    // Ignore storage quota
  }
  return seeded;
}

export function saveStoredProposalActivity(activity: ProposalActivity): void {
  if (typeof window === "undefined" || !activity.proposalId) return;
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${activity.proposalId}`,
      JSON.stringify(activity)
    );
    window.dispatchEvent(
      new CustomEvent("proposal-activity-changed", {
        detail: { proposalId: activity.proposalId },
      })
    );
  } catch (err) {
    console.error("Failed to save proposal activity", err);
  }
}

export function useProposalActivity(proposalId: string) {
  const [activity, setActivity] = useState<ProposalActivity>(() =>
    getStoredProposalActivity(proposalId)
  );

  useEffect(() => {
    setActivity(getStoredProposalActivity(proposalId));

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ proposalId: string }>;
      if (customEvent.detail?.proposalId === proposalId) {
        setActivity(getStoredProposalActivity(proposalId));
      }
    };

    window.addEventListener("proposal-activity-changed", handleUpdate);
    return () => {
      window.removeEventListener("proposal-activity-changed", handleUpdate);
    };
  }, [proposalId]);

  const updateActivity = useCallback(
    (patch: Partial<ProposalActivity>) => {
      const current = getStoredProposalActivity(proposalId);
      const next: ProposalActivity = { ...current, ...patch, proposalId };
      saveStoredProposalActivity(next);
      setActivity(next);
    },
    [proposalId]
  );

  return { activity, updateActivity };
}

/**
 * Computes grand total matching proposal computation
 */
export function computeProposalGrandTotal(
  ceremonies?: ClientCeremonyItem[],
  fallbackAmount?: number
): number {
  if (ceremonies && ceremonies.length > 0) {
    const sumCeremonies = ceremonies.reduce(
      (sum, c) => sum + (Number(c.setupPrice) || 0),
      0
    );
    if (sumCeremonies > 0) return sumCeremonies;
  }
  return Number(fallbackAmount) || 0;
}

/**
 * Counts ceremonies that have 0 or missing setup price (TBC items)
 */
export function countPendingPriceItems(
  ceremonies?: ClientCeremonyItem[]
): number {
  if (!ceremonies || ceremonies.length === 0) return 0;
  return ceremonies.filter(
    (c) => c.setupPrice === undefined || c.setupPrice === null || Number(c.setupPrice) === 0
  ).length;
}
