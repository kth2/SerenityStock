// Deterministic aggregation of a round of agent reactions.
//
// This runs BETWEEN the two LLM stages and costs ZERO calls — that is the main
// reason the whole simulation fits in ~14 calls. Everything here is plain
// arithmetic over the validated agent JSON: no model is asked to summarize what
// the app can compute exactly.

import { AGENT_BY_ID } from "./agents";
import type { AgentReaction, Horizon, RoundSummary, Stance } from "./types";

const STANCE_SIGN: Record<Stance, number> = { bullish: 1, bearish: -1, neutral: 0 };
const HORIZON_ORDER: Horizon[] = ["intraday", "days", "weeks", "months"];

/** Count occurrences across agents, most-cited first. */
function topItems(reactions: AgentReaction[], key: "triggers" | "risks", max = 4): string[] {
  const counts = new Map<string, { text: string; n: number }>();
  for (const r of reactions) {
    // Dedupe within an agent so one agent repeating itself can't dominate.
    const seen = new Set<string>();
    for (const item of r[key]) {
      const norm = item.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 70);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      const prev = counts.get(norm);
      if (prev) prev.n += 1;
      else counts.set(norm, { text: item.trim(), n: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, max)
    .map((c) => c.text);
}

export function aggregate(reactions: AgentReaction[], stage: 1 | 2): RoundSummary {
  const stanceCounts: Record<Stance, number> = { bullish: 0, bearish: 0, neutral: 0 };
  for (const r of reactions) stanceCounts[r.stance] += 1;

  const n = Math.max(1, reactions.length);

  // Conviction-weighted net bias in [-1, 1]: a bullish agent with conviction 5
  // pulls harder than a bullish agent with conviction 1.
  const weighted = reactions.reduce(
    (sum, r) => sum + STANCE_SIGN[r.stance] * (r.conviction / 5),
    0,
  );
  const netBias = Number((weighted / n).toFixed(3));

  const avgConviction = Number(
    (reactions.reduce((s, r) => s + r.conviction, 0) / n).toFixed(2),
  );

  // Consensus = share holding the modal stance (1 = unanimous).
  const modal = Math.max(stanceCounts.bullish, stanceCounts.bearish, stanceCounts.neutral);
  const consensus = Number((modal / n).toFixed(3));

  // Dominant horizon: most common, ties broken toward the shorter horizon
  // (faster money sets the near-term tape).
  const horizonCounts = new Map<Horizon, number>();
  for (const r of reactions) {
    horizonCounts.set(r.horizon, (horizonCounts.get(r.horizon) ?? 0) + 1);
  }
  let dominantHorizon: Horizon = "days";
  let best = -1;
  for (const h of HORIZON_ORDER) {
    const c = horizonCounts.get(h) ?? 0;
    if (c > best) {
      best = c;
      dominantHorizon = h;
    }
  }

  const degradedCount = reactions.filter((r) => r.degraded).length;

  const leaning =
    netBias > 0.15 ? "leans bullish" : netBias < -0.15 ? "leans bearish" : "is split";
  const agreement =
    consensus >= 0.8 ? "strong agreement" : consensus >= 0.6 ? "partial agreement" : "wide disagreement";
  const loudest = [...reactions].sort((a, b) => b.conviction - a.conviction)[0];
  const headline =
    `Round ${stage}: the simulated market ${leaning} (${agreement}; ` +
    `${stanceCounts.bullish} bullish / ${stanceCounts.neutral} neutral / ` +
    `${stanceCounts.bearish} bearish, avg conviction ${avgConviction}/5)` +
    (loudest ? `. Strongest view: ${AGENT_BY_ID[loudest.agent]?.name ?? loudest.agent}.` : ".");

  return {
    stage,
    stanceCounts,
    netBias,
    consensus,
    avgConviction,
    dominantHorizon,
    topTriggers: topItems(reactions, "triggers"),
    topRisks: topItems(reactions, "risks"),
    headline,
    degradedCount,
  };
}

/**
 * Should we skip stage 2? Only when the agents already agree strongly AND mean
 * it (high conviction) AND the round was not degraded — a round full of
 * fallbacks looks "unanimously neutral" but carries no information, so it must
 * NOT be mistaken for convergence.
 */
export function hasConverged(summary: RoundSummary): boolean {
  return (
    summary.degradedCount === 0 &&
    summary.consensus >= 0.85 &&
    summary.avgConviction >= 3.5
  );
}

/** Render a round summary as prompt text for stage 2 / synthesis. */
export function summaryToPrompt(summary: RoundSummary, reactions: AgentReaction[]): string {
  const perAgent = reactions
    .map(
      (r) =>
        `- ${AGENT_BY_ID[r.agent]?.name ?? r.agent}: ${r.stance} ` +
        `(conviction ${r.conviction}/5, ${r.horizon}) — ${r.action}`,
    )
    .join("\n");
  return [
    `AGGREGATED MARKET REACTION (round ${summary.stage}, computed by the app):`,
    summary.headline,
    `Net bias ${summary.netBias} (-1 bearish … +1 bullish), consensus ${summary.consensus}, ` +
      `dominant horizon: ${summary.dominantHorizon}.`,
    perAgent,
    summary.topTriggers.length ? `Most-cited triggers: ${summary.topTriggers.join(" | ")}.` : "",
    summary.topRisks.length ? `Most-cited risks: ${summary.topRisks.join(" | ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
