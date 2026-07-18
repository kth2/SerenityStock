#!/usr/bin/env node
// Optional deep-analysis step: runs the Serenity Skill through the Claude API
// for the top mentioned tickers and stores results in public/data/analyses.json.
//
// Requires ANTHROPIC_API_KEY. Without it this step is skipped (exit 0) and the
// frontend falls back to its built-in simulated Serenity engine — the app is
// fully functional either way.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MENTIONS_FILE = path.join(root, "public", "data", "mentions.json");
const OUT_FILE = path.join(root, "public", "data", "analyses.json");
const TOP_N = Number(process.env.ANALYZE_TOP_N ?? 5);

async function loadSkillPrompt() {
  // The full skill, plus the two references most relevant to a single-company
  // deep dive. This is the same material a Claude agent would load on demand.
  const parts = await Promise.all(
    [
      "skill/SKILL.md",
      "skill/references/evidence-ladder.md",
      "skill/references/deep-research-workflow.md",
    ].map((p) => readFile(path.join(root, p), "utf8")),
  );
  return [
    "You are an investment research agent running the Serenity Skill — a",
    "supply-chain bottleneck research methodology. Follow it exactly.",
    "",
    "=== SKILL.md ===",
    parts[0],
    "",
    "=== references/evidence-ladder.md ===",
    parts[1],
    "",
    "=== references/deep-research-workflow.md ===",
    parts[2],
    "",
    "Output format: respond in GitHub-flavored Markdown with these sections:",
    "## What it constrains, ## Value-chain position, ## Scarce-layer analysis,",
    "## Evidence (graded), ## What the market may be missing,",
    "## What could prove this wrong, ## Next verification steps,",
    "## Research priority (score /100 and verdict).",
    "You have no live tools in this run — clearly mark every claim that needs a",
    "source check as 'unverified lead' and give the exact source path to verify",
    "it. Research support only; no trade execution advice.",
  ].join("\n");
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(
      "ANTHROPIC_API_KEY not set — skipping API analysis (frontend will use the built-in simulated engine).",
    );
    return;
  }

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();

  const data = JSON.parse(await readFile(MENTIONS_FILE, "utf8"));
  const targets = data.tickers.slice(0, TOP_N);
  if (targets.length === 0) {
    console.log("No tickers to analyze.");
    return;
  }

  let existing = { analyses: {} };
  try {
    existing = JSON.parse(await readFile(OUT_FILE, "utf8"));
  } catch {
    /* first run */
  }

  const system = await loadSkillPrompt();
  const analyses = { ...existing.analyses };

  for (const t of targets) {
    const recentTexts = data.mentions
      .filter((m) => m.ticker === t.ticker)
      .slice(0, 10)
      .map((m) => `- [${m.createdAt}] ${m.text}`)
      .join("\n");

    console.log(`Analyzing $${t.ticker} (${t.count} mentions) ...`);
    const stream = client.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: [
            `Single-company challenge: $${t.ticker}.`,
            ``,
            `Context from tracked @${data.handle} mentions (lead generation only`,
            `per the evidence ladder — treat as social-tier signals):`,
            recentTexts || "(no recent mention texts)",
            ``,
            `Mention stats: ${t.count} mentions, avg sentiment ${t.avgSentiment}`,
            `(${t.sentimentLabel}), first seen ${t.firstSeen}, last ${t.lastSeen}.`,
            ``,
            `Run the Serenity workflow for this company and produce the`,
            `structured output described in the system prompt.`,
          ].join("\n"),
        },
      ],
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      console.warn(`  refused — skipping $${t.ticker}`);
      continue;
    }
    const markdown = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    analyses[t.ticker] = {
      ticker: t.ticker,
      generatedAt: new Date().toISOString(),
      engine: "claude-api",
      model: message.model,
      markdown,
    };
  }

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(
    OUT_FILE,
    JSON.stringify({ updatedAt: new Date().toISOString(), analyses }, null, 2),
  );
  console.log(`Wrote ${Object.keys(analyses).length} analyses to analyses.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
