// MarketMind simulation engines.
//
// `SimulationEngine` is the seam that keeps the UI independent of HOW a report
// is produced. `LocalMarketMindEngine` runs everything in the browser using the
// user's own BYOK provider (Gemini by default) via the existing ai.ts transport.
// A future `MiroFishRemoteEngine` could implement the same interface without
// any UI change — see docs/MARKETMIND_IMPLEMENTATION.md §9.
//
// Robustness contract: a simulation NEVER throws because of a bad model
// response. Malformed JSON, rate limits, and network errors degrade to
// explicitly-flagged fallbacks so the user always gets a readable report.

import type { AnalysisResult, TickerAggregate } from "@/types";
import { analyzeQuery } from "@/lib/serenity/analyze";
import { aiConfigured, AiError, callJson, type AiConfig } from "@/lib/serenity/ai";
import { fetchLiveQuotes, formatQuotesForPrompt } from "@/lib/serenity/livedata";
import { parseQuery } from "@/lib/serenity/engine";
import { AGENTS } from "./agents";
import { aggregate, hasConverged, summaryToPrompt } from "./aggregate";
import { MAX_CALLS, SimulationCallBudget, TARGET_CALLS } from "./budget";
import { buildSeed, seedToPrompt } from "./seed";
import type {
  AgentPersona,
  AgentReaction,
  Horizon,
  MarketMindReport,
  MarketMindSynthesis,
  SimulationEngine,
  SimulationHooks,
  SimulationInput,
  SimulationPhase,
  Stance,
  StopReason,
} from "./types";

/* --------------------------------------------------------- validation ---- */

const STANCES: Stance[] = ["bullish", "bearish", "neutral"];
const HORIZONS: Horizon[] = ["intraday", "days", "weeks", "months"];

const asStr = (v: unknown, fallback = ""): string =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

const asStrList = (v: unknown, max = 4): string[] =>
  Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, max)
    : [];

function clamp05(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(5, Math.round(n))) : 0;
}

/** Coerce any model output into a valid reaction. Never throws. */
export function validateReaction(raw: unknown, agent: AgentPersona["id"]): AgentReaction {
  const o = (raw ?? {}) as Record<string, unknown>;
  const stanceRaw = asStr(o.stance).toLowerCase();
  const horizonRaw = asStr(o.horizon).toLowerCase();
  const rationale = asStr(o.rationale);
  const action = asStr(o.action);
  // A response with neither a rationale nor an action carries no signal.
  const empty = !rationale && !action;
  return {
    agent,
    stance: (STANCES as string[]).includes(stanceRaw) ? (stanceRaw as Stance) : "neutral",
    conviction: clamp05(o.conviction),
    horizon: (HORIZONS as string[]).includes(horizonRaw) ? (horizonRaw as Horizon) : "days",
    action: action || "No clear action.",
    triggers: asStrList(o.triggers),
    risks: asStrList(o.risks),
    rationale: rationale || "No usable response from the model for this participant.",
    ...(empty ? { degraded: true } : {}),
  };
}

function fallbackReaction(agent: AgentPersona["id"], why: string): AgentReaction {
  return {
    agent,
    stance: "neutral",
    conviction: 0,
    horizon: "days",
    action: "No action modelled.",
    triggers: [],
    risks: [],
    rationale: why,
    degraded: true,
  };
}

function validateSynthesis(raw: unknown): MarketMindSynthesis {
  const o = (raw ?? {}) as Record<string, unknown>;
  const scenario = (v: unknown) => {
    const s = (v ?? {}) as Record<string, unknown>;
    return {
      narrative: asStr(s.narrative, "Not established."),
      conditions: asStrList(s.conditions, 4),
    };
  };
  const cascade = (Array.isArray(o.cascade) ? o.cascade : [])
    .map((c, i) => {
      const s = (c ?? {}) as Record<string, unknown>;
      return {
        step: i + 1,
        actor: asStr(s.actor, "Participant"),
        effect: asStr(s.effect),
      };
    })
    .filter((c) => c.effect)
    .slice(0, 6);

  return {
    headline: asStr(o.headline, "Scenario synthesis unavailable."),
    cascade,
    bull: scenario(o.bull),
    base: scenario(o.base),
    bear: scenario(o.bear),
    keyRisks: asStrList(o.keyRisks, 5),
    watchItems: asStrList(o.watchItems, 5),
    reflexivity: asStr(o.reflexivity, "—"),
  };
}

