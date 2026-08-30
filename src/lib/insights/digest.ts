// Optional AI narrative for a period digest — exactly ONE LLM call.
//
// The deterministic layer (themes.mjs → periods, priorities.ts → quadrants)
// already establishes WHAT changed. This call only writes the interpretation:
// what the shift implies about the scarce layer, which names deserve work
// first, and what would prove the read wrong.
//
// Framing is fixed and non-negotiable: research priorities and verification
// steps, never buy/sell calls. Mention counts are evidence-ladder tier 4
// (social = lead generation), and the prompt says so explicitly so the model
// cannot dress popularity up as conviction.

import { callJson, AiError, type AiConfig } from "@/lib/serenity/ai";
import type { PeriodDigest } from "@/types";
import type { PriorityBoard } from "./priorities";

export interface PeriodInsight {
  headline: string;
  attentionShift: string;
  impliedScarceLayer: string;
  researchPriorities: { ticker: string; why: string; nextCheck: string }[];
  crowdedWarnings: string[];
  contrarian: string;
  falsifiers: string[];
  generatedAt: string;
  model: string;
  degraded?: boolean;
}

const asStr = (v: unknown, fb = ""): string =>
  typeof v === "string" && v.trim() ? v.trim() : fb;

const asStrList = (v: unknown, max = 5): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, max)
    : [];

function validate(raw: unknown, model: string): PeriodInsight {
  const o = (raw ?? {}) as Record<string, unknown>;
  const priorities = (Array.isArray(o.researchPriorities) ? o.researchPriorities : [])
    .map((p) => {
      const r = (p ?? {}) as Record<string, unknown>;
      return {
        ticker: asStr(r.ticker).replace(/^\$/, "").toUpperCase(),
        why: asStr(r.why),
        nextCheck: asStr(r.nextCheck),
      };
    })
    .filter((p) => p.ticker && p.why)
    .slice(0, 5);

  return {
    headline: asStr(o.headline, "No usable summary was returned."),
    attentionShift: asStr(o.attentionShift, "—"),
    impliedScarceLayer: asStr(o.impliedScarceLayer, "—"),
    researchPriorities: priorities,
    crowdedWarnings: asStrList(o.crowdedWarnings, 4),
    contrarian: asStr(o.contrarian, "—"),
    falsifiers: asStrList(o.falsifiers, 4),
    generatedAt: new Date().toISOString(),
    model,
  };
}

/** Compact, token-cheap rendering of the deterministic facts. */
function factsBlock(period: PeriodDigest, board: PriorityBoard, label: string): string {
  const themes = period.themes
    .slice(0, 6)
    .map(
      (t) =>
        `${t.title}: ${t.posts} posts (${Math.round(t.share * 100)}% share, ` +
        `${t.deltaShare >= 0 ? "+" : ""}${Math.round(t.deltaShare * 100)}pp vs prior, ${t.trend})`,
    )
    .join("; ");
  const row = (r: { ticker: string; periodMentions: number; signalScore: number; bottleneckScore: number }) =>
    `$${r.ticker} (${r.periodMentions} mentions, attention ${r.signalScore}, bottleneck ${r.bottleneckScore})`;
  return [
    `PERIOD: ${label} ${period.key} (${period.from} → ${period.to})`,
    `SAMPLE: ${period.posts} posts, ${period.mentions} ticker mentions, ${period.unclassified} posts matched no theme.` +
      (period.thin ? " NOTE: this sample is very small — say so and avoid strong claims." : ""),
    `THEME SHARES: ${themes || "none"}`,
    `SCORES WELL AND DISCUSSED: ${board.priority.map(row).join("; ") || "none"}`,
    `DISCUSSED BUT WEAK BOTTLENECK SCORE: ${board.crowded.map(row).join("; ") || "none"}`,
    `SCORES WELL BUT LITTLE DISCUSSED: ${board.quiet.map(row).join("; ") || "none"}`,
    `MENTIONED BUT NOT YET RESEARCHED (no verified score): ${
      board.needsResearch.map((r) => `$${r.ticker}`).join(", ") || "none"
    }`,
    `NEW THIS PERIOD: ${period.newTickers.map((t) => `$${t}`).join(", ") || "none"}`,
  ].join("\n");
}

