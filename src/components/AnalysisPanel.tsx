import {
  AlertTriangle,
  BookOpenCheck,
  Boxes,
  Eye,
  Link2,
  ListChecks,
  Scale,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ApiAnalysis, SerenityAnalysis } from "@/types";

/* ------------------------------------------------------------------------- */
/* Structured (simulated engine) analysis                                    */
/* ------------------------------------------------------------------------- */

const STRENGTH_VARIANT: Record<string, "default" | "accent" | "secondary" | "warning" | "bearish"> = {
  primary: "default",
  media: "accent",
  analysis: "accent",
  social: "warning",
  rumor: "bearish",
};

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
    <section>
      <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h4>
      {children}
    </section>
  );
}

function scoreTone(score: number): string {
  if (score >= 70) return "text-bullish";
  if (score >= 55) return "text-accent";
  return "text-muted-foreground";
}

export function StructuredAnalysis({ analysis }: { analysis: SerenityAnalysis }) {
  return (
    <div className="space-y-5">
      {/* Verdict header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">${analysis.ticker}</span>
            <span className="text-sm text-muted-foreground">{analysis.companyName}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary">Simulated skill run</Badge>
            <span className="text-xs text-muted-foreground">
              bottleneck scorecard · serenity-skill v1.0
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className={cn("text-3xl font-bold tabular-nums", scoreTone(analysis.finalScore))}>
            {analysis.finalScore}
            <span className="text-base font-medium text-muted-foreground">/100</span>
          </div>
          <div className="text-sm font-medium">{analysis.verdict}</div>
        </div>
      </div>

      <Section icon={Target} title="What exactly does it constrain?">
        <p className="text-sm leading-relaxed">{analysis.whatItConstrains}</p>
      </Section>

      <Section icon={Boxes} title="Value-chain breakdown">
        <p className="mb-3 text-sm text-muted-foreground">{analysis.chainPosition}</p>
        <ol className="space-y-1.5">
          {analysis.chain.map((layer) => {
            const isCompany = layer.layer.includes("◀");
            return (
              <li
                key={layer.layer}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm",
                  layer.isScarce
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/60 bg-background/30",
                  isCompany && "ring-1 ring-accent/50",
                )}
              >
                <div className="min-w-0">
                  <span className={cn("font-medium", isCompany && "text-accent")}>
                    {layer.layer.replace(" ◀ company", "")}
                  </span>
                  <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
                    {layer.role}
                  </span>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {isCompany && <Badge variant="accent">company</Badge>}
                  {layer.isScarce && <Badge>scarce layer</Badge>}
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section icon={Scale} title="Bottleneck scorecard">
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {analysis.factors.map((f) => (
            <div key={f.key}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="font-medium" title={f.note || undefined}>
                  {f.label}
                  {f.note && <span className="text-muted-foreground"> *</span>}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {f.rating}/5 · w{f.weight}
                </span>
              </div>
              <Progress value={(f.rating / 5) * 100} />
            </div>
          ))}
        </div>
        {analysis.factors.some((f) => f.note) && (
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {analysis.factors
              .filter((f) => f.note)
              .map((f) => (
                <li key={f.key}>
                  <span className="font-medium text-foreground/80">{f.label}:</span> {f.note}
                </li>
              ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {analysis.penalties
            .filter((p) => p.rating > 0)
            .map((p) => (
              <Badge key={p.key} variant="bearish" title={`-${p.points} points`}>
                {p.label} −{p.points}
              </Badge>
            ))}
        </div>
        <p className="mt-2 text-xs tabular-nums text-muted-foreground">
          Raw factor points {analysis.rawFactorPoints} − penalties {analysis.penaltyPoints} ={" "}
          <span className="font-medium text-foreground">{analysis.finalScore}</span>
        </p>
      </Section>

      <Section icon={Link2} title="Evidence (graded per the evidence ladder)">
        <ul className="space-y-2">
          {analysis.evidence.map((e, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Badge variant={STRENGTH_VARIANT[e.strength] ?? "secondary"} className="mt-0.5 shrink-0">
                {e.strength}
              </Badge>
              <div className="min-w-0">
                <p>{e.claim}</p>
                <p className="text-xs text-muted-foreground">{e.source}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={Eye} title="What the market may be missing">
        <p className="text-sm leading-relaxed">{analysis.marketMayMiss}</p>
      </Section>

      <Section icon={AlertTriangle} title="What could prove this wrong">
        <ul className="list-inside list-disc space-y-1 text-sm">
          {analysis.weakeners.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </Section>

      <Section icon={ListChecks} title="Next verification steps">
        <ul className="space-y-1.5 text-sm">
          {analysis.nextChecks.map((c, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {c}
            </li>
          ))}
        </ul>
      </Section>

      <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
        Research support only — ranked by research priority, not a buy/sell
        recommendation. The trading decision is yours. Simulated run of the
        Serenity Skill against tracked mentions and a curated knowledge base;
        verify every claim with the listed primary sources.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Claude-API (markdown) analysis                                            */
/* ------------------------------------------------------------------------- */

/** Tiny markdown renderer (headings, bold, lists, paragraphs) — no deps. */
function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split("\n");
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flushList = (key: number) => {
    if (list.length) {
      out.push(
        <ul key={`ul-${key}`} className="mb-3 list-inside list-disc space-y-1 text-sm">
          {list.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  const inline = (s: string): React.ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{part}</span>
      ),
    );

  lines.forEach((line, i) => {
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      flushList(i);
      const level = h[1].length;
      out.push(
        <h4
          key={i}
          className={cn(
            "mb-2 mt-4 font-semibold",
            level <= 2 ? "text-base" : "text-sm uppercase tracking-wide text-muted-foreground",
          )}
        >
          {inline(h[2])}
        </h4>,
      );
    } else if (/^\s*[-*]\s+/.test(line)) {
      list.push(line.replace(/^\s*[-*]\s+/, ""));
    } else if (line.trim() === "") {
      flushList(i);
    } else {
      flushList(i);
      out.push(
        <p key={i} className="mb-2 text-sm leading-relaxed">
          {inline(line)}
        </p>,
      );
    }
  });
  flushList(lines.length);
  return out;
}

export function ApiAnalysisView({ analysis }: { analysis: ApiAnalysis }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge className="gap-1">
          <BookOpenCheck className="h-3 w-3" /> Claude API · Serenity Skill
        </Badge>
        <span className="text-xs text-muted-foreground">
          {analysis.model} · {new Date(analysis.generatedAt).toLocaleString()}
        </span>
      </div>
      <div>{renderMarkdown(analysis.markdown)}</div>
      <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        Generated by Claude running the bundled Serenity Skill. Research support
        only; verify primary sources before acting.
      </p>
    </div>
  );
}
