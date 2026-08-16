// MarketMind Simulator — shared types.
//
// SerenityStock answers "what is happening?"; MarketMind answers "given what is
// happening, how might different market participants react?". Everything here
// describes a SCENARIO simulation — plausible reactions with explicit triggers
// and falsifiers — never a price prediction.

import type { AnalysisResult } from "@/types";

/* ------------------------------------------------------------- agents ---- */

export type AgentId =
  | "retail"
  | "momentum"
  | "value"
  | "short"
  | "institution"
  | "options";

export type Stance = "bullish" | "bearish" | "neutral";
export type Horizon = "intraday" | "days" | "weeks" | "months";

export interface AgentPersona {
  id: AgentId;
  /** Short display name, e.g. "Retail Investors". */
  name: string;
  /** One-line description shown in the UI. */
  blurb: string;
  /** System prompt describing how this participant thinks. */
  system: string;
}

/** One agent's validated response for one stage. */
export interface AgentReaction {
  agent: AgentId;
  stance: Stance;
  /** 0-5; how strongly this participant would act. */
  conviction: number;
  horizon: Horizon;
  /** One concrete action this participant would consider. */
  action: string;
  /** What would make them act. */
  triggers: string[];
  /** What would make them wrong. */
  risks: string[];
  rationale: string;
  /**
   * True when the model failed or returned unusable JSON and this is a
   * neutral placeholder. Surfaced in the UI so a degraded run is never
   * mistaken for a real opinion.
   */
  degraded?: boolean;
}

/* -------------------------------------------------------- aggregation ---- */

/** Deterministic, LLM-free summary of one round of reactions. */
export interface RoundSummary {
  stage: 1 | 2;
  /** Count of agents per stance. */
  stanceCounts: Record<Stance, number>;
  /** Net directional lean, -1 (all bearish) … +1 (all bullish), conviction-weighted. */
  netBias: number;
  /** 0-1; how much the agents agree (1 = unanimous). */
  consensus: number;
  /** Mean conviction across agents, 0-5. */
  avgConviction: number;
  dominantHorizon: Horizon;
  /** Most-cited triggers and risks across agents. */
  topTriggers: string[];
  topRisks: string[];
  /** Human-readable one-liner, built deterministically (no LLM). */
  headline: string;
  /** How many reactions were degraded fallbacks. */
  degradedCount: number;
}

/* ---------------------------------------------------------- simulation --- */

/** The compact, Serenity-grounded brief every agent reasons about. */
export interface SimulationSeed {
  /** What was simulated — a ticker, a list, or a theme. */
  subject: string;
  kind: "ticker" | "comparison" | "theme";
  /** One-line situation statement drawn from the Serenity analysis. */
  situation: string;
  /** Bottleneck score + verdict from scorecard.ts (read-only to MarketMind). */
  bottleneckScore?: number;
  verdict?: string;
  scarceLayers: string[];
  /** Strongest evidence items, already graded by the evidence ladder. */
  evidence: string[];
  /** Serenity's weakeners — the seeds of the bear case. */
  weakeners: string[];
  /** Outstanding verification steps. */
  openQuestions: string[];
  /** Indicative live price context, if it was available. */
  priceContext?: string;
  /** True when the Serenity step used the AI path. */
  serenityUsedAi: boolean;
}

export interface ScenarioCase {
  narrative: string;
  /** Conditions that would have to hold for this case. */
  conditions: string[];
}

export interface CascadeStep {
  step: number;
  actor: string;
  effect: string;
}

/** Final LLM synthesis, validated. */
export interface MarketMindSynthesis {
  headline: string;
  cascade: CascadeStep[];
  bull: ScenarioCase;
  base: ScenarioCase;
  bear: ScenarioCase;
  keyRisks: string[];
  watchItems: string[];
  /** Where the crowd may be self-reinforcing (reflexivity). */
  reflexivity: string;
  degraded?: boolean;
}

export type StopReason = "complete" | "converged" | "budget" | "aborted" | "error";

export interface CallBudgetSnapshot {
  /** Transient provider failures that were retried (not billed as new steps). */
  retries: number;
  serenityCalls: number;
  agentCalls: number;
  synthesisCalls: number;
  totalCalls: number;
  maximumCalls: number;
}

export interface MarketMindReport {
  id: string;
  query: string;
  createdAt: string;
  seed: SimulationSeed;
  /** The underlying Serenity result, kept so the report can show its summary. */
  serenity: AnalysisResult;
  stage1: AgentReaction[];
  round1: RoundSummary;
  stage2: AgentReaction[] | null;
  round2: RoundSummary | null;
  synthesis: MarketMindSynthesis;
  budget: CallBudgetSnapshot;
  stoppedEarly: StopReason;
  /** Provider descriptor — protocol + model ONLY. Never an API key. */
  provider: { protocol: string; model: string };
  /** Non-fatal notes (degraded agents, budget stop, Serenity warning…). */
  warnings: string[];
}

/* ------------------------------------------------------------- engine ---- */

export type SimulationPhase =
  | "idle"
  | "serenity"
  | "stage1"
  | "aggregate1"
  | "stage2"
  | "aggregate2"
  | "synthesis"
  | "done";

export interface SimulationProgress {
  phase: SimulationPhase;
  /** Human-readable status line. */
  label: string;
  budget: CallBudgetSnapshot;
  /** 0-100, for the progress bar. */
  percent: number;
}

export interface SimulationHooks {
  onProgress?: (p: SimulationProgress) => void;
  signal?: AbortSignal;
}

export interface SimulationInput {
  query: string;
  lang?: "en" | "zh";
}

/**
 * Pluggable simulation backend. `LocalMarketMindEngine` runs entirely in the
 * browser; a future `MiroFishRemoteEngine` could implement the same interface
 * without any UI change (see docs/MARKETMIND_IMPLEMENTATION.md §9).
 */
export interface SimulationEngine {
  readonly id: string;
  isAvailable(): boolean;
  run(input: SimulationInput, hooks?: SimulationHooks): Promise<MarketMindReport>;
}

/** History entry persisted to localStorage. */
export interface StoredSimulation {
  id: string;
  query: string;
  createdAt: string;
  report: MarketMindReport;
}
