// Simulated Serenity Skill engine.
//
// Runs the skill's research workflow (SKILL.md steps 1-9) against the curated
// knowledge base plus the live mention statistics, and scores the result with
// the exact bottleneck-scorecard math from skill/scripts/serenity_scorecard.py.
//
// In a deployment with a backend, this same shape would be produced by Claude
// running the skill via scripts/analyze.mjs; the UI treats both identically.

import type {
  AnalysisResult,
  ComparisonAnalysis,
  SerenityAnalysis,
  ThemeAnalysis,
  TickerAggregate,
} from "@/types";
import { KNOWLEDGE, buildAiInfraChain, type TickerKnowledge } from "./knowledge";
import { scoreCard } from "./scorecard";
import { matchTheme, type ThemeDef } from "./themes";

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

/* ------------------------------------------------------------------------- */
/* Free-form query handling (Analyze tab)                                    */
/* ------------------------------------------------------------------------- */

export interface ParsedQuery {
  kind: "ticker" | "comparison" | "theme";
  tickers: string[];
  raw: string;
}

const TICKER_TOKEN = /^\$?[A-Za-z]{1,5}$/;

/**
 * Classify a query per the skill's request router:
 * one ticker → single-company challenge; several → candidate comparison;
 * anything else → theme scan.
 */
export function parseQuery(raw: string): ParsedQuery {
  const trimmed = raw.trim();
  const tokens = trimmed.split(/[,\s]+/).filter(Boolean);
  const allTickerShaped =
    tokens.length > 0 && tokens.every((t) => TICKER_TOKEN.test(t));
  if (allTickerShaped) {
    // Reject prose that happens to be short lowercase words ("ai power"):
    // a token counts as a ticker when it's $-prefixed, written in caps, or a
    // known symbol from the knowledge base.
    const looksLikeTickers = tokens.every(
      (t) =>
        t.startsWith("$") ||
        t === t.toUpperCase() ||
        t.toUpperCase() in KNOWLEDGE,
    );
    if (looksLikeTickers) {
      const unique = [
        ...new Set(tokens.map((t) => t.replace(/^\$/, "").toUpperCase())),
      ];
      return {
        kind: unique.length === 1 ? "ticker" : "comparison",
        tickers: unique,
        raw: trimmed,
      };
    }
  }
  return { kind: "theme", tickers: [], raw: trimmed };
}

export function runComparison(
  tickers: string[],
  aggs: Map<string, TickerAggregate>,
): ComparisonAnalysis {
  const ranked = tickers
    .map((t) => runSerenityAnalysis(t, aggs.get(t)))
    .sort((a, b) => b.finalScore - a.finalScore);
  return {
    kind: "comparison",
    query: tickers.join(", "),
    generatedAt: new Date().toISOString(),
    ranked,
  };
}

function themeFromDef(
  def: ThemeDef,
  query: string,
  aggs: Map<string, TickerAggregate>,
): ThemeAnalysis {
  const priorities = def.candidates
    .map((c) => {
      const a = runSerenityAnalysis(c.ticker, aggs.get(c.ticker));
      return {
        ticker: c.ticker,
        name: a.companyName,
        role: c.role,
        whyRanked: c.whyRanked,
        score: a.finalScore,
        verdict: a.verdict,
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    kind: "theme",
    query,
    title: def.title,
    generatedAt: new Date().toISOString(),
    isInitialPass: true,
    systemChange: def.systemChange,
    layers: [...def.layers].sort((a, b) => b.scarcity - a.scarcity),
    priorities,
    popularButLower: def.popularButLower,
    evidencePaths: def.evidencePaths,
    risks: def.risks,
    nextChecks: def.nextChecks,
  };
}

/** Honest scaffold for themes outside the curated set. */
function genericTheme(query: string): ThemeAnalysis {
  return {
    kind: "theme",
    query,
    title: `Theme scan: ${query}`,
    generatedAt: new Date().toISOString(),
    isInitialPass: true,
    systemChange:
      "This theme is outside the app's curated coverage, so no ranked judgment is offered — per the skill, an unranked answer beats an invented one. The workflow below is what a full run (with live sources) would execute.",
    layers: [
      { name: "1. Translate the story into a system change", rationale: "What technical/economic change drives demand, and which physical constraint binds (power, bandwidth, yield, purity, cycle time…)?", scarcity: 0 },
      { name: "2. Map the value chain", rationale: "Demand → integrators → modules → chips → process/packaging → equipment → materials → infrastructure", scarcity: 0 },
      { name: "3. Find the scarce layer", rationale: "Low supplier count, long qualification, hard expansion, critical know-how, long lead times", scarcity: 0 },
      { name: "4. Build a 20+ company universe, then filter to 3-7", rationale: "Classify each: controls / supplies / benefits / weak control / story", scarcity: 0 },
    ],
    priorities: [],
    popularButLower: [
      { name: "Whatever the theme's most-mentioned stock is", why: "Popularity concentrates in the visible layer, which is rarely the scarce one — rank layers first" },
    ],
    evidencePaths: [
      "Primary first: filings, exchange documents, transcripts, orders, patents, project filings",
      "Reputable trade press as support; social posts as lead generation only",
    ],
    risks: [
      "Narrative without a scarce layer — the most common failure mode",
      "Valuation already pricing the story before evidence exists",
    ],
    nextChecks: [
      "Answer 'what exactly does each candidate constrain?' in one sentence",
      "Find two concrete evidence points per candidate, at least one primary",
      "State what would prove the idea wrong before sizing anything",
    ],
    note: "Add this theme to src/lib/serenity/themes.ts (or run the Claude-API analyzer) for a scored scan.",
  };
}

/** Entry point for the Analyze tab. */
export function runQuery(
  raw: string,
  aggs: Map<string, TickerAggregate>,
): AnalysisResult {
  const parsed = parseQuery(raw);
  if (parsed.kind === "ticker") {
    return runSerenityAnalysis(parsed.tickers[0], aggs.get(parsed.tickers[0]));
  }
  if (parsed.kind === "comparison") {
    return runComparison(parsed.tickers, aggs);
  }
  const def = matchTheme(parsed.raw);
  return def ? themeFromDef(def, parsed.raw, aggs) : genericTheme(parsed.raw);
}
