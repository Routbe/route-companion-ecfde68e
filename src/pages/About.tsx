import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Coins,
  Download,
  FileJson,
  Fingerprint,
  HeartHandshake,
  Mail,
  MapPin,
  Palette,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "@/lib/router-compat";
import { AppLayout } from "@/components/layout/AppLayout";
import { BUNNY_PATH } from "@/lib/site";
import { useI18n } from "@/lib/i18n";

/**
 * Publieke marketingpagina van ROUT.
 *
 * Alles is statisch en server-renderbaar: geen tracking, geen client-side
 * meting, geen cookiemuur. De enige interacties zijn het claimveld, de
 * FAQ-accordeon en de vCard-download van het officiële @rout profiel.
 *
 * Opbouw: belofte → bewijs → werking → capaciteiten → overtuiging →
 * vergelijking → prijs → twijfels wegnemen → één afsluitende CTA.
 */

const HANDLE_RE = /[^a-z0-9._-]/g;

/** Harde, controleerbare cijfers direct onder de hero. */
const PROOF_POINTS = [
  { icon: ShieldCheck, value: "0", key: "trackers" },
  { icon: Coins, value: "0 %", key: "commission" },
  { icon: MapPin, value: "EU", key: "infra" },
  { icon: FileJson, value: "1 klik", key: "export" },
] as const;

/** Van niets naar een live profiel — bewust maar drie stappen. */
const STEPS = [
  { n: "01", icon: Fingerprint, key: "claim" },
  { n: "02", icon: Palette, key: "build" },
  { n: "03", icon: QrCode, key: "share" },
] as const;

/** Eerlijke vergelijking met de klassieke link-in-bio-diensten. */
const COMPARISON = [
  { key: "privacy" },
  { key: "qr" },
  { key: "stats" },
  { key: "domain" },
  { key: "data" },
] as const;

const FEATURES = [
  { icon: Sparkles, key: "profiles", points: 3 },
  { icon: BadgeCheck, key: "verification", points: 3 },
  { icon: Mail, key: "secureshield", points: 3 },
  { icon: HeartHandshake, key: "creator", points: 3 },
] as const;

/** Prijstransparantie — geen verborgen abonnementstrap. */
const PRICING = [
  { key: "free" },
  { key: "payg" },
  { key: "nocommission" },
] as const;

const FAQ = [
  { key: "isFree" },
  { key: "data" },
  { key: "portable" },
  { key: "alias" },
  { key: "where" },
] as const;

/** Verdiepende pagina's — houdt de about-pagina kort maar volledig. */
const FURTHER_READING = [
  { to: "/manifesto", key: "manifesto" },
  { to: "/sovereignty", key: "sovereignty" },
  { to: "/self-hosting", key: "selfHosting" },
  { to: "/privacy", key: "privacy" },
] as const;

const ROUT_VCARD = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:ROUT",
  "ORG:ROUT Sovereign Identity",
  "EMAIL;TYPE=INTERNET,WORK:hallo@rout.be",
  "URL:https://rout.be",
  "ADR;TYPE=WORK:;;Brussels;;;Belgium",
  "NOTE:Sovereign QR & Identity Infrastructure",
  "END:VCARD",
].join("\r\n");

const PROFILE_LINKS = [
  { key: "github", href: "https://github.com/Routbe" },
  { key: "matrix", href: "https://matrix.to/#/#rout:matrix.org" },
  { key: "contact", href: "mailto:hallo@rout.be" },
] as const;

