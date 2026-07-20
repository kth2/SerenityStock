// Async orchestration layer: routes a query to the deterministic curated
// engine (sync) or the user's configured AI model (async), per the skill's
// request router. Keeps engine.ts network-free and ai.ts engine-free.

import type {
  AnalysisResult,
  ComparisonAnalysis,
  SerenityAnalysis,
  TickerAggregate,
} from "@/types";
import {
  isCurated,
  parseQuery,
  runQuery,
  runSerenityAnalysis,
} from "./engine";
import { matchTheme } from "./themes";
import {
  aiAnalyzeTheme,
  aiAnalyzeTicker,
  aiConfigured,
  AiError,
  type AiConfig,
} from "./ai";

export interface AnalyzeOutcome {
  result: AnalysisResult;
  usedAi: boolean;
  /** Non-fatal note, e.g. AI failed and we fell back to the local engine. */
  warning?: string;
}

/**
 * Analyze a free-form query. When the target is outside the curated knowledge
 * base and an AI endpoint is configured, research it with that model; if the
 * AI call fails, fall back to the deterministic local result and surface a
 * warning rather than erroring out.
 */
export async function analyzeQuery(
  raw: string,
  aggs: Map<string, TickerAggregate>,
  config: AiConfig | null,
  signal?: AbortSignal,
): Promise<AnalyzeOutcome> {
  const parsed = parseQuery(raw);
  const useAi = aiConfigured(config);

  // --- single ticker ---
  if (parsed.kind === "ticker") {
    const t = parsed.tickers[0];
    if (isCurated(t)) {
      return { result: runSerenityAnalysis(t, aggs.get(t)), usedAi: false };
    }
    if (useAi) {
      try {
        return { result: await aiAnalyzeTicker(config!, t, aggs.get(t), signal), usedAi: true };
      } catch (err) {
        return aiFallback(err, () => runSerenityAnalysis(t, aggs.get(t)));
      }
    }
    return { result: runSerenityAnalysis(t, aggs.get(t)), usedAi: false };
  }

  // --- comparison ---
  if (parsed.kind === "comparison") {
    const parts = await Promise.all(
      parsed.tickers.map(async (t): Promise<{ a: SerenityAnalysis; ai: boolean; warn?: string }> => {
        if (isCurated(t) || !useAi) return { a: runSerenityAnalysis(t, aggs.get(t)), ai: false };
        try {
          return { a: await aiAnalyzeTicker(config!, t, aggs.get(t), signal), ai: true };
        } catch (err) {
          return {
            a: runSerenityAnalysis(t, aggs.get(t)),
            ai: false,
            warn: err instanceof AiError ? `$${t}: ${err.message}` : `$${t}: AI research failed`,
          };
        }
      }),
    );
    const result: ComparisonAnalysis = {
      kind: "comparison",
      query: parsed.tickers.join(", "),
      generatedAt: new Date().toISOString(),
      ranked: parts.map((p) => p.a).sort((a, b) => b.finalScore - a.finalScore),
    };
    const warnings = parts.map((p) => p.warn).filter(Boolean) as string[];
    return {
      result,
      usedAi: parts.some((p) => p.ai),
      warning: warnings.length ? warnings.join(" · ") : undefined,
    };
  }

  // --- theme ---
  const def = matchTheme(parsed.raw);
  if (def) return { result: runQuery(raw, aggs), usedAi: false }; // curated theme (sync)
  if (useAi) {
    try {
      return { result: await aiAnalyzeTheme(config!, parsed.raw, signal), usedAi: true };
    } catch (err) {
      return aiFallback(err, () => runQuery(raw, aggs));
    }
  }
  return { result: runQuery(raw, aggs), usedAi: false }; // generic scaffold
}

function aiFallback(err: unknown, fallback: () => AnalysisResult): AnalyzeOutcome {
  const msg = err instanceof AiError ? err.message : "AI research failed — showing the local result instead.";
  return { result: fallback(), usedAi: false, warning: msg };
}

/**
 * Would this query use the AI path if a model were configured? Used to nudge
 * the user toward AI setup when they land on a generic/uncatalogued result.
 */
export function wouldUseAi(raw: string): boolean {
  const parsed = parseQuery(raw);
  if (parsed.kind === "theme") return !matchTheme(parsed.raw);
  return parsed.tickers.some((t) => !isCurated(t));
}
