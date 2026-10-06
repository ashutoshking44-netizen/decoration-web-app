import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Flower2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  EVENT_TYPE_OPTIONS,
  SERVICE_OPTIONS,
  TEAM_SIZE_OPTIONS,
  YEARS_OPTIONS,
  emptyProfile,
  loadProfile,
  saveProfile,
  type CompanyProfile,
} from "@/lib/company-profile";

const STEPS = [
  { title: "Your company", caption: "Tell us who you are" },
  { title: "What you decorate", caption: "Pick the work you take on" },
  { title: "Your scale", caption: "Team size and experience" },
];

function Pill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] transition-all",
        selected
          ? "border-primary bg-rose-light text-primary shadow-soft"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {selected && <Check className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

export function ProfileSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CompanyProfile>(() => loadProfile() ?? emptyProfile);

  const set = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: "services" | "eventTypes", value: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value],
    }));

  const canContinue =
    step === 0
      ? form.name.trim().length > 1 && form.phone.trim().length > 5 && form.city.trim().length > 1
      : step === 1
        ? form.services.length > 0 && form.eventTypes.length > 0
        : form.teamSize !== "" && form.yearsActive !== "";

  const finish = () => {
    saveProfile(form);
    navigate({ to: "/company" });
  };

  return (
    <div className="min-h-screen bg-canvas px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-light text-primary">
            <Flower2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Decoration Portal
            </p>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Set up your company profile
            </h1>
          </div>
        </header>

        <ol className="mt-8 grid grid-cols-3 gap-3">
          {STEPS.map((item, index) => (
            <li key={item.title}>
              <div
                className={cn(
                  "h-1 rounded-full transition-colors",
                  index <= step ? "bg-primary" : "bg-border",
                )}
              />
              <p
                className={cn(
                  "mt-2 text-[11px] font-medium",
                  index === step ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.title}
              </p>
            </li>
          ))}
        </ol>

        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-xl font-semibold text-foreground">{STEPS[step]?.title}</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">{STEPS[step]?.caption}</p>

          {step === 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="company-name">Company name</Label>
                <Input
                  id="company-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Gulab Decor"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="owner-name">Owner / contact person</Label>
                <Input
                  id="owner-name"
                  value={form.ownerName}
                  onChange={(e) => set("ownerName", e.target.value)}
                  placeholder="Maya Shrestha"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="98•• ••••12"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="hello@company.com"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Kathmandu"
                  className="mt-1.5"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mt-6 space-y-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Decoration services you offer
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SERVICE_OPTIONS.map((service) => (
                    <Pill
                      key={service}
                      label={service}
                      selected={form.services.includes(service)}
                      onClick={() => toggle("services", service)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Functions you decorate for
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {EVENT_TYPE_OPTIONS.map((type) => (
                    <Pill
                      key={type}
                      label={type}
                      selected={form.eventTypes.includes(type)}
                      onClick={() => toggle("eventTypes", type)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-6 space-y-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Team size
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TEAM_SIZE_OPTIONS.map((size) => (
                    <Pill
                      key={size}
                      label={size}
                      selected={form.teamSize === size}
                      onClick={() => set("teamSize", size)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Years in business
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {YEARS_OPTIONS.map((years) => (
                    <Pill
                      key={years}
                      label={years}
                      selected={form.yearsActive === years}
                      onClick={() => set("yearsActive", years)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="about">Anything else about your style? (optional)</Label>
                <Textarea
                  id="about"
                  value={form.about}
                  onChange={(e) => set("about", e.target.value)}
                  placeholder="We specialise in pastel floral mandaps and warm ambient lighting."
                  className="mt-1.5"
                  rows={3}
                />
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={finish} disabled={!canContinue}>
                <Sparkles className="h-4 w-4" /> Finish and open dashboard
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
