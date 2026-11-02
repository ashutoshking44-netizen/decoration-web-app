/**
 * Search autocomplete: pure, framework-free matching + ranking.
 *
 * Suggestions are computed locally from the (cached) catalog, so typing never
 * triggers a database request.
 */

/** Minimal shape needed from a catalog decoration. */
export interface SearchableDecoration {
  id: number;
  t: string; // title
  cat: string;
  p: number;
  img: string;
  images?: string[] | undefined;
  styles?: string[] | undefined;
  colors?: string[] | undefined;
}

export interface CompanySuggestion {
  kind: "company";
  id: string; // stable option id
  name: string;
  count: number; // decorations by this company
}

export interface DecorationSuggestion<T extends SearchableDecoration = SearchableDecoration> {
  kind: "decoration";
  id: string;
  item: T;
  company: string;
}

export type Suggestion<T extends SearchableDecoration = SearchableDecoration> =
  CompanySuggestion | DecorationSuggestion<T>;

export interface SuggestionResult<T extends SearchableDecoration = SearchableDecoration> {
  companies: CompanySuggestion[];
  decorations: DecorationSuggestion<T>[];
  /** Flat list in display order (companies first) for keyboard navigation. */
  all: Suggestion<T>[];
}

export const EMPTY_RESULT: SuggestionResult = { companies: [], decorations: [], all: [] };

/** Lower-case, strip accents and punctuation, collapse spaces. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Score how well `text` matches all query tokens (0 = no match).
 * Every token must appear; earlier/stronger matches rank higher:
 * whole text starts with query > a word starts with token > token inside a word.
 */
export function matchScore(text: string, tokens: string[], fullQuery: string): number {
  const hay = normalize(text);
  if (!hay || tokens.length === 0) return 0;
  let score = 0;
  for (const token of tokens) {
    const idx = hay.indexOf(token);
    if (idx === -1) return 0;
    const wordStart = idx === 0 || hay[idx - 1] === " ";
    score += wordStart ? 3 : 1;
  }
  if (hay.startsWith(fullQuery)) score += 6;
  if (hay === fullQuery) score += 4;
  return score;
}

export interface SuggestionOptions {
  maxCompanies?: number;
  maxDecorations?: number;
}

/**
 * Build suggestions for `query`.
 * - Companies match by name.
 * - Decorations match by title (strongest), company, category and style/colour keywords.
 */
export function getSearchSuggestions<T extends SearchableDecoration>(
  catalog: readonly T[],
  query: string,
  getCompany: (item: T) => string,
  { maxCompanies = 3, maxDecorations = 6 }: SuggestionOptions = {},
): SuggestionResult<T> {
  const fullQuery = normalize(query);
  if (!fullQuery) return EMPTY_RESULT as SuggestionResult<T>;
  const tokens = fullQuery.split(" ");

  // Companies (aggregated from the catalog)
  const companyCounts = new Map<string, number>();
  catalog.forEach((item) => {
    const name = getCompany(item);
    if (name) companyCounts.set(name, (companyCounts.get(name) ?? 0) + 1);
  });
  const companies: CompanySuggestion[] = [...companyCounts.entries()]
    .map(([name, count]) => ({ name, count, score: matchScore(name, tokens, fullQuery) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, maxCompanies)
    .map(({ name, count }) => ({ kind: "company", id: `company-${normalize(name)}`, name, count }));

  // Decorations
  const decorations: DecorationSuggestion<T>[] = catalog
    .map((item) => {
      const company = getCompany(item);
      const titleScore = matchScore(item.t, tokens, fullQuery);
      const keywordText = [item.cat, company, ...(item.styles ?? []), ...(item.colors ?? [])].join(
        " ",
      );
      const combinedScore = matchScore(`${item.t} ${keywordText}`, tokens, fullQuery);
      // Title matches outrank keyword-only matches
      const score = titleScore > 0 ? titleScore * 2 + 10 : combinedScore;
      return { item, company, score };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score || a.item.t.localeCompare(b.item.t))
    .slice(0, maxDecorations)
    .map(({ item, company }) => ({
      kind: "decoration",
      id: `decoration-${item.id}`,
      item,
      company,
    }));

  return { companies, decorations, all: [...companies, ...decorations] };
}

/**
 * Split `text` into parts with the query tokens marked, for highlighting.
 * Matching is case-insensitive on the original text.
 */
export function highlightParts(text: string, query: string): { text: string; match: boolean }[] {
  const tokens = normalize(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return [{ text, match: false }];
  const escaped = tokens
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  return text
    .split(re)
    .filter((part) => part !== "")
    .map((part) => ({ text: part, match: tokens.includes(part.toLowerCase()) }));
}
