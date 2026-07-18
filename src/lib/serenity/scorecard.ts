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