function downloadVcard() {
  const blob = new Blob([ROUT_VCARD], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "rout-contact.vcf";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Authentiek, interactief @rout profiel — geen dummy-persoon. */
function RoutProfileCard() {
  const { t } = useI18n();
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div aria-hidden className="absolute -inset-6 rounded-[2.5rem] bg-foreground/5 blur-2xl" />
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/90 shadow-sm backdrop-blur">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          <span className="ml-2 truncate font-mono text-[10px] text-muted-foreground">
            rout.be/rout
          </span>
        </div>
        <div className="flex flex-col items-center px-5 py-7 text-center sm:px-6">
          <div className="relative">
            <img
              src={BUNNY_PATH}
              alt={t("about.profileCard.logoAlt")}
              className="h-20 w-20 rounded-full border border-border bg-background object-contain p-3"
              loading="lazy"
            />
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card">
              <BadgeCheck className="h-4 w-4 text-primary" aria-hidden />
            </span>
          </div>
          <p className="mt-4 inline-flex items-center gap-1.5 font-serif text-lg font-medium text-foreground">
            ROUT
            <BadgeCheck className="h-4 w-4 text-primary" aria-label={t("about.profileCard.verified")} />
          </p>
          <a
            href="https://rout.be"
            target="_blank"
            rel="noreferrer noopener"
            className="font-mono text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            rout.be/rout
          </a>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("about.profileCard.tagline")}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {["Verified Pro", "Sovereign Core", "Open Source"].map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] tracking-wide text-muted-foreground"
              >
                {badge}
              </span>
            ))}
          </div>
          <div className="mt-5 w-full space-y-2">
            {PROFILE_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noreferrer noopener"
                className="block rounded-xl border border-border bg-background/70 px-4 py-2.5 text-left text-xs text-foreground transition-colors hover:bg-accent"
              >
                {t(`about.profileCard.links.${link.key}`)}
              </a>
            ))}
            <button
              type="button"
              onClick={downloadVcard}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              {t("about.profileCard.saveContact")}
            </button>
          </div>
          <p className="mt-6 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            {t("about.profileCard.madeWith")}
          </p>
        </div>
      </div>
    </div>
  );
}

