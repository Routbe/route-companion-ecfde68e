import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  Copy,
  Globe,
  Loader2,
  RefreshCw,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import {
  addCustomDomain,
  deleteCustomDomain,
  listCustomDomains,
  setDefaultDomain,
  setDomainShortLinks,
  verifyCustomDomain,
  DOMAIN_CNAME_TARGET,
  DOMAIN_A_TARGET,
} from "@/lib/domains.functions";

interface DomainRow {
  id: string;
  domain: string;
  status: string;
  is_default: boolean;
  verification_token: string;
  short_links_enabled: boolean;
  verified_at: string | null;
  last_checked_at: string | null;
  created_at: string;
}

type LiveState = "ok" | "propagating" | "missing";

interface LiveResult {
  state: LiveState;
  txt: boolean;
  route: boolean;
}

type DnsProvider = "standard" | "cloudflare" | "transip";

const STATUS_TONE: Record<string, { tone: string; icon: typeof Clock }> = {
  pending: { tone: "bg-muted text-muted-foreground", icon: Clock },
  pointing: { tone: "bg-muted text-foreground", icon: Clock },
  verified: { tone: "bg-foreground text-background", icon: CheckCircle2 },
};

const LIVE_META: Record<LiveState, { dot: string; icon: typeof Clock }> = {
  ok: { dot: "bg-emerald-500", icon: CheckCircle2 },
  propagating: { dot: "bg-amber-500", icon: Clock },
  missing: { dot: "bg-red-500", icon: XCircle },
};

/** A subdomain has more than two labels (e.g. atproto.j.delplanche.com); a root
 *  domain has exactly two (e.g. delplanche.com). Root domains need an A record,
 *  subdomains only ever need the CNAME. */
function isSubdomain(domain: string) {
  return domain.split(".").length > 2;
}

function copy(value: string, what: string, t: (k: string, p?: Record<string, unknown>) => string) {
  void navigator.clipboard.writeText(value);
  toast.success(t("domains.copied", { what }));
}

