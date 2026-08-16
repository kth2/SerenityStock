// Centralized LLM call budget for a MarketMind simulation.
//
// Every LLM request in a simulation is recorded here, so the UI can show an
// honest "8 / 15" counter and the engine can stop gracefully before running up
// a user's free-tier quota. Counts are OBSERVED (ai.ts fires an onCall hook per
// HTTP request), not estimated — a comparison query that internally researches
// three tickers really is counted as three calls.

import type { CallBudgetSnapshot } from "./types";

export type CallKind = "serenity" | "agent" | "synthesis";

/** Target for a normal run; the UI shows progress against this. */
export const TARGET_CALLS = 15;
/** Hard ceiling — the simulation stops gracefully rather than exceed it. */
export const MAX_CALLS = 25;

export class SimulationCallBudget {
  serenityCalls = 0;
  agentCalls = 0;
  synthesisCalls = 0;
  /** Transient failures retried inside the transport (throttling/overload). */
  retries = 0;
  readonly maximumCalls: number;

  constructor(maximumCalls: number = MAX_CALLS) {
    this.maximumCalls = maximumCalls;
  }

  get totalCalls(): number {
    return this.serenityCalls + this.agentCalls + this.synthesisCalls;
  }

  get remaining(): number {
    return Math.max(0, this.maximumCalls - this.totalCalls);
  }

  /** Is there room for `n` more calls? */
  canSpend(n = 1): boolean {
    return this.totalCalls + n <= this.maximumCalls;
  }

  /** Record `n` calls of a kind. Returns false if the budget is exhausted. */
  spend(kind: CallKind, n = 1): boolean {
    if (!this.canSpend(n)) return false;
    if (kind === "serenity") this.serenityCalls += n;
    else if (kind === "agent") this.agentCalls += n;
    else this.synthesisCalls += n;
    return true;
  }

  /** A counter callback to hand to ai.ts / analyzeQuery for a given kind. */
  recorder(kind: CallKind): () => void {
    return () => {
      // Record unconditionally: the call already went out, so the snapshot must
      // reflect reality even if it pushes us to the ceiling. Admission control
      // happens up-front via canSpend().
      if (kind === "serenity") this.serenityCalls += 1;
      else if (kind === "agent") this.agentCalls += 1;
      else this.synthesisCalls += 1;
    };
  }

  /** Callback for ai.ts to report a transient retry. */
  noteRetry = () => {
    this.retries += 1;
  };

  snapshot(): CallBudgetSnapshot {
    return {
      retries: this.retries,
      serenityCalls: this.serenityCalls,
      agentCalls: this.agentCalls,
      synthesisCalls: this.synthesisCalls,
      totalCalls: this.totalCalls,
      maximumCalls: this.maximumCalls,
    };
  }
}
