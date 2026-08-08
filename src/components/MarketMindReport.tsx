import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Eye,
  GitBranch,
  Minus,
  Repeat,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  AgentReaction,
  MarketMindReport as Report,
  RoundSummary,
  Stance,
} from "@/lib/marketmind/types";

const STANCE_STYLE: Record<Stance, string> = {
  bullish: "border-bullish/40 bg-bullish/10 text-bullish",
  bearish: "border-bearish/40 bg-bearish/10 text-bearish",
  neutral: "border-border bg-muted/40 text-muted-foreground",
};

function StanceIcon({ stance }: { stance: Stance }) {
  if (stance === "bullish") return <ArrowUpRight className="h-3.5 w-3.5" />;
  if (stance === "bearish") return <ArrowDownRight className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0">
      <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" /> {title}
      </h4>
      {children}
    </section>
  );
}

/** One participant's reaction card. */
function AgentCard({ r }: { r: AgentReaction }) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border p-3",
        r.degraded ? "border-dashed border-border/70 bg-background/20" : "border-border/60 bg-background/30",
      )}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{t(`mm.agent.${r.agent}`)}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
            STANCE_STYLE[r.stance],
          )}
        >
          <StanceIcon stance={r.stance} />
          {t(`mm.stance.${r.stance}`)}
        </span>
        {r.degraded ? (
          <Badge variant="warning">{t("mm.degraded")}</Badge>
        ) : (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {t("mm.conviction")} {r.conviction}/5 · {r.horizon}
          </span>
        )}
      </div>
      <p className="break-words text-sm leading-relaxed text-foreground/90">{r.rationale}</p>
      {!r.degraded && (
        <p className="mt-1.5 break-words text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">→</span> {r.action}
        </p>
      )}
      {(r.triggers.length > 0 || r.risks.length > 0) && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {r.triggers.length > 0 && (
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wide text-bullish/80">
                {t("mm.triggers")}
              </div>
              <ul className="list-inside list-disc text-xs text-muted-foreground">
                {r.triggers.map((x, i) => (
                  <li key={i} className="break-words">{x}</li>
                ))}
              </ul>
            </div>
          )}
          {r.risks.length > 0 && (
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wide text-bearish/80">
                {t("mm.risks")}
              </div>
              <ul className="list-inside list-disc text-xs text-muted-foreground">
                {r.risks.map((x, i) => (
                  <li key={i} className="break-words">{x}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Deterministic round summary bar. */
function RoundBar({ summary }: { summary: RoundSummary }) {
  const total = Math.max(
    1,
    summary.stanceCounts.bullish + summary.stanceCounts.neutral + summary.stanceCounts.bearish,
  );
  const pct = (n: number) => (n / total) * 100;
  return (
    <div className="mb-3 rounded-lg border border-border/60 bg-background/40 p-3">
      <p className="mb-2 break-words text-xs leading-relaxed text-foreground/80">
        {summary.headline}
      </p>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-bullish" style={{ width: `${pct(summary.stanceCounts.bullish)}%` }} />
        <div className="bg-muted-foreground/40" style={{ width: `${pct(summary.stanceCounts.neutral)}%` }} />
        <div className="bg-bearish" style={{ width: `${pct(summary.stanceCounts.bearish)}%` }} />
      </div>
      {(summary.topTriggers.length > 0 || summary.topRisks.length > 0) && (
        <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
          {summary.topTriggers.length > 0 && (
            <p className="break-words">
              <span className="text-bullish/80">▲</span> {summary.topTriggers.join(" · ")}
            </p>
          )}
          {summary.topRisks.length > 0 && (
            <p className="break-words">
              <span className="text-bearish/80">▼</span> {summary.topRisks.join(" · ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ScenarioCard({
  label,
  tone,
  narrative,
  conditions,
}: {
  label: string;
  tone: "bull" | "base" | "bear";
  narrative: string;
  conditions: string[];
}) {
  const { t } = useI18n();
  const style =
    tone === "bull"
      ? "border-bullish/40 bg-bullish/5"
      : tone === "bear"
        ? "border-bearish/40 bg-bearish/5"
        : "border-border/60 bg-background/30";
  const labelStyle =
    tone === "bull" ? "text-bullish" : tone === "bear" ? "text-bearish" : "text-muted-foreground";
  return (
    <div className={cn("min-w-0 rounded-lg border p-3", style)}>
      <div className={cn("mb-1 text-xs font-semibold uppercase tracking-wide", labelStyle)}>
        {label}
      </div>
      <p className="break-words text-sm leading-relaxed">{narrative}</p>
      {conditions.length > 0 && (
        <>
          <div className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("mm.conditions")}
          </div>
          <ul className="list-inside list-disc text-xs text-muted-foreground">
            {conditions.map((c, i) => (
              <li key={i} className="break-words">{c}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function MarketMindReportView({ report }: { report: Report }) {
  const { t } = useI18n();
  const s = report.synthesis;
  const budgetPct = (report.budget.totalCalls / Math.max(1, report.budget.maximumCalls)) * 100;

  return (
    <div className="min-w-0 space-y-5">
      {/* Headline */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <p className="break-words text-sm font-medium leading-relaxed">{s.headline}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="secondary">
            {report.budget.totalCalls} {t("mm.calls")}
          </Badge>
          <span className="break-all">{report.provider.model}</span>
          {report.stoppedEarly === "converged" && (
            <Badge variant="accent">{t("mm.converged")}</Badge>
          )}
        </div>
        <Progress value={budgetPct} className="mt-2 h-1" />
      </div>

      {/* Warnings */}
      {report.warnings.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs leading-relaxed text-yellow-100/90">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-400" />
          <div className="min-w-0 space-y-0.5">
            {report.warnings.map((w, i) => (
              <p key={i} className="break-words">{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Serenity situation */}
      <Section icon={Eye} title={t("mm.sec.serenity")}>
        <p className="break-words text-sm leading-relaxed text-foreground/90">
          {report.seed.situation}
        </p>
        {typeof report.seed.bottleneckScore === "number" && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">
              {report.seed.bottleneckScore}/100
            </span>{" "}
            — {report.seed.verdict}
          </p>
        )}
      </Section>

      {/* Round 1 */}
      <Section icon={Users} title={t("mm.sec.round1")}>
        <RoundBar summary={report.round1} />
        <div className="grid gap-2 lg:grid-cols-2">
          {report.stage1.map((r) => (
            <AgentCard key={`s1-${r.agent}`} r={r} />
          ))}
        </div>
      </Section>

      {/* Round 2 */}
      {report.stage2 && report.round2 && (
        <Section icon={Repeat} title={t("mm.sec.round2")}>
          <RoundBar summary={report.round2} />
          <div className="grid gap-2 lg:grid-cols-2">
            {report.stage2.map((r) => (
              <AgentCard key={`s2-${r.agent}`} r={r} />
            ))}
          </div>
        </Section>
      )}

      {/* Cascade */}
      {s.cascade.length > 0 && (
        <Section icon={GitBranch} title={t("mm.sec.cascade")}>
          <ol className="space-y-1.5">
            {s.cascade.map((c) => (
              <li
                key={c.step}
                className="flex min-w-0 items-start gap-2 rounded-md border border-border/60 bg-background/30 px-3 py-2 text-sm"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                  {c.step}
                </span>
                <span className="min-w-0 break-words">
                  <span className="font-medium text-accent">{c.actor}</span>
                  <ArrowRight className="mx-1 inline h-3 w-3 text-muted-foreground" />
                  {c.effect}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Scenarios */}
      <Section icon={GitBranch} title={t("mm.sec.scenarios")}>
        <div className="grid gap-2 lg:grid-cols-3">
          <ScenarioCard label={t("mm.bull")} tone="bull" {...s.bull} />
          <ScenarioCard label={t("mm.base")} tone="base" {...s.base} />
          <ScenarioCard label={t("mm.bear")} tone="bear" {...s.bear} />
        </div>
      </Section>

      {/* Risks + watch items */}
      {s.keyRisks.length > 0 && (
        <Section icon={AlertTriangle} title={t("mm.sec.risks")}>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {s.keyRisks.map((r, i) => (
              <li key={i} className="break-words">{r}</li>
            ))}
          </ul>
        </Section>
      )}

      {s.watchItems.length > 0 && (
        <Section icon={Eye} title={t("mm.sec.watch")}>
          <ul className="space-y-1.5 text-sm">
            {s.watchItems.map((w, i) => (
              <li key={i} className="flex min-w-0 items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="break-words">{w}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {s.reflexivity && s.reflexivity !== "—" && (
        <Section icon={Repeat} title={t("mm.sec.reflexivity")}>
          <p className="break-words text-sm leading-relaxed">{s.reflexivity}</p>
        </Section>
      )}

      <p className="border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
        {t("mm.disclaimer")}
      </p>
    </div>
  );
}