function fallbackSynthesis(why: string): MarketMindSynthesis {
  return {
    headline: "Synthesis unavailable — showing the agent rounds only.",
    cascade: [],
    bull: { narrative: "Not generated.", conditions: [] },
    base: { narrative: why, conditions: [] },
    bear: { narrative: "Not generated.", conditions: [] },
    keyRisks: [],
    watchItems: [],
    reflexivity: "—",
    degraded: true,
  };
}

/* ------------------------------------------------------------ prompts ---- */

const AGENT_SCHEMA = JSON.stringify({
  stance: "bullish | bearish | neutral",
  conviction: "integer 0-5",
  horizon: "intraday | days | weeks | months",
  action: "one concrete action this participant would consider",
  triggers: ["2-3 things that would make them act"],
  risks: ["2-3 things that would make them wrong"],
  rationale: "2-3 sentences in this participant's voice",
});

const SYNTHESIS_SCHEMA = JSON.stringify({
  headline: "one sentence describing the overall scenario",
  cascade: [{ actor: "who moves", effect: "what that causes next" }],
  bull: { narrative: "string", conditions: ["what must hold"] },
  base: { narrative: "string", conditions: ["what must hold"] },
  bear: { narrative: "string", conditions: ["what must hold"] },
  keyRisks: ["3-5 risks that cut across participants"],
  watchItems: ["3-5 concrete, checkable things to watch next"],
  reflexivity: "where the crowd may be self-reinforcing, and what breaks it",
});

function langDirective(lang?: "en" | "zh"): string {
  return lang === "zh"
    ? "\n\nIMPORTANT: Write every human-readable string value in Simplified Chinese (简体中文). Keep JSON keys and enum values (stance/horizon) exactly as specified in English."
    : "";
}


/**
 * Turn a wave of agent failures into advice the user can act on. Free tiers
 * throttle hard, and "high demand" / rate-limit errors mean the model, not the
 * simulation, is the bottleneck.
 */
function providerHint(degradedCount: number, reactions: AgentReaction[]): string {
  if (degradedCount < 2) return "";
  const text = reactions
    .filter((r) => r.degraded)
    .map((r) => r.rationale)
    .join(" ")
    .toLowerCase();
  if (/rate limit|high demand|overload|quota|429|503|busy/.test(text)) {
    return (
      " Your provider is throttling or overloaded — the app already retried. " +
      "Wait a minute and re-run, or switch to a model with more free-tier headroom in AI settings."
    );
  }
  if (/output space|no json|malformed/.test(text)) {
    return " The model struggled to return valid JSON — a slightly larger model usually fixes this.";
  }
  return "";
}

/* ------------------------------------------------- local engine ---------- */

export interface LocalEngineDeps {
  config: AiConfig | null;
  /** Mention aggregates so the Serenity step can use tracked social context. */
  aggs?: Map<string, TickerAggregate>;
  /** Max agent calls in flight — keeps free-tier rate limits happy. */
  concurrency?: number;
}

export class LocalMarketMindEngine implements SimulationEngine {
  readonly id = "local";
  private deps: LocalEngineDeps;

  constructor(deps: LocalEngineDeps) {
    this.deps = deps;
  }

  isAvailable(): boolean {
    return aiConfigured(this.deps.config);
  }

