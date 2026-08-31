import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Package, Upload } from "lucide-react";
import { FormatSelector, QRFormat } from "@/components/FormatSelector";
import { DPISelector, mmToPx } from "@/components/DPISelector";
import { getQRBlob, applyFilenameTokens } from "@/lib/qrGenerator";
import { cn, errorMessage } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface BatchRow {
  value: string;
  name?: string;
}

const PRESETS = {
  mono: { labelKey: "batch.preset.mono", fg: "#000000", bg: "#FFFFFF" },
  brand: { labelKey: "batch.preset.brand", fg: "#101010", bg: "#F5F2EC" },
  studio: { labelKey: "batch.preset.studio", fg: "#0B3D2E", bg: "#FFFFFF" },
} as const;

type PresetId = keyof typeof PRESETS;

const DEFAULT_TEXT =
  "https://example.com/product-1\nhttps://example.com/product-2\nhttps://example.com/product-3";

/** Clean a raw URL/string into a filesystem-friendly slug: strip protocol/www, dashes for separators. */
function slugify(raw: string): string {
  let s = (raw || "").trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
  s = s.replace(/[/]+/g, "-");
  s = s.replace(/[^a-z0-9]+/g, "-");
  s = s.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return s || "qrcode";
}

function parseCSV(text: string): BatchRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const [header, ...rest] = lines;
  const cols = header.split(",").map((c) => c.trim().toLowerCase());
  const valueIdx = cols.indexOf("value");
  const nameIdx = cols.indexOf("name");
  if (valueIdx === -1) {
    return lines.map((l) => ({ value: l.split(",")[0].trim() })).filter((r) => r.value);
  }
  return rest
    .map((line) => {
      const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      return { value: parts[valueIdx] || "", name: nameIdx >= 0 ? parts[nameIdx] : undefined };
    })
    .filter((r) => r.value);
}