function ComparisonMatrix() {
  const { t } = useI18n();
  return (
    <>
      {/* Desktop: vaste 3-koloms tabel */}
      <div className="mt-8 hidden overflow-hidden rounded-xl border border-border md:block">
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">
            {t("about.comparison.caption")}
          </caption>
          <thead>
            <tr className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="w-1/3 p-4 font-semibold">
                {t("about.comparison.headFeature")}
              </th>
              <th scope="col" className="w-1/3 p-4 font-semibold">
                {t("about.comparison.headOthers")}
              </th>
              <th scope="col" className="w-1/3 p-4 font-semibold text-foreground">
                ROUT
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row) => (
              <tr key={row.key} className="border-t border-border align-top">
                <th scope="row" className="w-1/3 p-4 text-left font-medium text-foreground">
                  {t(`about.comparison.${row.key}.feature`)}
                </th>
                <td className="w-1/3 p-4 text-muted-foreground">
                  {t(`about.comparison.${row.key}.others`)}
                </td>
                <td className="w-1/3 bg-emerald-500/5 p-4 font-medium text-foreground">
                  {t(`about.comparison.${row.key}.rout`)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobiel: verticale vergelijkingskaarten */}
      <div className="mt-8 block md:hidden">
        {COMPARISON.map((row) => (
          <div
            key={row.key}
            className="mb-3 space-y-2 rounded-2xl border border-border/80 bg-card p-4 shadow-sm"
          >
            <p className="text-sm font-medium text-foreground">{t(`about.comparison.${row.key}.feature`)}</p>
            <div className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              <span className="mb-1 block text-[10px] uppercase tracking-wide">
                {t("about.comparison.headOthers")}
              </span>
              {t(`about.comparison.${row.key}.others`)}
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-900 dark:text-emerald-200">
              <span className="mb-1 block text-[10px] uppercase tracking-wide">ROUT</span>
              {t(`about.comparison.${row.key}.rout`)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function HandleClaim() {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const handle = useMemo(() => value.toLowerCase().replace(HANDLE_RE, "").slice(0, 30), [value]);
  const target = handle
    ? `/auth?redirect=${encodeURIComponent(`/dashboard/profile?handle=${handle}`)}`
    : "/auth";

  return (
    <form
      className="mt-8 w-full max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        window.location.assign(target);
      }}
    >
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm transition-shadow focus-within:shadow-md sm:flex-row sm:items-center">
        <label htmlFor="claim-handle" className="sr-only">
          {t("about.claim.label")}
        </label>
        <div className="flex min-w-0 flex-1 items-center gap-1 px-3">
          <span className="shrink-0 font-mono text-sm text-muted-foreground">rout.be/</span>
          <input
            id="claim-handle"
            value={handle}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t("about.claim.placeholder")}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="claim-handle-hint"
            className="min-w-0 flex-1 bg-transparent py-2.5 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          {t("about.claim.button")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p id="claim-handle-hint" className="mt-2 px-2 text-xs text-muted-foreground">
        {t("about.claim.hint")}
      </p>
    </form>
  );
}

const CARD = "rounded-3xl border border-border/80 bg-card/90 p-6 shadow-sm sm:p-8";
const SECTION = "mt-16 sm:mt-24 scroll-mt-24";

export default function About() {
  const { t } = useI18n();
  return (
    <AppLayout crumbs={[{ label: t("about.crumb") }]}>
      {/* pb-28 houdt de laatste CTA vrij van de footer en de zwevende knop */}
      <div className="mx-auto max-w-5xl px-4 py-12 pb-28 sm:px-6 sm:py-20">
        {/* ---------------------------------------------------- hero */}
        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-fade-in-up">
            <span className="eyebrow">{t("about.hero.eyebrow")}</span>
            <h1 className="mb-4 mt-2 font-serif text-3xl font-medium leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              {t("about.hero.title")}
            </h1>
            <p className="max-w-xl text-balance font-sans text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("about.hero.body")}
            </p>
            <HandleClaim />
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {t("about.hero.badgeData")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" aria-hidden /> {t("about.hero.badgeThemes")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" aria-hidden /> {t("about.hero.badgeRelay")}
              </span>
            </div>
          </div>
          <RoutProfileCard />
        </section>

        {/* ------------------------------------------------ bewijs */}
        <section aria-label={t("about.proof.ariaLabel")} className="mt-14 sm:mt-20">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border/80 bg-border/60 sm:grid-cols-4">
            {PROOF_POINTS.map(({ icon: Icon, value, key }) => (
              <div key={key} className="bg-card px-4 py-6 text-center sm:px-5">
                <Icon className="mx-auto h-4 w-4 text-muted-foreground" aria-hidden />
                <dt className="sr-only">{t(`about.proof.${key}`)}</dt>
                <dd>
                  <span className="mt-3 block font-serif text-2xl font-medium text-foreground sm:text-3xl">
                    {value}
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                    {t(`about.proof.${key}`)}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* -------------------------------------------- hoe het werkt */}
        <section className={SECTION} aria-labelledby="about-steps">
          <span className="eyebrow">{t("about.steps.eyebrow")}</span>
          <h2
            id="about-steps"
            className="mt-2 font-serif text-2xl font-semibold text-foreground sm:text-3xl"
          >
            {t("about.steps.title")}
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, n, key }) => (
              <li
                key={n}
                className="group relative rounded-3xl border border-border/80 bg-card/90 p-6 shadow-sm transition-colors hover:border-foreground/30"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background">
                    <Icon className="h-4 w-4 text-foreground" aria-hidden />
                  </span>
                  <span aria-hidden className="font-mono text-xs text-muted-foreground/70">
                    {n}
                  </span>
                </div>
                <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">
                  {t(`about.steps.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`about.steps.${key}.body`)}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* --------------------------------------------- capaciteiten */}
        <section className={SECTION} aria-labelledby="about-features">
          <span className="eyebrow">{t("about.features.eyebrow")}</span>
          <h2
            id="about-features"
            className="mt-2 font-serif text-2xl font-semibold text-foreground sm:text-3xl"
          >
            {t("about.features.title")}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, key, points }) => (
              <article key={key} className={CARD}>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background">
                  <Icon className="h-4 w-4 text-foreground" aria-hidden />
                </span>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {t(`about.features.${key}.eyebrow`)}
                </p>
                <h3 className="mt-1 font-serif text-xl font-semibold text-foreground sm:text-2xl">
                  {t(`about.features.${key}.title`)}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                  {t(`about.features.${key}.body`)}
                </p>
                <ul className="mt-4 space-y-1.5">
                  {Array.from({ length: points }).map((_, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span
                        aria-hidden
                        className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-foreground/50"
                      />
                      {t(`about.features.${key}.point${i + 1}`)}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* ------------------------------------- overtuiging + matrix */}
        <section className={`${SECTION} ${CARD}`} aria-labelledby="about-why">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("about.why.eyebrow")}
          </p>
          <h2
            id="about-why"
            className="mt-2 font-serif text-2xl font-semibold text-foreground sm:text-3xl"
          >
            {t("about.why.title")}
          </h2>
          <blockquote className="mt-5 border-l-2 border-foreground/20 pl-4 font-serif text-lg leading-snug text-foreground sm:text-xl">
            {t("about.why.quote")}
          </blockquote>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              {t("about.why.paragraphOne")}
            </p>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              {t("about.why.paragraphTwoPrefix")}{" "}
              <code className="font-mono text-xs">.json</code>
              {t("about.why.paragraphTwoSuffix")}
            </p>
          </div>

          <ComparisonMatrix />
        </section>

        {/* ---------------------------------------------------- prijs */}
        <section className={SECTION} aria-labelledby="about-pricing">
          <span className="eyebrow">{t("about.pricing.eyebrow")}</span>
          <h2
            id="about-pricing"
            className="mt-2 font-serif text-2xl font-semibold text-foreground sm:text-3xl"
          >
            {t("about.pricing.title")}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {PRICING.map((tier) => (
              <div
                key={tier.key}
                className="rounded-3xl border border-border/80 bg-card/90 p-6 shadow-sm"
              >
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  {t(`about.pricing.${tier.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`about.pricing.${tier.key}.body`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------ faq */}
        <section className={SECTION} aria-labelledby="about-faq">
          <span className="eyebrow">{t("about.faq.eyebrow")}</span>
          <h2
            id="about-faq"
            className="mt-2 font-serif text-2xl font-semibold text-foreground sm:text-3xl"
          >
            {t("about.faq.title")}
          </h2>
          <div className="mt-8 overflow-hidden rounded-3xl border border-border/80 bg-card/90 shadow-sm">
            {FAQ.map((item, i) => (
              <details
                key={item.key}
                className={`group px-5 py-4 sm:px-6 ${i > 0 ? "border-t border-border" : ""}`}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[15px] font-medium text-foreground marker:hidden">
                  {t(`about.faq.${item.key}.q`)}
                  <span
                    aria-hidden
                    className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {t(`about.faq.${item.key}.a`)}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* --------------------------------------------- verder lezen */}
        <section className={SECTION} aria-labelledby="about-more">
          <h2 id="about-more" className="eyebrow">
            {t("about.moreReading.title")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FURTHER_READING.map((page) => (
              <Link
                key={page.to}
                to={page.to}
                className="group rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm transition-colors hover:border-foreground/30 hover:bg-accent"
              >
                <p className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                  {t(`about.moreReading.${page.key}.title`)}
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t(`about.moreReading.${page.key}.body`)}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ------------------------------------------ afsluitende CTA */}
        <section
          className={`${SECTION} rounded-3xl border border-border bg-foreground p-8 text-center text-background shadow-sm sm:p-12`}
          aria-labelledby="about-cta"
        >
          <h2 id="about-cta" className="font-serif text-2xl font-semibold sm:text-3xl">
            {t("about.cta.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed opacity-80">
            {t("about.cta.body")}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/start"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-background px-6 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
            >
              {t("about.cta.primary")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/verify"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-background/30 px-6 text-sm font-medium text-background transition-colors hover:bg-background/10"
            >
              {t("about.cta.secondary")}
            </Link>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
