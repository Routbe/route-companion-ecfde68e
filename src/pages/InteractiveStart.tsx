import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Contact,
  Eye,
  Loader2,
  Rocket,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { checkStartAlias, submitStartDraft } from "@/lib/start-draft.functions";
import { lookupBrandIcon } from "@/utils/brandIcons";
import { gradientCss } from "@/lib/profile-design";
import { useI18n } from "@/lib/i18n";

/**
 * Interactieve builder-tour op `/start`.
 *
 * Een bezoeker bouwt in vier stappen een volledig aliasprofiel zonder account.
 * Pas in het activatiescherm vraagt ROUT een e-mailadres: het concept gaat dan
 * server-side in bewaring (24 uur) en wordt na de magic-link login vastgelegd,
 * ook wanneer die login op een ander toestel gebeurt.
 */

type ThemeOption = {
  id: string;
  label: string;
  note: string;
  bg: string;
  fg: string;
  accent: string;
  card: string;
  radius: string;
  font: string;
};

/** De zes thema's uit de tour, gemapt op de bestaande profiel-theme-ids. */
const THEMES: ThemeOption[] = [
  {
    id: "noir",
    label: "Obsidian",
    note: "Diep zwart, scherpe randen",
    bg: "#0d0d0d",
    fg: "#f5f5f5",
    accent: "#f5f5f5",
    card: "rgba(255,255,255,0.06)",
    radius: "4px",
    font: "ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "papier",
    label: "Paper",
    note: "Warm papier, klassieke letter",
    bg: "#f7f4ef",
    fg: "#1c1917",
    accent: "#1c1917",
    card: "rgba(28,25,23,0.05)",
    radius: "12px",
    font: "ui-serif, Georgia, serif",
  },
  {
    id: "arctic",
    label: "Serene Glass",
    note: "Zacht glas, veel lucht",
    bg: gradientCss("nordic"),
    fg: "#0f172a",
    accent: "#0f172a",
    card: "rgba(255,255,255,0.45)",
    radius: "999px",
    font: "ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "emerald",
    label: "Nordic Mist",
    note: "Koel groen, rustige mist",
    bg: gradientCss("emerald"),
    fg: "#ecfdf5",
    accent: "#a7f3d0",
    card: "rgba(255,255,255,0.12)",
    radius: "14px",
    font: "ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    note: "Neon, mono, hard contrast",
    bg: gradientCss("cyber"),
    fg: "#f0abfc",
    accent: "#22d3ee",
    card: "rgba(0,0,0,0.45)",
    radius: "2px",
    font: "ui-monospace, SFMono-Regular, monospace",
  },
  {
    id: "mocha",
    label: "Velvet",
    note: "Fluweel, zacht en warm",
    bg: gradientCss("velvet"),
    fg: "#fdf2f8",
    accent: "#f9a8d4",
    card: "rgba(255,255,255,0.14)",
    radius: "999px",
    font: "ui-serif, Georgia, serif",
  },
];

const ALIAS_RE = /^[a-z0-9._-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AliasState =
  | { kind: "empty" }
  | { kind: "checking" }
  | { kind: "invalid"; message: string }
  | { kind: "digits" }
  | { kind: "taken" }
  | { kind: "free" };

const digitCount = (value: string) => (value.match(/\d/g) ?? []).length;

function normalizeAlias(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 30);
}

