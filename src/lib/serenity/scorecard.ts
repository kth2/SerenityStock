// Faithful TypeScript port of skill/scripts/serenity_scorecard.py —
// same weights, penalty multiplier, clamping, and verdict thresholds.

import type { FactorScore, PenaltyScore } from "@/types";

export const FACTOR_WEIGHTS: Record<string, number> = {
  demand_inflection: 15,
  architecture_coupling: 10,
  chokepoint_severity: 15,
  supplier_concentration: 12,
  expansion_difficulty: 12,
  evidence_quality: 15,
  valuation_disconnect: 11,
  catalyst_timing: 10,
};

export const PENALTY_MULTIPLIER = 2.0;

export const FACTOR_LABELS: Record<string, string> = {
  demand_inflection: "Demand inflection",
  architecture_coupling: "Architecture coupling",
  chokepoint_severity: "Chokepoint severity",
  supplier_concentration: "Supplier concentration",
  expansion_difficulty: "Expansion difficulty",
  evidence_quality: "Evidence quality",
  valuation_disconnect: "Valuation disconnect",
  catalyst_timing: "Catalyst timing",
};

export const PENALTY_LABELS: Record<string, string> = {
  dilution_financing: "Dilution / financing",
  governance: "Governance",
  geopolitics: "Geopolitics",
  liquidity: "Liquidity",
  hype_risk: "Hype risk",
  accounting_quality: "Accounting quality",
  cyclicality: "Cyclicality",
  alternative_design_risk: "Alternative design risk",
};

// Plain-language, one-line explanations of every scored term — shown in the UI
// so a non-expert can read the scorecard without knowing finance jargon.
export const FACTOR_PLAIN: Record<string, string> = {
  demand_inflection: "Is demand for what this company sells taking off right now?",
  architecture_coupling: "Is this company baked into how the product is built (hard to design out)?",
  chokepoint_severity: "Is this a genuine bottleneck — a step nothing can skip?",
  supplier_concentration: "Are there only a few companies that can do this? (fewer = stronger)",
  expansion_difficulty: "Is it hard for rivals to add capacity and catch up?",
  evidence_quality: "How solid is the proof — official filings vs. just talk?",
  valuation_disconnect: "Is the stock possibly cheaper than the story deserves?",
  catalyst_timing: "Is a near-term event likely to make the market re-notice it?",
};

export const PENALTY_PLAIN: Record<string, string> = {
  dilution_financing: "Might it print new shares or take on risky debt, hurting owners?",
  governance: "Any concerns about how management runs the company?",
  geopolitics: "Exposed to trade wars, sanctions, or country-specific risk?",
  liquidity: "Is the stock thinly traded / hard to get in and out of?",
  hype_risk: "Is it already a crowded, over-hyped story?",
  accounting_quality: "Any red flags in how it reports its numbers?",
  cyclicality: "Do its profits swing hard with the economic cycle?",
  alternative_design_risk: "Could a different technology make its product unnecessary?",
};

/** Plain-language reading of a 0-100 bottleneck score. */
export function scorePlain(score: number): string {
  if (score >= 85) return "Looks like a strong bottleneck worth researching first.";
  if (score >= 70) return "A high-priority name to dig into.";
  if (score >= 55) return "Interesting enough to keep on the watchlist.";
  return "Weak signal so far — treat it as an early lead, not a thesis.";
}

/**
 * Plain-language legend for the whole scorecard, shown once per analysis.
 */
export const SCORECARD_PLAIN_INTRO =
  "Each row is scored 0–5 for how strongly it applies. Green 'strength' rows " +
  "add to the score; red 'penalty' rows (risks) subtract. The final 0–100 " +
  "number is a research-priority signal — how much this deserves a closer " +
  "look — NOT a price target or a buy/sell call.";

export interface ScorecardResult {
  factors: FactorScore[];
  penalties: PenaltyScore[];
  rawFactorPoints: number;
  penaltyPoints: number;
  finalScore: number;
  verdict: string;
}

export function scoreCard(
  factorRatings: Record<string, number>,
  penaltyRatings: Record<string, number>,
  factorNotes: Record<string, string> = {},
): ScorecardResult {
  const factors: FactorScore[] = Object.entries(FACTOR_WEIGHTS).map(
    ([key, weight]) => {
      const rating = clamp05(factorRatings[key] ?? 0);
      const points = round2((rating / 5) * weight);
      return {
        key,
        label: FACTOR_LABELS[key],
        rating,
        weight,
        points,
        note: factorNotes[key] ?? "",
      };
    },
  );
  const rawFactorPoints = round2(factors.reduce((s, f) => s + f.points, 0));

  const penalties: PenaltyScore[] = Object.entries(penaltyRatings).map(
    ([key, value]) => {
      const rating = clamp05(value);
      return {
        key,
        label: PENALTY_LABELS[key] ?? key,
        rating,
        points: round2(rating * PENALTY_MULTIPLIER),
      };
    },
  );
  const penaltyPoints = round2(penalties.reduce((s, p) => s + p.points, 0));

  const finalScore = round2(
    Math.max(0, Math.min(100, rawFactorPoints - penaltyPoints)),
  );

  // Verdict thresholds match serenity_scorecard.py exactly.
  const verdict =
    finalScore >= 85
      ? "Top research priority"
      : finalScore >= 70
        ? "High research priority"
        : finalScore >= 55
          ? "Worth tracking"
          : "Early lead or low priority";

  return { factors, penalties, rawFactorPoints, penaltyPoints, finalScore, verdict };
}

function clamp05(n: number): number {
  return Math.max(0, Math.min(5, n));
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