  async run(input: SimulationInput, hooks: SimulationHooks = {}): Promise<MarketMindReport> {
    const { config, aggs = new Map(), concurrency = 2 } = this.deps;
    if (!aiConfigured(config)) {
      throw new AiError(
        "Connect an AI model first — MarketMind uses your configured provider (Gemini by default).",
      );
    }
    const { signal, onProgress } = hooks;
    const lang = input.lang ?? "en";
    const budget = new SimulationCallBudget(MAX_CALLS);
    const warnings: string[] = [];
    let stopped: StopReason = "complete";

    const report = (phase: SimulationPhase, label: string, percent: number) =>
      onProgress?.({ phase, label, percent, budget: budget.snapshot() });

    const abortIfNeeded = () => {
      if (signal?.aborted) {
        const e = new Error("Aborted");
        e.name = "AbortError";
        throw e;
      }
    };

    /* --- 1. Serenity Skill analysis (0 calls if curated, else 1+) --- */
    report("serenity", "Running the Serenity Skill analysis…", 5);
    const serenityOutcome = await analyzeQuery(
      input.query,
      aggs,
      config,
      signal,
      lang,
      budget.recorder("serenity"),
    );
    if (serenityOutcome.warning) warnings.push(serenityOutcome.warning);
    const serenity: AnalysisResult = serenityOutcome.result;
    abortIfNeeded();

    /* --- live price context (free, no LLM) --- */
    let priceContext: string | undefined;
    try {
      const parsed = parseQuery(input.query);
      if (parsed.tickers.length) {
        const quotes = await fetchLiveQuotes(parsed.tickers, signal);
        priceContext = formatQuotesForPrompt(quotes) || undefined;
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") throw err;
      /* live data is optional */
    }

    const seed = buildSeed(input.query, serenity, serenityOutcome.usedAi, priceContext);
    const seedBlock = seedToPrompt(seed);

    /* --- 2. Stage 1: six agents react independently --- */
    report("stage1", "Six market participants are reacting…", 20);
    const stage1 = await this.runAgents(
      config,
      budget,
      concurrency,
      signal,
      () =>
        [
          seedBlock,
          "",
          "TASK: React to this situation as your cohort would, right now.",
          "Return STRICT JSON with exactly these fields:",
          AGENT_SCHEMA,
        ].join("\n") + langDirective(lang),
      (done) => report("stage1", `Initial reactions… ${done}/6`, 20 + done * 6),
      "Stage 1",
    );
    abortIfNeeded();

    /* --- 3. Deterministic aggregation (0 calls) --- */
    report("aggregate1", "Aggregating round 1…", 58);
    const round1 = aggregate(stage1, 1);
    if (round1.degradedCount) {
      warnings.push(
        `${round1.degradedCount} participant(s) failed to respond in round 1.` +
          providerHint(round1.degradedCount, stage1),
      );
    }

    /* --- 4. Stage 2: react to the aggregate (skippable) --- */
    let stage2: AgentReaction[] | null = null;
    let round2 = null as ReturnType<typeof aggregate> | null;

    const converged = hasConverged(round1);
    const roomForStage2 = budget.canSpend(AGENTS.length + 1); // agents + synthesis
    if (converged) {
      stopped = "converged";
      warnings.push(
        "Participants converged strongly after round 1, so the second round was skipped to save calls.",
      );
    } else if (!roomForStage2) {
      stopped = "budget";
      warnings.push("Call budget reached — the second round was skipped.");
    } else {
      const round1Block = summaryToPrompt(round1, stage1);
      report("stage2", "Participants are reacting to each other…", 60);
      stage2 = await this.runAgents(
        config,
        budget,
        concurrency,
        signal,
        () =>
          [
            seedBlock,
            "",
            round1Block,
            "",
            "TASK: You now see how the rest of the market reacted. Update your own",
            "position: reinforce, fade, hedge, or stand aside — and say why the",
            "other participants' behaviour changes (or does not change) your view.",
            "Return STRICT JSON with exactly these fields:",
            AGENT_SCHEMA,
          ].join("\n") + langDirective(lang),
        (done) => report("stage2", `Secondary reactions… ${done}/6`, 60 + done * 5),
        "Stage 2",
      );
      abortIfNeeded();
      report("aggregate2", "Aggregating round 2…", 90);
      round2 = aggregate(stage2, 2);
      if (round2.degradedCount) {
        warnings.push(
          `${round2.degradedCount} participant(s) failed to respond in round 2.` +
            providerHint(round2.degradedCount, stage2),
        );
      }
    }

    /* --- 5. Final synthesis (1 call) --- */
    report("synthesis", "Writing the scenario report…", 93);
    let synthesis: MarketMindSynthesis;

    if (!budget.canSpend(1)) {
      stopped = "budget";
      synthesis = fallbackSynthesis(
        "The call budget was reached before the synthesis step; the agent rounds above are complete.",
      );
      warnings.push("Call budget reached — synthesis skipped.");
    } else {
      const synthUser =
        [
          seedBlock,
          "",
          summaryToPrompt(round1, stage1),
          ...(round2 && stage2 ? ["", summaryToPrompt(round2, stage2)] : []),
          "",
          "TASK: Synthesize the simulation into a scenario report. Describe how the",
          "reaction could cascade between participants, then give bull / base / bear",
          "cases with the conditions each depends on. This is a SCENARIO EXPLORATION,",
          "not a prediction: no price targets, no buy/sell advice. Ground every claim",
          "in the situation and the participant reactions above.",
          "Return STRICT JSON with exactly these fields:",
          SYNTHESIS_SCHEMA,
        ].join("\n") + langDirective(lang);

      try {
        const raw = await callJson(
          config,
          synthUser,
          {
            system:
              "You are a market scenario analyst synthesizing a multi-agent simulation. " +
              "You explain how different market participants interact and where their " +
              "behaviour becomes self-reinforcing. You never predict prices and never " +
              "give investment advice. Respond with STRICT JSON only.",
            temperature: 0.5,
            maxOutputTokens: 2600,
            onCall: budget.recorder("synthesis"),
            onRetry: budget.noteRetry,
          },
          signal,
        );
        synthesis = validateSynthesis(raw);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") throw err;
        const msg = err instanceof AiError ? err.message : "Synthesis call failed.";
        synthesis = fallbackSynthesis(msg);
        warnings.push(msg);
      }
    }

    report("done", "Done", 100);

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      query: input.query.trim(),
      createdAt: new Date().toISOString(),
      seed,
      serenity,
      stage1,
      round1,
      stage2,
      round2,
      synthesis,
      budget: budget.snapshot(),
      stoppedEarly: stopped,
      // Provider descriptor only — the API key is NEVER included.
      provider: { protocol: config.protocol, model: config.model },
      warnings,
    };
  }

