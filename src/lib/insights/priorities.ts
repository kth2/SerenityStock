// Research-priority triage for a period digest.
//
// Deliberately NOT a blended "score" and NOT a buy list. The Serenity method's
// central claim is that attention concentrates in the VISIBLE layer, which is
// rarely the SCARCE one — so ranking by mention count alone would invert the
// methodology. Instead we place each name on two independent axes and let the
// quadrant do the talking:
//
//              bottleneck score →
//   attention  ┌──────────────┬──────────────┐
//      ↑       │ crowded      │ priority     │   priority  = discussed AND scores well
//              │ (popular but │ (worth the   │   crowded   = popular, weak control  ← the
//              │  weak grip)  │  work first) │                methodology's warning list
//              ├──────────────┼──────────────┤   quiet     = scores well, little discussed
//              │ background   │ quiet        │   background= neither
//              └──────────────┴──────────────┘
//
// Attention comes from the deterministic signal score (mention frequency,
// recency, persistence, conviction). Bottleneck comes from scorecard.ts. Names
// outside the curated knowledge base only have a generic scaffold score, so
// they are flagged `curated: false` and reported as "needs research" rather
// than being ranked as if their score were verified.

import { isCurated, runSerenityAnalysis } from "@/lib/serenity/engine";
import type { MentionsData, PeriodDigest, TickerAggregate } from "@/types";

export type Quadrant = "priority" | "crowded" | "quiet" | "background";

export interface PriorityRow {
  ticker: string;
  companyName: string;
  /** Mentions inside the selected period. */
  periodMentions: number;
  /** 0-100 deterministic attention score (whole history). */
  signalScore: number;
  /** 0-100 bottleneck scorecard. Only meaningful when `curated`. */
  bottleneckScore: number;
  verdict: string;
  /** False → the bottleneck score is a generic scaffold, not a real judgment. */
  curated: boolean;
  themes: string[];
  quadrant: Quadrant;
}

/** "Meaningful attention" and "worth tracking" thresholds. The bottleneck cut
 *  is the scorecard's own 55 ("Worth tracking") boundary. */
export const ATTENTION_CUT = 55;
export const BOTTLENECK_CUT = 55;

function quadrantOf(signal: number, bottleneck: number): Quadrant {
  const hot = signal >= ATTENTION_CUT;
  const strong = bottleneck >= BOTTLENECK_CUT;
  if (hot && strong) return "priority";
  if (hot && !strong) return "crowded";
  if (!hot && strong) return "quiet";
  return "background";
}

export interface PriorityBoard {
  rows: PriorityRow[];
  priority: PriorityRow[];
  crowded: PriorityRow[];
  quiet: PriorityRow[];
  /** Names in the period with no verified bottleneck score yet. */
  needsResearch: PriorityRow[];
}

/**
 * Build the board for one period. Only tickers actually mentioned in that
 * period are considered, so the board reflects the period, not all history.
 */
export function buildPriorityBoard(
  data: MentionsData,
  period: PeriodDigest | null,
): PriorityBoard {
  const aggById = new Map<string, TickerAggregate>();
  for (const t of data.tickers) aggById.set(t.ticker, t);

  const inPeriod = period?.topTickers ?? [];
  const rows: PriorityRow[] = inPeriod.map((pt) => {
    const agg = aggById.get(pt.ticker);
    const analysis = runSerenityAnalysis(pt.ticker, agg);
    const curated = isCurated(pt.ticker);
    const signalScore = agg?.signalScore ?? 0;
    return {
      ticker: pt.ticker,
      companyName: analysis.companyName,
      periodMentions: pt.count,
      signalScore,
      bottleneckScore: analysis.finalScore,
      verdict: analysis.verdict,
      curated,
      themes: pt.themes,
      quadrant: quadrantOf(signalScore, analysis.finalScore),
    };
  });

  // Rank within a quadrant by attention, then bottleneck.
  const byInterest = (a: PriorityRow, b: PriorityRow) =>
    b.signalScore - a.signalScore || b.bottleneckScore - a.bottleneckScore;

  const curatedRows = rows.filter((r) => r.curated);
  return {
    rows: [...rows].sort(byInterest),
    priority: curatedRows.filter((r) => r.quadrant === "priority").sort(byInterest),
    crowded: curatedRows.filter((r) => r.quadrant === "crowded").sort(byInterest),
    quiet: curatedRows.filter((r) => r.quadrant === "quiet").sort(byInterest),
    needsResearch: rows.filter((r) => !r.curated).sort(byInterest),
  };
}

/** Latest period of a granularity, or null when there is no data. */
export function latestPeriod(
  data: MentionsData | null,
  granularity: "weekly" | "monthly",
): PeriodDigest | null {
  const list = data?.periods?.[granularity] ?? [];
  return list.length ? list[list.length - 1] : null;
}