export function InteractiveStart() {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [alias, setAlias] = useState("");
  const [aliasState, setAliasState] = useState<AliasState>({ kind: "empty" });
  const [themeId, setThemeId] = useState("noir");
  const [links, setLinks] = useState<string[]>(["", ""]);
  const [wantVcard, setWantVcard] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const seq = useRef(0);

  const theme = useMemo(
    () => THEMES.find((item) => item.id === themeId) ?? THEMES[0]!,
    [themeId],
  );

  // Live validatie van de alias: vorm eerst lokaal, daarna de serverclaim.
  useEffect(() => {
    if (!alias) {
      setAliasState({ kind: "empty" });
      return;
    }
    if (!ALIAS_RE.test(alias)) {
      setAliasState({
        kind: "invalid",
        message: t("start.alias.invalidChars"),
      });
      return;
    }
    if (alias.length < 3) {
      setAliasState({ kind: "invalid", message: t("start.alias.tooShort") });
      return;
    }
    if (digitCount(alias) < 2) {
      setAliasState({ kind: "digits" });
      return;
    }
    setAliasState({ kind: "checking" });
    const ticket = ++seq.current;
    const timer = window.setTimeout(async () => {
      const result = await checkStartAlias({ data: { handle: alias } }).catch(() => null);
      if (ticket !== seq.current) return;
      if (!result || result.reason === "error") {
        setAliasState({
          kind: "invalid",
          message: t("start.alias.checkFailed"),
        });
        return;
      }
      if (result.available) {
        setAliasState({ kind: "free" });
        return;
      }
      if (result.reason === "reserved") {
        setAliasState({ kind: "invalid", message: t("start.alias.reserved") });
        return;
      }
      setAliasState({ kind: "taken" });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [alias]);

  const aliasOk = aliasState.kind === "free";
  const previewName = displayName.trim() || (alias ? `u/${alias}` : t("start.preview.defaultName"));
  const activeLinks = links.map((url) => url.trim()).filter((url) => url.length > 0);

  const submit = async () => {
    if (!EMAIL_RE.test(email.trim()) || busy) return;
    setBusy(true);
    const result = await submitStartDraft({
      data: {
        email: email.trim(),
        aliasHandle: alias,
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
        themeId,
        avatarUrl: avatarUrl.trim() || null,
        links: activeLinks.map((url, index) => ({
          url: /^https?:\/\//i.test(url) ? url : `https://${url}`,
          label: lookupBrandIcon(url)?.title || t("start.link.fallbackLabel", { index: index + 1 }),
        })),
        wantVcard,
      },
    }).catch(() => null);
    setBusy(false);
    if (!result?.ok) {
      toast.error(t("start.submit.error"));
      return;
    }
    setSent(true);
    toast.success(t("start.submit.success"));
  };

  /* --------------------------------------------------------- live preview */
  const preview = (
    <div
      className="overflow-hidden rounded-3xl border border-border shadow-sm transition-all duration-500"
      style={{ background: theme.bg, color: theme.fg, fontFamily: theme.font }}
    >
      <div className="flex flex-col items-center gap-3 px-6 py-9 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-lg font-semibold transition-all duration-500"
          style={{ background: theme.card, border: `1px solid ${theme.accent}33` }}
        >
          {avatarUrl.trim() ? (
            <img src={avatarUrl.trim()} alt="" className="h-full w-full object-cover" />
          ) : (
            previewName.slice(0, 2).toUpperCase()
          )}
        </div>
        <div>
          <p className="text-base font-semibold">{previewName}</p>
          <p className="text-xs opacity-70">rout.be/u/{alias || "alias99"}</p>
        </div>
        {bio.trim() ? (
          <p className="max-w-[15rem] text-xs leading-relaxed opacity-80">{bio.trim()}</p>
        ) : null}

        <div className="mt-2 w-full space-y-2">
          {(activeLinks.length > 0 ? activeLinks : ["jouw-eerste-link.be"]).map((url, index) => {
            const brand = lookupBrandIcon(url);
            return (
              <div
                key={`${url}-${index}`}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-all duration-500"
                style={{
                  background: theme.card,
                  borderRadius: theme.radius,
                  border: `1px solid ${theme.accent}2e`,
                }}
              >
                {brand ? (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                    <path fill="currentColor" d={brand.path} />
                  </svg>
                ) : null}
                <span className="truncate">{brand?.title ?? url.replace(/^https?:\/\//, "")}</span>
              </div>
            );
          })}
          {wantVcard ? (
            <div
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-all duration-500"
              style={{
                background: "transparent",
                borderRadius: theme.radius,
                border: `1px solid ${theme.accent}55`,
              }}
            >
              <Contact className="h-3.5 w-3.5" aria-hidden />
              {t("start.preview.saveContact")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- steps */
  const stepBody = () => {
    if (sent) {
      return (
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <Sparkles className="mx-auto h-8 w-8" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-foreground">{t("start.sent.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
{t("start.sent.body1")} <span className="font-medium">{email.trim()}</span>. {t("start.sent.body2")} <span className="font-medium">rout.be/u/{alias}</span> {t("start.sent.body3")}
          </p>
        </div>
      );
    }

    if (step === 5) {
      return (
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-foreground">
🎉 {t("start.done.title", { alias })}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
{t("start.done.body")}
          </p>
          <div className="mt-6 space-y-2">
            <Label htmlFor="start-email">{t("start.email.label")}</Label>
            <Input
              id="start-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t("start.email.placeholder")}
              value={email}
              maxLength={320}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-2xl"
            />
          </div>
          <Button
            onClick={() => void submit()}
            disabled={!EMAIL_RE.test(email.trim()) || busy}
            className="mt-5 w-full rounded-2xl"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Zap className="h-4 w-4" aria-hidden />
            )}
{t("start.done.cta")}
          </Button>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <Button variant="ghost" onClick={() => setStep(4)} className="rounded-2xl px-2">
              <ArrowLeft className="h-4 w-4" aria-hidden /> {t("start.common.back")}
            </Button>
            <Link to="/login" className="font-medium text-foreground underline">
              {t("start.done.loginLink")}
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        {step === 1 ? (
          <>
            <h2 className="text-xl font-semibold text-foreground">
              {t("start.step1.title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("start.step1.body")}
            </p>
            <div className="mt-6 space-y-2">
              <Label htmlFor="start-alias">{t("start.step1.aliasLabel")}</Label>
              <div className="flex items-center gap-0 overflow-hidden rounded-2xl border border-border bg-background focus-within:ring-2 focus-within:ring-ring">
                <span className="shrink-0 border-r border-border px-3 py-2.5 text-sm text-muted-foreground">
                  rout.be/u/
                </span>
                <input
                  id="start-alias"
                  value={alias}
                  autoFocus
                  placeholder={t("start.step1.aliasPlaceholder")}
                  onChange={(event) => setAlias(normalizeAlias(event.target.value))}
                  className="w-full bg-transparent px-3 py-2.5 text-sm outline-none"
                />
              </div>
              <p className="min-h-5 text-xs" aria-live="polite">
                {aliasState.kind === "checking" ? (
                  <span className="text-muted-foreground">{t("start.alias.checking")}</span>
                ) : aliasState.kind === "free" ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    🟢 {t("start.alias.free", { alias })}
                  </span>
                ) : aliasState.kind === "digits" ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    ❗ {t("start.alias.digits")}
                  </span>
                ) : aliasState.kind === "taken" ? (
                  <span className="text-destructive">
                    🔴 {t("start.alias.taken", { alias })}
                  </span>
                ) : aliasState.kind === "invalid" ? (
                  <span className="text-destructive">❗ {aliasState.message}</span>
                ) : null}
              </p>
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={!aliasOk}
              className="mt-6 w-full rounded-2xl sm:w-auto"
            >
{t("start.step1.next")} <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="text-xl font-semibold text-foreground">{t("start.step2.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("start.step2.body")}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {THEMES.map((item) => {
                const active = item.id === themeId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setThemeId(item.id)}
                    aria-pressed={active}
                    className={`rounded-2xl border p-3 text-left transition-all duration-300 ${
                      active
                        ? "border-foreground ring-2 ring-foreground/20"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <span
                      className="flex h-14 items-center justify-center rounded-xl text-[10px] font-medium"
                      style={{ background: item.bg, color: item.fg, fontFamily: item.font }}
                    >
                      {t("start.step2.aaSample")}
                    </span>
                    <span className="mt-2 flex items-center gap-1 text-sm font-medium text-foreground">
                      {item.label}
                      {active ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                    </span>
                    <span className="block text-xs text-muted-foreground">{item.note}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="rounded-2xl">
                <ArrowLeft className="h-4 w-4" aria-hidden /> {t("start.common.back")}
              </Button>
              <Button onClick={() => setStep(3)} className="rounded-2xl">
                {t("start.step2.next")} <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2 className="text-xl font-semibold text-foreground">
              {t("start.step3.title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("start.step3.body")}
            </p>
            <div className="mt-6 space-y-4">
              {links.map((value, index) => {
                const brand = lookupBrandIcon(value);
                return (
                  <div key={index} className="space-y-2">
                    <Label htmlFor={`start-link-${index}`}>{t("start.step3.linkLabel", { index: index + 1 })}</Label>
                    <div className="flex items-center gap-2 overflow-hidden rounded-2xl border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground"
                        style={brand ? { color: brand.color } : undefined}
                      >
                        {brand ? (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                            <path fill="currentColor" d={brand.path} />
                          </svg>
                        ) : (
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        )}
                      </span>
                      <input
                        id={`start-link-${index}`}
                        value={value}
                        placeholder={index === 0 ? t("start.step3.placeholder1") : t("start.step3.placeholder2")}
                        onChange={(event) =>
                          setLinks((prev) =>
                            prev.map((item, i) => (i === index ? event.target.value : item)),
                          )
                        }
                        className="w-full bg-transparent py-2.5 text-sm outline-none"
                      />
                    </div>
                  </div>
                );
              })}
              <label className="flex items-center gap-3 text-sm text-foreground">
                <Checkbox
                  checked={wantVcard}
                  onCheckedChange={(value) => setWantVcard(value === true)}
                />
{t("start.step3.vcard")}
              </label>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="rounded-2xl">
                <ArrowLeft className="h-4 w-4" aria-hidden /> {t("start.common.back")}
              </Button>
              <Button onClick={() => setStep(4)} className="rounded-2xl">
                {t("start.step3.next")} <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setLinks(["", ""]);
                  setStep(4);
                }}
                className="rounded-2xl text-muted-foreground"
              >
{t("start.step3.skip")}
              </Button>
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <h2 className="text-xl font-semibold text-foreground">{t("start.step4.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("start.step4.body")}
            </p>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="start-name">{t("start.step4.nameLabel")}</Label>
                <Input
                  id="start-name"
                  value={displayName}
                  maxLength={80}
                  placeholder={t("start.step4.namePlaceholder")}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-bio">{t("start.step4.bioLabel")}</Label>
                <Textarea
                  id="start-bio"
                  value={bio}
                  maxLength={160}
                  rows={3}
                  placeholder={t("start.step4.bioPlaceholder")}
                  onChange={(event) => setBio(event.target.value.slice(0, 160))}
                  className="rounded-2xl"
                />
                <p className="text-right text-xs text-muted-foreground">{bio.length}/160</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-avatar">{t("start.step4.avatarLabel")}</Label>
                <Input
                  id="start-avatar"
                  value={avatarUrl}
                  maxLength={400}
                  placeholder={t("start.step4.avatarPlaceholder")}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  className="rounded-2xl"
                />
                <p className="text-xs text-muted-foreground">
                  {t("start.step4.avatarHint")}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setStep(3)} className="rounded-2xl">
                <ArrowLeft className="h-4 w-4" aria-hidden /> {t("start.common.back")}
              </Button>
              <Button onClick={() => setStep(5)} className="rounded-2xl">
                <Rocket className="h-4 w-4" aria-hidden /> {t("start.step4.finalCta")}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    );
  };

  return (
    <AppLayout
      title={t("start.page.title")}
      description={t("start.page.description")}
      width="wide"
    >
      <div className="py-8">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {sent ? t("start.progress.done") : t("start.progress.step", { step: Math.min(step, 4) })}
        </p>
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {[1, 2, 3, 4].map((index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                index <= Math.min(step, 4) ? "bg-foreground" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>{stepBody()}</div>

          {/* Sticky live preview op desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Eye className="h-3.5 w-3.5" aria-hidden /> {t("start.preview.liveLabel")}
              </p>
              {preview}
            </div>
          </aside>
        </div>
      </div>

      {/* Mobiele preview-drawer */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        {showPreview ? (
          <div className="max-h-[70vh] overflow-y-auto border-t border-border bg-background p-4">
            {preview}
          </div>
        ) : null}
        <div className="border-t border-border bg-background/95 p-3 backdrop-blur">
          <Button
            variant="outline"
            onClick={() => setShowPreview((value) => !value)}
            className="w-full rounded-2xl"
          >
            <Eye className="h-4 w-4" aria-hidden />
            {showPreview ? t("start.preview.hide") : t("start.preview.show")}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

export default InteractiveStart;