/** One monospace DNS value with its own copy button. */
function CopyField({ label, value, hint, onCopy, copyLabel }: { label: string; value: string; hint?: string; onCopy: (v: string, w: string) => void; copyLabel: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {hint ? <span className="truncate text-[10px] text-muted-foreground">{hint}</span> : null}
      </div>
      <div className="mt-1 flex items-start gap-1.5">
        <code className="min-w-0 flex-1 break-all rounded bg-muted/50 p-2 font-mono text-xs text-foreground">
          {value}
        </code>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label={copyLabel}
          onClick={() => onCopy(value, label)}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Compact DNS record card: TYPE / HOST / VALUE, each copyable. The host is
 *  derived from the selected DNS provider so there is a single source of truth. */
function RecordCard({
  type,
  host,
  value,
  note,
  onCopy,
  hostLabel,
  valueLabel,
  copyLabel,
}: {
  type: string;
  host: string;
  value: string;
  note?: string;
  onCopy: (v: string, w: string) => void;
  hostLabel: string;
  valueLabel: string;
  copyLabel: (label: string) => string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-[10px]">
          {type}
        </Badge>
        {note ? (
          <span className="min-w-0 truncate text-[11px] text-muted-foreground">{note}</span>
        ) : null}
      </div>
      <div className="mt-2 space-y-2.5">
        <CopyField label={hostLabel} value={host} onCopy={onCopy} copyLabel={copyLabel(hostLabel)} />
        <CopyField label={valueLabel} value={value} onCopy={onCopy} copyLabel={copyLabel(valueLabel)} />
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-medium text-background">
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div className="space-y-2 text-xs text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

/** Browser-side DNS-over-HTTPS lookup so "Check DNS" shows live truth instantly. */
async function dohLookup(name: string, type: "TXT" | "CNAME" | "A"): Promise<string[]> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { accept: "application/dns-json" } },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { Answer?: { type: number; data: string }[] };
    return (json.Answer ?? []).map((a) => a.data.replace(/^"|"$/g, "").replace(/\.$/, ""));
  } catch {
    return [];
  }
}

async function liveCheck(row: DomainRow): Promise<LiveResult> {
  const [txt, cname, a] = await Promise.all([
    dohLookup(`_rout.${row.domain}`, "TXT"),
    dohLookup(row.domain, "CNAME"),
    dohLookup(row.domain, "A"),
  ]);
  const txtOk = txt.some((v) => v === row.verification_token);
  const routeOk =
    cname.some((v) => v === DOMAIN_CNAME_TARGET) || a.some((v) => v === DOMAIN_A_TARGET);
  return {
    txt: txtOk,
    route: routeOk,
    state: txtOk && routeOk ? "ok" : txtOk || routeOk ? "propagating" : "missing",
  };
}

export default function Domains() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [live, setLive] = useState<Record<string, LiveResult>>({});
  const [provider, setProvider] = useState<DnsProvider>("standard");

  useEffect(() => {
    if (!authLoading && !user) nav("/auth", { replace: true });
  }, [user, authLoading, nav]);

  const load = useCallback(async () => {
    try {
      const data = (await listCustomDomains()) as unknown as DomainRow[];
      setRows(data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("domains.toast.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const add = async () => {
    const value = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    if (!value) return;
    setAdding(true);
    try {
      await addCustomDomain({ data: { domain: value } });
      setDomain("");
      toast.success(t("domains.toast.added"));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("domains.toast.addFailed"));
    } finally {
      setAdding(false);
    }
  };

  const verify = async (row: DomainRow) => {
    setChecking(row.id);
    try {
      // Live DoH lookup first: instant feedback, then the authoritative server check.
      const result = await liveCheck(row);
      setLive((prev) => ({ ...prev, [row.id]: result }));
      toast[result.state === "ok" ? "success" : "message"](t(`domains.live.${result.state}.body`));
      await verifyCustomDomain({ data: { id: row.id } });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("domains.toast.verifyFailed"));
    } finally {
      setChecking(null);
    }
  };

  // Once a domain exists and is pending or already active, collapse the setup UI
  // by default so the active domain + its verification take center stage.
  const hasActiveOrPending = useMemo(
    () =>
      rows.some(
        (r) => r.status === "pending" || r.status === "pointing" || r.status === "verified",
      ),
    [rows],
  );

  return (
    <AppLayout
      crumbs={[{ label: t("domains.crumb") }]}
      title={t("domains.title")}
      description={t("domains.description")}
    >
      <div>
        <Accordion
          type="single"
          collapsible
          defaultValue={hasActiveOrPending ? undefined : "add"}
          className="mt-6"
        >
          <AccordionItem
            value="add"
            className="rounded-2xl border border-border bg-card px-3.5 sm:px-5"
          >
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              <Label htmlFor="domain" className="cursor-pointer">
                {t("domains.add.label")}
              </Label>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="domain"
                  value={domain}
                  placeholder="links.yourbrand.com"
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void add();
                    }
                  }}
                />
                <Button onClick={add} disabled={adding || !domain.trim()} className="gap-2">
                  {adding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  {t("domains.add.button")}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("domains.add.hint")}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Collapsed by default so mobile users reach their domains without scrolling. */}
        <Accordion
          type="single"
          collapsible
          defaultValue={hasActiveOrPending ? undefined : "why"}
          className="mt-3"
        >
          <AccordionItem
            value="why"
            className="rounded-2xl border border-border bg-muted/30 px-3.5 sm:px-5"
          >
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              {t("domains.why.trigger")}
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-muted-foreground">
                {t("domains.why.body", {
                  sub1: "links.yourbrand.com",
                  sub2: "qr.yourbrand.com",
                  root: "yourbrand.com",
                })}
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  ["links.yourbrand.com", t("domains.why.reason1")],
                  ["qr.yourbrand.com", t("domains.why.reason2")],
                  ["go.yourbrand.com", t("domains.why.reason3")],
                ].map(([host, why]) => (
                  <li key={host} className="rounded-xl border border-border bg-background p-3">
                    <p className="break-all font-mono text-xs text-foreground">{host}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{why}</p>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <section className="mt-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
              <Globe className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">{t("domains.empty.title")}</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {t("domains.empty.body")}
              </p>
            </div>
          ) : (
            rows.map((row) => {
              const meta = STATUS_TONE[row.status] ?? STATUS_TONE.pending;
              const statusLabel = t(`domains.status.${row.status in STATUS_TONE ? row.status : "pending"}`);
              const Icon = meta.icon;
              const liveResult = live[row.id];
              const subdomain = isSubdomain(row.domain);
              const leaf = row.domain.split(".")[0];

              const txtHost = provider === "standard" ? `_rout.${row.domain}` : "_rout";
              const cnameHost = provider === "standard" ? row.domain : leaf;

              return (
                <article key={row.id} className="border border-border rounded-xl p-4 bg-card">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h2 className="min-w-0 break-all font-mono text-base text-foreground">
                      {row.domain}
                    </h2>
                    <Badge className={`gap-1 ${meta.tone}`}>
                      <Icon className="h-3 w-3" /> {statusLabel}
                    </Badge>
                    {row.is_default && (
                      <Badge variant="outline" className="gap-1">
                        <Star className="h-3 w-3" /> {t("domains.default")}
                      </Badge>
                    )}
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        disabled={checking === row.id}
                        onClick={() => verify(row)}
                      >
                        {checking === row.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        {t("domains.checkDns")}
                      </Button>
                      {row.status === "verified" && !row.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await setDefaultDomain({ data: { id: row.id } });
                            toast.success(t("domains.toast.makeDefault", { domain: row.domain }));
                            await load();
                          }}
                        >
                          {t("domains.makeDefault")}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("domains.removeLabel", { domain: row.domain })}
                        onClick={async () => {
                          await deleteCustomDomain({ data: { id: row.id } });
                          toast.success(t("domains.toast.removed"));
                          await load();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {row.status === "verified" && (
                    <div className="mt-3 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{t("domains.shortLinks.title")}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {row.short_links_enabled
                            ? t("domains.shortLinks.on", { domain: row.domain })
                            : t("domains.shortLinks.off")}
                        </p>
                      </div>
                      <Switch
                        checked={row.short_links_enabled}
                        aria-label={t("domains.shortLinks.aria", { domain: row.domain })}
                        onCheckedChange={async (enabled) => {
                          await setDomainShortLinks({ data: { id: row.id, enabled } });
                          toast.success(
                            enabled
                              ? t("domains.toast.shortLinksOn", { domain: row.domain })
                              : t("domains.toast.shortLinksOff", { domain: row.domain }),
                          );
                          await load();
                        }}
                      />
                    </div>
                  )}

                  {liveResult ? (
                    <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${LIVE[liveResult.state].dot}`}
                        />
                        <p className="text-sm font-medium text-foreground">
                          {t(`domains.live.${liveResult.state}.title`)}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t(`domains.live.${liveResult.state}.body`)}
                      </p>
                      <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                        {t("domains.liveResult.txtCname", {
                          txt: liveResult.txt ? "✓" : "✗",
                          route: liveResult.route ? "✓" : "✗",
                        })}
                      </p>
                    </div>
                  ) : null}

                  {row.status !== "verified" && (
                    <div className="mt-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`provider-${row.id}`}
                          className="text-xs font-medium text-muted-foreground"
                        >
                          {t("domains.provider.label")}
                        </Label>
                        <Select
                          value={provider}
                          onValueChange={(v) => setProvider(v as DnsProvider)}
                        >
                          <SelectTrigger id={`provider-${row.id}`} className="h-8 w-56 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">{t("domains.provider.standard")}</SelectItem>
                            <SelectItem value="cloudflare">{t("domains.provider.cloudflare")}</SelectItem>
                            <SelectItem value="transip">{t("domains.provider.transip")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <ol className="space-y-5">
                        <Step n={1} title={t("domains.step1.title")}>
                          <p>{t("domains.step1.body", { domain: row.domain })}</p>
                        </Step>
                        <Step n={2} title={t("domains.step2.title")}>
                          <p>{t("domains.step2.body")}</p>
                          <RecordCard
                            type="TXT"
                            host={txtHost}
                            value={row.verification_token}
                            onCopy={(v, w) => copy(v, w, t)}
                            hostLabel={t("domains.host")}
                            valueLabel={t("domains.value")}
                            copyLabel={(label) => t("domains.copyLabel", { label })}
                          />
                        </Step>
                        <Step n={3} title={t("domains.step3.title")}>
                          <p>{t("domains.step3.body")}</p>
                          {subdomain ? (
                            <RecordCard
                              type="CNAME"
                              host={cnameHost}
                              value={DOMAIN_CNAME_TARGET}
                              note={t("domains.step3.note")}
                              onCopy={(v, w) => copy(v, w, t)}
                              hostLabel={t("domains.host")}
                              valueLabel={t("domains.value")}
                              copyLabel={(label) => t("domains.copyLabel", { label })}
                            />
                          ) : (
                            <RecordCard
                              type="A"
                              host={cnameHost || "@"}
                              value={DOMAIN_A_TARGET}
                              onCopy={(v, w) => copy(v, w, t)}
                              hostLabel={t("domains.host")}
                              valueLabel={t("domains.value")}
                              copyLabel={(label) => t("domains.copyLabel", { label })}
                            />
                          )}
                        </Step>
                        <Step n={4} title={t("domains.step4.title")}>
                          <p>{t("domains.step4.body")}</p>
                        </Step>
                      </ol>
                    </div>
                  )}

                  {row.last_checked_at && (
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      {t("domains.lastChecked", { when: new Date(row.last_checked_at).toLocaleString() })}
                    </p>
                  )}
                </article>
              );
            })
          )}
        </section>
      </div>
    </AppLayout>
  );
}