// Deliberately small. Every field is bounded and the prose limits are explicit,
// because an over-long ask is what made models run out of output space and
// truncate the JSON mid-object (Chinese output consumes tokens fastest).
const SCHEMA = JSON.stringify({
  headline: "ONE short sentence: what this period was about",
  attentionShift: "1-2 sentences: what moved vs the previous period, and how much could be noise at this sample size",
  impliedScarceLayer: "1 sentence: which layer the attention implies is tight, and whether the evidence supports it",
  researchPriorities: [
    { ticker: "SYMBOL", why: "one short sentence", nextCheck: "one short, checkable step" },
  ],
  crowdedWarnings: ["one short sentence each"],
  contrarian: "1 sentence: what is under-discussed relative to its score",
  falsifiers: ["one short sentence each"],
});

/** Even smaller ask, used to retry once if the full one was cut off. */
const COMPACT_SCHEMA = JSON.stringify({
  headline: "ONE short sentence",
  attentionShift: "1 sentence",
  impliedScarceLayer: "1 sentence",
  researchPriorities: [{ ticker: "SYMBOL", why: "one short sentence", nextCheck: "one short step" }],
  falsifiers: ["one short sentence"],
});

const LIMITS = [
  "",
  "LENGTH LIMITS — keep the whole JSON short or it will be cut off:",
  "- at most 3 researchPriorities, 2 crowdedWarnings, 2 falsifiers",
  "- no field longer than about 30 words",
].join("\n");

const SYSTEM = [
  "You summarize a period of tracked supply-chain research posts into RESEARCH",
  "PRIORITIES for one person's own reading list.",
  "",
  "Hard rules:",
  "- This is NOT investment advice. Never say buy, sell, hold, accumulate, or",
  "  give price targets, allocations, or position sizes.",
  "- Mention counts are a SOCIAL-tier signal (evidence ladder tier 4): they",
  "  indicate what is being talked about, never that a thesis is proven.",
  "- Attention concentrates in the visible layer, which is rarely the scarce",
  "  one. Treat heavy discussion as a reason to CHECK a name, not to favour it.",
  "- The sample is small (tens of posts). Be explicit about that uncertainty",
  "  instead of writing confident conclusions the data cannot support.",
  "- Use only the facts provided. Do not invent tickers, filings, or numbers.",
  "- Respond with STRICT JSON only. No markdown fences.",
].join("\n");

export async function generatePeriodInsight(
  config: AiConfig,
  period: PeriodDigest,
  board: PriorityBoard,
  label: string,
  opts: { lang?: "en" | "zh"; signal?: AbortSignal; onCall?: () => void; onRetry?: () => void } = {},
): Promise<PeriodInsight> {
  const facts = factsBlock(period, board, label);
  const langNote =
    opts.lang === "zh"
      ? "\n\nIMPORTANT: Write every human-readable string value in Simplified Chinese (简体中文). Keep JSON keys and ticker symbols unchanged. Be concise — Chinese uses tokens quickly."
      : "";
  const build = (schema: string) =>
    [
      facts,
      "",
      "TASK: Turn the facts above into a research digest. Return STRICT JSON with exactly these fields:",
      schema,
      LIMITS,
    ].join("\n") + langNote;

  const ask = (schema: string, maxOutputTokens: number) =>
    callJson(
      config,
      build(schema),
      {
        system: SYSTEM,
        temperature: 0.4,
        maxOutputTokens,
        onCall: opts.onCall,
        onRetry: opts.onRetry,
      },
      opts.signal,
    );

  try {
    let raw: unknown;
    try {
      raw = await ask(SCHEMA, 4000);
    } catch (err) {
      // Ran out of output space even after salvage? Retry once with a much
      // smaller ask — a shorter digest beats no digest.
      if ((err as Error)?.name === "AbortError") throw err;
      if (!/output space/i.test((err as Error)?.message ?? "")) throw err;
      raw = await ask(COMPACT_SCHEMA, 4000);
    }
    return validate(raw, config.model);
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    const msg = err instanceof AiError ? err.message : "The digest call failed.";
    return {
      headline: "Digest unavailable — the deterministic figures above are unaffected.",
      attentionShift: msg,
      impliedScarceLayer: "—",
      researchPriorities: [],
      crowdedWarnings: [],
      contrarian: "—",
      falsifiers: [],
      generatedAt: new Date().toISOString(),
      model: config.model,
      degraded: true,
    };
  }
}
