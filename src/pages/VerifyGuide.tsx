import { BadgeCheck, Building2, CreditCard, Fingerprint, ShieldCheck } from "lucide-react";
import { Link } from "@/lib/router-compat";
import { AppLayout } from "@/components/layout/AppLayout";
import { useI18n } from "@/lib/i18n";

/** Publieke uitleg over de twee ROUT-verificaties. */

const STEPS = [
  {
    icon: CreditCard,
    titleKey: "verifyguide.step.one.title",
    bodyKey: "verifyguide.step.one.body",
  },
  {
    icon: Building2,
    titleKey: "verifyguide.step.two.title",
    bodyKey: "verifyguide.step.two.body",
  },
  {
    icon: BadgeCheck,
    titleKey: "verifyguide.step.three.title",
    bodyKey: "verifyguide.step.three.body",
  },
] as const;

export default function VerifyGuide() {
  const { t } = useI18n();
  return (
    <AppLayout crumbs={[{ label: t("verifyguide.crumb") }]}>
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-20">
        <span className="eyebrow">{t("verifyguide.eyebrow")}</span>
        <h1 className="mb-3 mt-2 font-serif text-4xl font-medium tracking-tight sm:text-5xl">
          {t("verifyguide.title")}
        </h1>
        <p className="mb-12 border-b-2 border-dashed border-border-ink/25 pb-8 font-sans text-lg text-muted-foreground">
          {t("verifyguide.subtitle")}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card/60 p-6 shadow-sm">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background">
              <BadgeCheck className="h-4 w-4 text-primary" aria-hidden />
            </span>
            <h2 className="mt-4 font-serif text-2xl font-semibold text-foreground">
              {t("verifyguide.blueCheck.title")}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              {t("verifyguide.blueCheck.body")}
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card/60 p-6 shadow-sm">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background">
              <ShieldCheck className="h-4 w-4 text-foreground" aria-hidden />
            </span>
            <h2 className="mt-4 font-serif text-2xl font-semibold text-foreground">
              {t("verifyguide.privacyShield.title")}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              {t("verifyguide.privacyShield.body")}
            </p>
          </section>
        </div>

        <h2 className="mb-4 mt-12 font-serif text-2xl font-semibold text-foreground">
          {t("verifyguide.steps.heading")}
        </h2>
        <ol className="space-y-4">
          {STEPS.map(({ icon: Icon, titleKey, bodyKey }, index) => (
            <li
              key={titleKey}
              className="flex gap-4 rounded-2xl border border-border bg-card/60 p-5 shadow-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background font-mono text-xs">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  {t(titleKey)}
                </h3>
                <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
                  {t(bodyKey)}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-foreground">
            <Fingerprint className="h-4 w-4 text-muted-foreground" aria-hidden />
            {t("verifyguide.retained.heading")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("verifyguide.retained.body")}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              {t("verifyguide.cta.start")}
            </Link>
            <Link
              to="/privacy"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {t("verifyguide.cta.privacy")}
            </Link>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
