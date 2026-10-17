import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Building2, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logoutCompany, setActiveCompany, type CompanySummary } from "@/lib/company-profile";
import { fetchCompanyProfileFromSupabase, listCompaniesFromSupabase } from "@/lib/supabase-service";

/** Testing-stage "login": existing companies search and click; new companies go through the setup form. */
export function CompanyPicker() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    listCompaniesFromSupabase()
      .then((list) => alive && setCompanies(list))
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) =>
      [c.name, c.ownerName, c.city].some((v) => (v || "").toLowerCase().includes(q)),
    );
  }, [companies, query]);

  const open = async (id: string) => {
    setOpening(id);
    try {
      const profile = await fetchCompanyProfileFromSupabase(id);
      setActiveCompany(id, profile);
      navigate({ to: "/company" });
    } catch {
      toast.error("Could not open this company. Please try again.");
      setOpening(null);
    }
  };

  const addNew = () => {
    logoutCompany();
    navigate({ to: "/setup" });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-5 py-10">
      <div className="space-y-1 text-center">
        <h1 className="text-3xl font-semibold">Choose your company</h1>
        <p className="text-sm text-muted-foreground">
          Search for your company and open it, or set up a new one.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by company, owner or city"
          className="h-11 pl-9"
          aria-label="Search companies"
        />
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading companies…
          </p>
        ) : failed ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Could not load companies. Check your connection and reload.
          </p>
        ) : shown.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {companies.length === 0
              ? "No company has been set up yet."
              : "No company matches your search."}
          </p>
        ) : (
          shown.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={opening !== null}
              onClick={() => open(c.id)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent disabled:cursor-wait disabled:opacity-70"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                {opening === c.id ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Building2 className="size-5" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[c.ownerName, c.city].filter(Boolean).join(" · ")}
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      <Button variant="outline" className="gap-2" onClick={addNew}>
        <Plus className="size-4" />
        Set up a new company
      </Button>
    </div>
  );
}
