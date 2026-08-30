import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Compass, Loader2, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { buildPriorityBoard, latestPeriod, type PriorityRow } from "@/lib/insights/priorities";
import { generatePeriodInsight, type PeriodInsight } from "@/lib/insights/digest";
import { aiConfigured, loadAiConfig, type AiConfig } from "@/lib/serenity/ai";
import type { MentionsData, ThemeTrend } from "@/types";

const TREND_STYLE: Record<ThemeTrend, string> = {
  rising: "border-bullish/40 bg-bullish/10 text-bullish",
  cooling: "border-bearish/40 bg-bearish/10 text-bearish",
  new: "border-accent/40 bg-accent/10 text-accent",
  steady: "border-border bg-muted/40 text-muted-foreground",
  thin: "border-border bg-muted/30 text-muted-foreground",
};

function TrendChip({ trend }: { trend: ThemeTrend }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        TREND_STYLE[trend],
      )}
    >
      {trend === "rising" && <TrendingUp className="h-3 w-3" />}
      {trend === "cooling" && <TrendingDown className="h-3 w-3" />}
      {t(`trend.${trend}`)}
    </span>
  );
}

function TickerRow({ r }: { r: PriorityRow }) {
  const { t } = useI18n();
  return (
    <li className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md border border-border/60 bg-background/30 px-2.5 py-1.5">
      <span className="font-semibold text-accent">${r.ticker}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{r.companyName}</span>
      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
        {t("prio.attention")} {Math.round(r.signalScore)}
        {r.curated && <> · {t("prio.bottleneck")} {Math.round(r.bottleneckScore)}</>}
      </span>
    </li>
  );
}