  /** Run all six agents with bounded concurrency; failures degrade, never throw. */
  private async runAgents(
    config: AiConfig,
    budget: SimulationCallBudget,
    concurrency: number,
    signal: AbortSignal | undefined,
    buildUser: () => string,
    onDone: (done: number) => void,
    stageLabel: string,
  ): Promise<AgentReaction[]> {
    const results = new Array<AgentReaction>(AGENTS.length);
    let done = 0;
    let cursor = 0;

    const worker = async (slot: number) => {
      // Stagger worker starts so six agents do not hit a free-tier
      // per-minute limit in one burst.
      if (slot > 0) await new Promise((r) => setTimeout(r, slot * 400));
      for (;;) {
        const i = cursor++;
        if (i >= AGENTS.length) return;
        const agent = AGENTS[i];
        if (signal?.aborted) {
          results[i] = fallbackReaction(agent.id, "Simulation cancelled.");
          continue;
        }
        if (!budget.canSpend(1)) {
          results[i] = fallbackReaction(
            agent.id,
            `${stageLabel}: call budget reached before this participant ran.`,
          );
          continue;
        }
        try {
          const raw = await callJson(
            config,
            buildUser(),
            {
              system: agent.system,
              temperature: 0.7, // distinct voices
              // Generous enough that the JSON is never cut mid-object —
              // Chinese output in particular consumes tokens fast, and a
              // truncated response is unparseable.
              maxOutputTokens: 1400,
              onCall: budget.recorder("agent"),
              onRetry: budget.noteRetry,
            },
            signal,
          );
          results[i] = validateReaction(raw, agent.id);
        } catch (err) {
          if ((err as Error)?.name === "AbortError") {
            results[i] = fallbackReaction(agent.id, "Simulation cancelled.");
          } else {
            const msg = err instanceof AiError ? err.message : "Model call failed.";
            results[i] = fallbackReaction(agent.id, msg);
          }
        } finally {
          done += 1;
          onDone(done);
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.max(1, Math.min(concurrency, AGENTS.length)) }, (_, slot) =>
        worker(slot),
      ),
    );
    return results;
  }
}

export { TARGET_CALLS, MAX_CALLS };
