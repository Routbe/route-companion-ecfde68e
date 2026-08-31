import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useI18n } from "@/lib/i18n";

type Health = { status: "operational" | "degraded"; latency_ms: number };
type State = "loading" | "operational" | "degraded";

const COMPONENTS: { key: string; nameKey: string; bodyKey: string; live: boolean }[] = [
  {
    key: "db",
    nameKey: "statuspage.component.db.name",
    bodyKey: "statuspage.component.db.body",
    live: true,
  },
  {
    key: "relay",
    nameKey: "statuspage.component.relay.name",
    bodyKey: "statuspage.component.relay.body",
    live: false,
  },
  {
    key: "payments",
    nameKey: "statuspage.component.payments.name",
    bodyKey: "statuspage.component.payments.body",
    live: false,
  },
];

function StatusPill({ state }: { state: State }) {
  const { t } = useI18n();
  if (state === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> {t("statuspage.pill.checking")}
      </span>
    );
  }
  if (state === "degraded") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-3 w-3" aria-hidden /> {t("statuspage.pill.degraded")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="h-3 w-3" aria-hidden /> {t("statuspage.pill.operational")}
    </span>
  );
}

/**
 * Publiek statusoverzicht. De databasestatus komt live van de health-probe;
 * de overige diensten volgen diezelfde probe zolang er geen aparte meting is,
 * zodat we nooit "operationeel" tonen terwijl de app zelf onbereikbaar is.
 */
export default function StatusPage() {
  const { t } = useI18n();
  const [health, setHealth] = useState<Health | null>(null);
  const [state, setState] = useState<State>("loading");
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api_/public/health", { cache: "no-store" });
        const json = (await res.json()) as Health;
        if (cancelled) return;
        setHealth(json);
        setState(json.status === "operational" ? "operational" : "degraded");
      } catch {
        if (!cancelled) setState("degraded");
      }
      if (!cancelled) setCheckedAt(new Date().toLocaleTimeString("nl-BE"));
    };
    void load();
    const timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <AppLayout crumbs={[{ label: t("statuspage.crumb") }]}>
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-20">
        <span className="eyebrow">{t("statuspage.eyebrow")}</span>
        <h1 className="mb-3 mt-2 font-serif text-4xl font-medium tracking-tight sm:text-5xl">
          {t("statuspage.title")}
        </h1>
        <p className="mb-10 border-b-2 border-dashed border-border-ink/25 pb-8 font-sans text-lg text-muted-foreground">
          {t("statuspage.subtitle")}
        </p>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div>
            <p className="font-serif text-xl font-semibold text-foreground">
              {state === "degraded" ? t("statuspage.summary.degraded") : t("statuspage.summary.operational")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {checkedAt ? t("statuspage.lastChecked", { time: checkedAt }) : t("statuspage.checking")}
              {health ? ` · ${t("statuspage.latency", { ms: health.latency_ms })}` : ""}
            </p>
          </div>
          <StatusPill state={state} />
        </div>

        <ul className="space-y-3">
          {COMPONENTS.map((component) => (
            <li
              key={component.key}
              className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card/60 p-5 shadow-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{t(component.nameKey)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t(component.bodyKey)}</p>
                {!component.live && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t("statuspage.derived")}
                  </p>
                )}
              </div>
              <StatusPill state={state} />
            </li>
          ))}
        </ul>
      </div>
    </AppLayout>
  );
}
