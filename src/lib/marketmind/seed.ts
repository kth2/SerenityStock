// Serenity → MarketMind adapter.
//
// Compresses a Serenity Skill analysis into a compact situation brief that all
// six agents share. Two goals:
//   1. MarketMind sits ON TOP of Serenity — the bottleneck score and verdict are
//      carried through verbatim and are READ-ONLY here. Agent opinions never
//      feed back into the scorecard; that would corrupt the methodology.
//   2. Token thrift — the brief is the single most-repeated chunk of every
//      prompt (it appears in all 12 agent calls), so it is deliberately terse.

import type { AnalysisResult } from "@/types";
import type { SimulationSeed } from "./types";

const trim = (s: string, max: number) =>
  s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;

export function buildSeed(
  query: string,
  result: AnalysisResult,
  usedAi: boolean,
  priceContext?: string,
): SimulationSeed {
  const base = {
    subject: query.trim(),
    priceContext,
    serenityUsedAi: usedAi,
  };

  if (result.kind === "theme") {
    const topLayers = result.layers.slice(0, 3).map((l) => l.name);
    const topNames = result.priorities
      .slice(0, 5)
      .map((p) => `$${p.ticker} (${p.role}, score ${p.score})`);
    return {
      ...base,
      kind: "theme",
      situation: trim(
        `Theme "${result.title}". System change: ${result.systemChange}` +
          (topNames.length ? ` Ranked candidates: ${topNames.join("; ")}.` : ""),
        900,
      ),
      scarceLayers: topLayers,
      evidence: result.evidencePaths.slice(0, 4),
      weakeners: result.risks.slice(0, 4),
      openQuestions: result.nextChecks.slice(0, 4),
    };
  }

  if (result.kind === "comparison") {
    const ranked = result.ranked
      .slice(0, 5)
      .map((r) => `$${r.ticker} ${r.companyName}: ${r.finalScore}/100 (${r.verdict})`);
    const lead = result.ranked[0];
    return {
      ...base,
      kind: "comparison",
      situation: trim(
        `Comparison of ${result.ranked.length} companies, ranked by the Serenity ` +
          `bottleneck scorecard: ${ranked.join("; ")}.` +
          (lead ? ` Top-ranked: ${lead.whatItConstrains}` : ""),
        900,
      ),
      bottleneckScore: lead?.finalScore,
      verdict: lead?.verdict,
      scarceLayers: lead?.scarceLayers ?? [],
      evidence: (lead?.evidence ?? [])
        .slice(0, 3)
        .map((e) => `${e.claim} [${e.strength}]`),
      weakeners: lead?.weakeners.slice(0, 4) ?? [],
      openQuestions: lead?.nextChecks.slice(0, 4) ?? [],
    };
  }

  // Single company.
  return {
    ...base,
    kind: "ticker",
    situation: trim(
      `$${result.ticker} (${result.companyName}). What it constrains: ` +
        `${result.whatItConstrains} Chain position: ${result.chainPosition}` +
        (result.marketMayMiss ? ` What the market may miss: ${result.marketMayMiss}` : ""),
      900,
    ),
    bottleneckScore: result.finalScore,
    verdict: result.verdict,
    scarceLayers: result.scarceLayers,
    evidence: result.evidence.slice(0, 3).map((e) => `${e.claim} [${e.strength}]`),
    weakeners: result.weakeners.slice(0, 4),
    openQuestions: result.nextChecks.slice(0, 4),
  };
}

/** Render the seed as the shared prompt block given to every agent. */
export function seedToPrompt(seed: SimulationSeed): string {
  const lines = [
    `SITUATION (established by the Serenity supply-chain bottleneck analysis):`,
    seed.situation,
  ];
  if (typeof seed.bottleneckScore === "number") {
    lines.push(
      `Bottleneck scorecard: ${seed.bottleneckScore}/100 — ${seed.verdict ?? "n/a"} ` +
        `(a RESEARCH-PRIORITY signal, not a price view).`,
    );
  }
  if (seed.scarceLayers.length) {
    lines.push(`Scarce layer(s): ${seed.scarceLayers.join(", ")}.`);
  }
  if (seed.evidence.length) {
    lines.push(`Evidence so far: ${seed.evidence.join(" | ")}.`);
  }
  if (seed.weakeners.length) {
    lines.push(`Known weakeners: ${seed.weakeners.join(" | ")}.`);
  }
  if (seed.openQuestions.length) {
    lines.push(`Still unverified: ${seed.openQuestions.join(" | ")}.`);
  }
  if (seed.priceContext) {
    lines.push(seed.priceContext);
  }
  return lines.join("\n");
}
