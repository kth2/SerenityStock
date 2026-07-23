import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  History,
  Microscope,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiSettings } from "@/components/AiSettings";
import {
  ApiAnalysisView,
  ComparisonView,
  StructuredAnalysis,
  ThemeAnalysisView,
} from "@/components/AnalysisPanel";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { analyzeQuery, wouldUseAi } from "@/lib/serenity/analyze";
import { aiConfigured, loadAiConfig, type AiConfig } from "@/lib/serenity/ai";
import { PriceChip } from "@/components/Signals";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AnalysesData, AnalysisResult, MentionsData, QuotesData, TickerAggregate } from "@/types";

const EXAMPLES = ["AAOI", "neocloud stocks", "AI CPO", "WULF, CIFR, IREN", "data center power", "robotics"];

const KIND_KEY: Record<string, string> = {
  ticker: "kind.ticker",
  comparison: "kind.comparison",
  theme: "kind.theme",
};

interface AnalyzeTabProps {
  data: MentionsData | null;
  analyses: AnalysesData | null;
  quotes: QuotesData | null;
}

export function AnalyzeTab({ data, analyses, quotes }: AnalyzeTabProps) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<{ query: string; result: AnalysisResult } | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const { history, save, remove, clear } = useAnalysisHistory();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setAiConfig(loadAiConfig());
  }, []);

  const aiOn = aiConfigured(aiConfig);

  const aggs = useMemo(() => {
    const m = new Map<string, TickerAggregate>();
    for (const t of data?.tickers ?? []) m.set(t.ticker, t);
    return m;
  }, [data]);

  async function analyze(raw: string) {
    const q = raw.trim();
    if (!q || running) return;
    setRunning(true);
    setWarning(null);
    setQuery(q);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const outcome = await analyzeQuery(q, aggs, aiConfig, controller.signal, lang);
      if (controller.signal.aborted) return;
      setCurrent({ query: q, result: outcome.result });
      setWarning(outcome.warning ?? null);
      save(q, outcome.result);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setWarning(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      if (abortRef.current === controller) {
        setRunning(false);
        abortRef.current = null;
      }
    }
  }

  // Prefer a precomputed Claude-API analysis for single tickers when available.
  const apiAnalysis =
    current?.result.kind !== "theme" && current?.result.kind !== "comparison"
      ? analyses?.analyses?.[(current?.result as { ticker?: string })?.ticker ?? ""]
      : undefined;

  // Nudge to enable AI when the current query landed on a generic fallback.
  const showAiNudge = !aiOn && current != null && wouldUseAi(current.query);

  return (
    <div className="space-y-4">
      {/* Hero input */}
      <Card className="border-primary/30 bg-gradient-to-b from-primary/5 to-transparent">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">{t("analyze.title")}</h2>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border/70 bg-background/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">AI</span>
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  aiOn ? "bg-bullish" : "bg-muted-foreground/40",
                )}
                title={aiOn ? "AI research is on" : "AI research is off"}
              />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              analyze(query);
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("analyze.placeholder")}
                aria-label={t("analyze.placeholder")}
                autoCapitalize="characters"
                spellCheck={false}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 pl-9 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              />
            </div>
            <Button type="submit" size="lg" disabled={running || !query.trim()} className="gap-2">
              <Microscope className="h-4 w-4" />
              {running ? (aiOn ? t("analyze.researching") : t("analyze.running")) : t("analyze.button")}
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{t("analyze.try")}</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => analyze(ex)}
                className="rounded-md border border-border/70 bg-background/50 px-2 py-1 text-xs text-foreground/80 transition-colors hover:border-primary/50 hover:bg-primary/10"
              >
                {ex}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {t("analyze.desc")}
            {aiOn ? (
              <>
                {" "}
                <span className="text-primary">{t("analyze.aiOn")}</span>
                {t("analyze.aiOnTail")}
              </>
            ) : (
              <>
                {" "}
                <button onClick={() => setSettingsOpen(true)} className="text-accent hover:underline">
                  {t("analyze.connectAi")}
                </button>
                {t("analyze.connectAiTail")}
              </>
            )}
          </p>
        </CardContent>
      </Card>

      {warning && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-xs leading-relaxed text-yellow-100/90">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-400" />
          <span>{warning}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        {/* Result */}
        <div className="min-w-0">
          {current ? (
            <Card>
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
                  <Badge>{t(KIND_KEY[current.result.kind ?? "ticker"])}</Badge>
                  {"ai" in current.result && current.result.ai && (
                    <Badge variant="warning" title={`Generated by ${current.result.ai.model} — verify before acting`}>
                      {t("badge.aiUnverified")}
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">“{current.query}”</span>
                  {(() => {
                    const tk = (current.result as { ticker?: string }).ticker;
                    const q = tk ? quotes?.quotes?.[tk] : undefined;
                    return q ? <PriceChip quote={q} /> : null;
                  })()}
                  <button
                    onClick={() => setCurrent(null)}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                    aria-label="Close result"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {showAiNudge && (
                  <div className="mb-4 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs leading-relaxed text-foreground/80">
                    {t("analyze.aiNudge")}{" "}
                    <button onClick={() => setSettingsOpen(true)} className="font-medium text-accent hover:underline">
                      {t("analyze.aiNudgeCta")}
                    </button>
                    {t("analyze.aiNudgeTail")}
                  </div>
                )}

                {current.result.kind === "theme" ? (
                  <ThemeAnalysisView analysis={current.result} onSelectTicker={analyze} />
                ) : current.result.kind === "comparison" ? (
                  <ComparisonView analysis={current.result} />
                ) : apiAnalysis ? (
                  <ApiAnalysisView analysis={apiAnalysis} />
                ) : (
                  <StructuredAnalysis analysis={current.result} />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex min-h-48 flex-col items-center justify-center gap-2 p-8 text-center">
                <Microscope className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">{t("analyze.empty")}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* History */}
        <Card className="h-fit">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <CardTitle>{t("history.title")}</CardTitle>
            </div>
            {history.length > 0 && (
              <button
                onClick={clear}
                className="text-xs text-muted-foreground hover:text-bearish"
                title={t("history.clear")}
              >
                {t("history.clear")}
              </button>
            )}
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("history.empty")}</p>
            ) : (
              <ul className="space-y-1.5">
                {history.map((h) => (
                  <li key={h.id} className="group flex items-start gap-1">
                    <button
                      onClick={() => {
                        setQuery(h.query);
                        setWarning(null);
                        setCurrent({ query: h.query, result: h.result });
                      }}
                      className={cn(
                        "min-w-0 flex-1 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50",
                        current?.query === h.query && "bg-muted/40",
                      )}
                    >
                      <span className="block truncate text-sm">{h.label}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {t(KIND_KEY[h.kind])} ·{" "}
                        {new Date(h.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </button>
                    <button
                      onClick={() => remove(h.id)}
                      className="mt-1.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity hover:text-bearish group-hover:opacity-100"
                      aria-label={`Delete ${h.label}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <AiSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={(cfg) => setAiConfig(cfg)}
      />
    </div>
  );
}