function Bucket({
  title,
  why,
  rows,
  tone,
}: {
  title: string;
  why: string;
  rows: PriorityRow[];
  tone: "good" | "warn" | "muted";
}) {
  const { t } = useI18n();
  const border =
    tone === "good" ? "border-bullish/30" : tone === "warn" ? "border-yellow-500/30" : "border-border/60";
  return (
    <div className={cn("min-w-0 rounded-lg border p-3", border)}>
      <div className="mb-0.5 text-xs font-semibold">{title}</div>
      <p className="mb-2 break-words text-[11px] leading-snug text-muted-foreground">{why}</p>
      {rows.length ? (
        <ul className="space-y-1">
          {rows.slice(0, 5).map((r) => (
            <TickerRow key={r.ticker} r={r} />
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-muted-foreground">{t("prio.empty")}</p>
      )}
    </div>
  );
}

export function ThemeRadar({ data }: { data: MentionsData }) {
  const { t, lang } = useI18n();
  const [granularity, setGranularity] = useState<"weekly" | "monthly">("weekly");
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [insight, setInsight] = useState<PeriodInsight | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const sync = () => setAiConfig(loadAiConfig());
    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, []);

  const period = useMemo(() => latestPeriod(data, granularity), [data, granularity]);
  const board = useMemo(() => buildPriorityBoard(data, period), [data, period]);

  // The written digest describes one specific period — drop it when the period
  // changes so a weekly narrative can never sit under monthly figures.
  useEffect(() => setInsight(null), [granularity, period?.key]);

  async function writeDigest() {
    if (!period || !aiConfigured(aiConfig) || running) return;
    setRunning(true);
    try {
      const res = await generatePeriodInsight(aiConfig, period, board, granularity, { lang });
      setInsight(res);
    } finally {
      setRunning(false);
    }
  }

  if (!period) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("radar.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("radar.noData")}</p>
        </CardContent>
      </Card>
    );
  }

  const maxShare = Math.max(0.01, ...period.themes.map((x) => x.share));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 shrink-0 text-primary" />
              <CardTitle>{t("radar.title")}</CardTitle>
            </div>
            <CardDescription className="break-words">{t("radar.sub")}</CardDescription>
          </div>
          <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-border/70 text-xs">
            {(["weekly", "monthly"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={cn(
                  "px-2.5 py-1.5 font-medium transition-colors",
                  granularity === g
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`radar.${g}`)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Period header + sample size */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{period.key}</Badge>
          <span>
            {period.from} → {period.to}
          </span>
          <span>·</span>
          <span>{t("radar.sample", { posts: period.posts, mentions: period.mentions })}</span>
        </div>

        {period.thin && (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-[11px] leading-relaxed text-yellow-100/90">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-400" />
            <span className="min-w-0 break-words">{t("radar.thin")}</span>
          </div>
        )}

        {/* Theme shares */}
        <div className="space-y-1.5">
          {period.themes.map((th) => (
            <div key={th.id} className="min-w-0">
              <div className="mb-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{th.title}</span>
                <TrendChip trend={th.trend} />
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {th.posts} · {Math.round(th.share * 100)}%
                  {th.trend !== "thin" && th.deltaShare !== 0 && (
                    <span className={th.deltaShare > 0 ? "text-bullish" : "text-bearish"}>
                      {" "}
                      {th.deltaShare > 0 ? "+" : ""}
                      {Math.round(th.deltaShare * 100)}pp
                    </span>
                  )}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${(th.share / maxShare) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {period.unclassified > 0 && (
            <p className="pt-1 text-[11px] text-muted-foreground">
              {t("radar.unclassified", { n: period.unclassified })}
            </p>
          )}
        </div>

        {/* Priority board */}
        <div className="border-t border-border/60 pt-4">
          <div className="mb-1 flex items-center gap-2">
            <Activity className="h-4 w-4 shrink-0 text-primary" />
            <h4 className="text-sm font-semibold">{t("prio.title")}</h4>
          </div>
          <p className="mb-3 break-words text-[11px] leading-snug text-muted-foreground">
            {t("prio.sub")}
          </p>
          <div className="grid gap-2 lg:grid-cols-2">
            <Bucket title={t("prio.priority")} why={t("prio.priorityWhy")} rows={board.priority} tone="good" />
            <Bucket title={t("prio.crowded")} why={t("prio.crowdedWhy")} rows={board.crowded} tone="warn" />
            <Bucket title={t("prio.quiet")} why={t("prio.quietWhy")} rows={board.quiet} tone="muted" />
            <Bucket
              title={t("prio.needsResearch")}
              why={t("prio.needsResearchWhy")}
              rows={board.needsResearch}
              tone="muted"
            />
          </div>
        </div>

        {/* AI narrative */}
        <div className="border-t border-border/60 pt-4">
          {aiConfigured(aiConfig) ? (
            <Button size="sm" onClick={writeDigest} disabled={running} className="gap-1.5">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {running ? t("insight.running") : t("insight.button")}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">{t("insight.needsAi")}</p>
          )}

          {insight && (
            <div className="mt-3 space-y-3">
              <p className="break-words text-sm font-medium leading-relaxed">{insight.headline}</p>
              {insight.degraded ? (
                <p className="break-words text-xs text-bearish">{insight.attentionShift}</p>
              ) : (
                <>
                  <Field label={t("insight.shift")} value={insight.attentionShift} />
                  <Field label={t("insight.layer")} value={insight.impliedScarceLayer} />
                  {insight.researchPriorities.length > 0 && (
                    <div className="min-w-0">
                      <Label>{t("insight.priorities")}</Label>
                      <ul className="space-y-1.5">
                        {insight.researchPriorities.map((p) => (
                          <li key={p.ticker} className="min-w-0 text-xs">
                            <span className="font-semibold text-accent">${p.ticker}</span>{" "}
                            <span className="break-words">{p.why}</span>
                            {p.nextCheck && (
                              <span className="block break-words text-muted-foreground">
                                {t("insight.nextCheck")}: {p.nextCheck}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <ListField label={t("insight.warnings")} items={insight.crowdedWarnings} />
                  <Field label={t("insight.contrarian")} value={insight.contrarian} />
                  <ListField label={t("insight.falsifiers")} items={insight.falsifiers} />
                  <p className="border-t border-border/60 pt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {t("insight.disclaimer")} · {insight.model}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div className="min-w-0">
      <Label>{label}</Label>
      <p className="break-words text-xs leading-relaxed">{value}</p>
    </div>
  );
}

function ListField({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="min-w-0">
      <Label>{label}</Label>
      <ul className="list-inside list-disc text-xs text-muted-foreground">
        {items.map((x, i) => (
          <li key={i} className="break-words">{x}</li>
        ))}
      </ul>
    </div>
  );
}