export default function Batch() {
  const { t } = useI18n();
  const [text, setText] = useState(DEFAULT_TEXT);
  const [csvRows, setCsvRows] = useState<BatchRow[]>([]);
  const [source, setSource] = useState<"paste" | "csv">("paste");
  const [preset, setPreset] = useState<PresetId>("mono");
  const [format, setFormat] = useState<QRFormat>("png");
  const [pixelSize, setPixelSize] = useState(mmToPx(55, 300));
  const [physicalSize, setPhysicalSize] = useState(55);
  const [dpi, setDpi] = useState(300);
  const [unit, setUnit] = useState<"mm" | "in">("mm");
  const [pattern, setPattern] = useState("{name|value}-{index}");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sample, setSample] = useState<string | null>(null);
  const patternRef = useRef<HTMLInputElement>(null);

  const pastedRows = useMemo<BatchRow[]>(
    () =>
      text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((v) => ({ value: v })),
    [text],
  );

  const rows = source === "csv" ? csvRows : pastedRows;
  const detectedCount = source === "csv" ? csvRows.length : pastedRows.length;
  const { fg, bg } = { fg: PRESETS[preset].fg, bg: PRESETS[preset].bg };
  const ext = format === "jpeg" ? "jpg" : format;

  const sampleValue = rows[0]?.value ?? "https://example.com";
  const sampleName = applyFilenameTokens(pattern, {
    index: 1,
    value: slugify(sampleValue),
    name: rows[0]?.name ? slugify(rows[0].name) : undefined,
  });

  // Live sample preview of the selected style + size.
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    (async () => {
      try {
        const blob = await getQRBlob({
          data: sampleValue,
          size: 240,
          margin: 10,
          format: format === "svg" ? "svg" : format,
          fgColor: fg,
          bgColor: bg,
        });
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSample(url);
      } catch {
        /* preview is best-effort */
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [sampleValue, format, fg, bg]);

  const onCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const parsed = parseCSV(await f.text());
    setCsvRows(parsed);
    setSource("csv");
    toast.success(t("batch.toast.csvLoaded", { count: parsed.length }));
  };

  const insertToken = (token: string) => {
    const el = patternRef.current;
    if (!el) {
      setPattern((p) => p + token);
      return;
    }
    const start = el.selectionStart ?? pattern.length;
    const end = el.selectionEnd ?? pattern.length;
    const next = pattern.slice(0, start) + token + pattern.slice(end);
    setPattern(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const generate = async () => {
    if (!rows.length) return toast.error(t("batch.toast.addValuesFirst"));
    setBusy(true);
    setProgress(0);
    try {
      const zip = new JSZip();
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const blob = await getQRBlob({
          data: r.value,
          size: pixelSize,
          margin: 10,
          format,
          fgColor: fg,
          bgColor: bg,
        });
        const filename = applyFilenameTokens(pattern, {
          index: i + 1,
          value: slugify(r.value),
          name: r.name ? slugify(r.name) : undefined,
        });
        zip.file(`${filename}.${ext}`, blob);
        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-batch-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("batch.toast.downloaded", { count: rows.length }));
    } catch (e: unknown) {
      toast.error(errorMessage(e, t("batch.toast.generationFailed")));
    } finally {
      setBusy(false);
    }
  };

  const card = "rounded-2xl border border-border bg-card p-4 sm:p-5";

  return (
    <AppLayout
      title={t("batch.title")}
      description={t("batch.description")}
      crumbs={[{ label: t("batch.crumb") }]}
    >
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* 1 — Input */}
        <div className={card}>
          <Tabs value={source} onValueChange={(v) => setSource(v as "paste" | "csv")}>
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="paste">{t("batch.tabs.paste")}</TabsTrigger>
              <TabsTrigger value="csv">{t("batch.tabs.csv")}</TabsTrigger>
            </TabsList>
            <TabsContent value="paste" className="space-y-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"https://example.com/1\nhttps://example.com/2\nhttps://example.com/3"}
                className="min-h-40 font-mono text-sm"
              />
              <p className="font-mono text-xs text-muted-foreground">
                {pastedRows.length > 0
                  ? t("batch.paste.detected", { count: pastedRows.length })
                  : t("batch.paste.noneDetected")}
              </p>
            </TabsContent>
            <TabsContent value="csv" className="space-y-2">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 hover:bg-muted/40">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">{t("batch.csv.selectPrompt")}</span>
                <span className="text-[11px] text-muted-foreground">
                  {t("batch.csv.columnsHint")}
                </span>
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={onCsv} />
              </label>
              <p className="font-mono text-xs text-muted-foreground">
                {csvRows.length > 0 ? t("batch.csv.detected", { count: csvRows.length }) : t("batch.csv.noneDetected")}
              </p>
            </TabsContent>
          </Tabs>

          {rows.length > 0 && (
            <div className="mt-4 max-h-40 divide-y divide-border overflow-auto rounded-lg border border-border text-xs">
              {rows.slice(0, 50).map((r, i) => (
                <div key={i} className="flex justify-between gap-3 px-3 py-1.5">
                  <span className="tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(3, "0")}
                  </span>
                  <span className="flex-1 truncate">{r.value}</span>
                  {r.name && (
                    <span className="max-w-[120px] truncate text-muted-foreground">{r.name}</span>
                  )}
                </div>
              ))}
              {rows.length > 50 && (
                <div className="px-3 py-1.5 text-muted-foreground">
                  {t("batch.andMore", { count: rows.length - 50 })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2 — Design preset */}
        <div className={cn(card, "space-y-2")}>
          <Label className="text-sm">{t("batch.designPreset")}</Label>
          <Select value={preset} onValueChange={(v) => setPreset(v as PresetId)}>
            <SelectTrigger className="h-11 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PRESETS) as PresetId[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {t(PRESETS[k].labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
            <span className="h-4 w-4 rounded border border-border" style={{ background: fg }} />
            <span className="h-4 w-4 rounded border border-border" style={{ background: bg }} />
            <span className="font-mono">
              {fg} / {bg}
            </span>
          </div>
        </div>

        {/* 3 — Export specifications */}
        <div className={cn(card, "space-y-4")}>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("batch.exportSpecs")}
          </p>
          <div className="space-y-2">
            <Label className="text-sm">{t("batch.format")}</Label>
            <FormatSelector value={format} onChange={setFormat} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t("batch.sizeDpi")}</Label>
            <DPISelector
              pixelSize={pixelSize}
              onPixelSizeChange={setPixelSize}
              physicalSize={physicalSize}
              onPhysicalSizeChange={setPhysicalSize}
              dpi={dpi}
              onDpiChange={setDpi}
              unit={unit}
              onUnitChange={setUnit}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t("batch.filenamePattern")}</Label>
            <Input
              ref={patternRef}
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="h-11 rounded-lg font-mono"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(["{index}", "{value}", "{name}"] as const).map((token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => insertToken(token)}
                  className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  + {token}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("batch.tokensHint")}
            </p>
          </div>
        </div>

        {/* 4 — Live sample preview */}
        <div className={cn(card, "flex items-center gap-4")}>
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-border"
            style={{ background: bg }}
          >
            {sample ? (
              <img src={sample} alt="Sample QR preview" className="h-20 w-20" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("batch.samplePreview")}
            </p>
            <p className="mt-1 truncate font-mono text-sm text-foreground">
              {sampleName}.{ext}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {physicalSize} {unit} · {dpi} DPI · {pixelSize}px
            </p>
          </div>
        </div>

        {/* 5 — Primary action */}
        <Button
          onClick={generate}
          disabled={busy || detectedCount === 0}
          className="w-full rounded-xl bg-primary py-3.5 text-base font-medium text-primary-foreground"
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("batch.generating", { progress })}
            </>
          ) : (
            <>
              <Package className="mr-2 h-4 w-4" /> {t("batch.generateCta", { count: rows.length || "" })}
            </>
          )}
        </Button>
      </div>
    </AppLayout>
  );
}
