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
  type AiRunOptions,
} from "./ai";
import { fetchLiveQuotes, formatQuotesForPrompt } from "./livedata";

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
  lang: "en" | "zh" = "en",
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
        const opts = await buildRunOptions([t], lang, signal);
        return { result: await aiAnalyzeTicker(config!, t, aggs.get(t), signal, opts), usedAi: true };
      } catch (err) {
        return aiFallback(err, () => runSerenityAnalysis(t, aggs.get(t)));
      }
    }
    return { result: runSerenityAnalysis(t, aggs.get(t)), usedAi: false };
  }

  // --- comparison ---
  if (parsed.kind === "comparison") {
    // One shared live-price fetch for all names in the comparison.
    const opts = useAi ? await buildRunOptions(parsed.tickers, lang, signal) : undefined;
    const parts = await Promise.all(
      parsed.tickers.map(async (t): Promise<{ a: SerenityAnalysis; ai: boolean; warn?: string }> => {
        if (isCurated(t) || !useAi) return { a: runSerenityAnalysis(t, aggs.get(t)), ai: false };
        try {
          return { a: await aiAnalyzeTicker(config!, t, aggs.get(t), signal, opts), ai: true };
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
      // Theme scans have no ticker list up front, so only the language
      // directive applies here (no live-price context).
      const opts: AiRunOptions = { lang };
      return { result: await aiAnalyzeTheme(config!, parsed.raw, signal, opts), usedAi: true };
    } catch (err) {
      return aiFallback(err, () => runQuery(raw, aggs));
    }
  }
  return { result: runQuery(raw, aggs), usedAi: false }; // generic scaffold
}

/**
 * Assemble per-run AI options: the output language plus a best-effort
 * live-price context block. Live-price fetching never throws (except on
 * abort) — if it yields nothing, only the language directive is passed.
 */
async function buildRunOptions(
  tickers: string[],
  lang: "en" | "zh",
  signal?: AbortSignal,
): Promise<AiRunOptions> {
  let live = "";
  try {
    const quotes = await fetchLiveQuotes(tickers, signal);
    live = formatQuotesForPrompt(quotes);
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    /* live data is optional — ignore any failure */
  }
  return { lang, live: live || undefined };
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
