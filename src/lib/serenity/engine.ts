// Simulated Serenity Skill engine.
//
// Runs the skill's research workflow (SKILL.md steps 1-9) against the curated
// knowledge base plus the live mention statistics, and scores the result with
// the exact bottleneck-scorecard math from skill/scripts/serenity_scorecard.py.
//
// In a deployment with a backend, this same shape would be produced by Claude
// running the skill via scripts/analyze.mjs; the UI treats both identically.

import type { SerenityAnalysis, TickerAggregate } from "@/types";
import { KNOWLEDGE, buildAiInfraChain, type TickerKnowledge } from "./knowledge";
import { scoreCard } from "./scorecard";

/** Deterministic hash so unknown tickers always get the same profile. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Conservative generic profile for tickers outside the knowledge base. */
function genericKnowledge(ticker: string, agg?: TickerAggregate): TickerKnowledge {
  const seed = hash(ticker);
  const pick = (n: number, lo: number, hi: number) =>
    lo + ((seed >> (n * 3)) % (hi - lo + 1));
  const mentionBoost = Math.min(2, Math.floor((agg?.count ?? 0) / 3));

  return {
    name: ticker,
    theme: "Uncatalogued — first-pass scan",
    layer: "Modules & subsystems",
    whatItConstrains:
      "Not yet established. Per the skill, the first question to answer is: " +
      "'what exactly does this company constrain?' — until that has a " +
      "one-sentence answer backed by evidence, this is a lead, not a thesis.",
    chainPosition:
      "Chain position unverified. Classify it as one of: controls the scarce " +
      "layer / supplies the scarce layer / benefits from the trend / weak " +
      "control / mainly a story.",
    scarceLayers: [],
    factors: {
      demand_inflection: pick(0, 1, 3) + mentionBoost > 5 ? 5 : pick(0, 1, 3) + mentionBoost,
      architecture_coupling: pick(1, 1, 3),
      chokepoint_severity: pick(2, 1, 2),
      supplier_concentration: pick(3, 1, 3),
      expansion_difficulty: pick(4, 1, 3),
      evidence_quality: 1,
      valuation_disconnect: pick(5, 1, 3),
      catalyst_timing: pick(6, 1, 3),
    },
    factorNotes: {
      evidence_quality:
        "Only social-tier signals so far — evidence ladder requires filings or primary sources before this rises",
    },
    penalties: {
      hype_risk: 2,
      liquidity: pick(7, 0, 2),
      cyclicality: pick(8, 0, 2),
      dilution_financing: 0, governance: 0, geopolitics: 0,
      accounting_quality: 0, alternative_design_risk: 1,
    },
    marketMayMiss:
      "Unknown — the mention pattern is the only signal. Treat social posts as " +
      "lead generation (evidence ladder tier 4) and verify with primary sources.",
    evidence: [
      {
        claim: `Recurring mentions by the tracked account (${agg?.count ?? 0} tracked)`,
        source: "@aleabitoreddit timeline",
        strength: "social",
      },
    ],
    weakeners: [
      "The thesis may be entirely narrative — no primary evidence gathered yet",
      "Position in the value chain unconfirmed; could be a trend-beneficiary with no control",
    ],
    nextChecks: [
      "Pull the latest 10-K/annual report: segment revenue and customer concentration",
      "Identify the exact value-chain layer and its supplier count",
      "Find one primary evidence point (filing, order, contract) before ranking it",
    ],
  };
}

export function runSerenityAnalysis(
  ticker: string,
  agg?: TickerAggregate,
): SerenityAnalysis {
  const known = KNOWLEDGE[ticker];
  const k = known ?? genericKnowledge(ticker, agg);

  // Mention momentum nudges catalyst timing (recent activity = nearer catalysts
  // to verify), capped so the curated judgment still dominates.
  const factors = { ...k.factors };
  if (agg && agg.count >= 3) {
    factors.catalyst_timing = Math.min(5, (factors.catalyst_timing ?? 0) + 0.5);
  }

  const sc = scoreCard(factors, k.penalties, k.factorNotes);

  return {
    ticker,
    companyName: k.name,
    generatedAt: new Date().toISOString(),
    mode: "simulated",
    whatItConstrains: k.whatItConstrains,
    chainPosition: k.chainPosition,
    chain: buildAiInfraChain(k.layer, k.scarceLayers),
    scarceLayers: k.scarceLayers,
    ...sc,
    marketMayMiss: k.marketMayMiss,
    evidence: k.evidence,
    weakeners: k.weakeners,
    nextChecks: k.nextChecks,
  };
}

export function isCurated(ticker: string): boolean {
  return ticker in KNOWLEDGE;
}
