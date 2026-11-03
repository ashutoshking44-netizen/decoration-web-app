import { describe, expect, it } from "bun:test";
import { getSearchSuggestions, highlightParts, matchScore, normalize } from "./searchSuggestions";

const catalog = [
  { id: 1, t: "Celestial Roman Arch Stage", cat: "Stage", p: 115000, img: "", styles: ["Royal"] },
  { id: 2, t: "Grand Floral Tunnel Gateway", cat: "Entrance", p: 48000, img: "", colors: ["Pink"] },
  { id: 3, t: "Vedic Golden Dome Marigold Mandap", cat: "Mandap", p: 75000, img: "" },
  { id: 4, t: "Royal Velvet Backdrop", cat: "Backdrops", p: 60000, img: "" },
];
const vendor: Record<number, string> = {
  1: "Royal Orchid Events",
  2: "Work Suvash",
  3: "Work Suvash",
  4: "Lalitpur Bloom Studios",
};
const getCompany = (i: { id: number }) => vendor[i.id] ?? "";

describe("search suggestions", () => {
  it("normalizes case, accents and punctuation", () => {
    expect(normalize("  Café-Décor!! ")).toBe("cafe decor");
  });

  it("returns nothing for an empty query", () => {
    expect(getSearchSuggestions(catalog, "   ", getCompany).all).toEqual([]);
  });

  it("matches companies by name with decoration counts", () => {
    const r = getSearchSuggestions(catalog, "work", getCompany);
    expect(r.companies).toEqual([
      { kind: "company", id: "company-work suvash", name: "Work Suvash", count: 2 },
    ]);
  });

  it("matches decorations by title and ranks title matches first", () => {
    const r = getSearchSuggestions(catalog, "royal", getCompany);
    // id 4 has "Royal" in the title; id 1 only via style/company keywords
    expect(r.decorations.map((d) => d.item.id)).toEqual([4, 1]);
  });

  it("matches by category, company and keywords; all tokens must match", () => {
    expect(
      getSearchSuggestions(catalog, "mandap", getCompany).decorations.map((d) => d.item.id),
    ).toEqual([3]);
    expect(
      getSearchSuggestions(catalog, "pink gateway", getCompany).decorations.map((d) => d.item.id),
    ).toEqual([2]);
    expect(getSearchSuggestions(catalog, "pink mandap", getCompany).all).toEqual([]);
  });

  it("lists companies before decorations for keyboard order", () => {
    const r = getSearchSuggestions(catalog, "royal", getCompany);
    expect(r.all[0]?.kind).toBe("company");
    expect(r.all.slice(r.companies.length).every((s) => s.kind === "decoration")).toBe(true);
  });

  it("respects result limits", () => {
    const r = getSearchSuggestions(catalog, "a", getCompany, {
      maxCompanies: 1,
      maxDecorations: 2,
    });
    expect(r.companies.length).toBeLessThanOrEqual(1);
    expect(r.decorations.length).toBeLessThanOrEqual(2);
  });

  it("scores word-start matches above mid-word matches", () => {
    expect(matchScore("Golden Dome", ["dom"], "dom")).toBeGreaterThan(
      matchScore("Random", ["dom"], "dom"),
    );
  });

  it("highlights matched parts", () => {
    expect(highlightParts("Grand Floral Tunnel", "flo")).toEqual([
      { text: "Grand ", match: false },
      { text: "Flo", match: true },
      { text: "ral Tunnel", match: false },
    ]);
  });
});
