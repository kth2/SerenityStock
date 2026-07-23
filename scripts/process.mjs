#!/usr/bin/env node
// Processes public/data/tweets.json into public/data/mentions.json:
// per-mention records with sentiment, per-ticker aggregates with history,
// and a daily digest for the dashboard.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { extractTickers, scoreSentiment, dayKey } from "./lib/text.mjs";
import { serenitySignalScore, signalBandKey } from "./lib/signal.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TWEETS_FILE = path.join(root, "public", "data", "tweets.json");
const OUT_FILE = path.join(root, "public", "data", "mentions.json");

async function main() {
  const raw = JSON.parse(await readFile(TWEETS_FILE, "utf8"));
  const tweets = raw.tweets ?? [];
  const isSample = raw.source === "seed";

  const mentions = [];
  for (const tweet of tweets) {
    const tickers = extractTickers(tweet.text);
    if (tickers.length === 0) continue;
    const sentiment = scoreSentiment(tweet.text);
    for (const ticker of tickers) {
      mentions.push({
        tweetId: tweet.id,
        ticker,
        text: tweet.text,
        createdAt: tweet.createdAt,
        url: tweet.url,
        stats: tweet.stats,
        sentiment,
      });
    }
  }
  mentions.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  // Per-ticker aggregates
  const byTicker = new Map();
  for (const m of mentions) {
    if (!byTicker.has(m.ticker)) byTicker.set(m.ticker, []);
    byTicker.get(m.ticker).push(m);
  }

  const tickers = [...byTicker.entries()]
    .map(([ticker, list]) => {
      const sorted = [...list].sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
      const byDay = new Map();
      for (const m of sorted) {
        const d = dayKey(m.createdAt);
        if (!byDay.has(d)) byDay.set(d, { count: 0, scoreSum: 0 });
        const e = byDay.get(d);
        e.count++;
        e.scoreSum += m.sentiment.score;
      }
      const history = [...byDay.entries()].map(([date, e]) => ({
        date,
        count: e.count,
        avgSentiment: Number((e.scoreSum / e.count).toFixed(3)),
      }));
      const avgSentiment =
        list.reduce((s, m) => s + m.sentiment.score, 0) / list.length;
      const engagement = list.reduce(
        (s, m) => s + (m.stats?.likes ?? 0) + (m.stats?.reposts ?? 0) * 2,
        0,
      );
      // Deterministic social-signal score (haskaomni port), computed from the
      // mention feed alone — no LLM. Complements the bottleneck scorecard.
      const signal = serenitySignalScore(list);
      return {
        ticker,
        count: list.length,
        firstSeen: sorted[0].createdAt,
        lastSeen: sorted[sorted.length - 1].createdAt,
        avgSentiment: Number(avgSentiment.toFixed(3)),
        sentimentLabel:
          avgSentiment > 0.15 ? "bullish" : avgSentiment < -0.15 ? "bearish" : "neutral",
        engagement,
        signalScore: signal.score,
        signalBand: signalBandKey(signal.score),
        signalComponents: signal.components,
        history,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Daily digest: last day with data, plus top/new tickers over trailing 7 days
  const days = [...new Set(mentions.map((m) => dayKey(m.createdAt)))].sort();
  const lastDay = days[days.length - 1] ?? null;
  const weekAgo = lastDay
    ? new Date(new Date(lastDay).getTime() - 6 * 864e5).toISOString().slice(0, 10)
    : null;
  const recent = mentions.filter((m) => weekAgo && dayKey(m.createdAt) >= weekAgo);
  const recentCounts = new Map();
  for (const m of recent) {
    recentCounts.set(m.ticker, (recentCounts.get(m.ticker) ?? 0) + 1);
  }
  const digest = {
    date: lastDay,
    window: { from: weekAgo, to: lastDay },
    totalMentions: recent.length,
    topTickers: [...recentCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ticker, count]) => ({ ticker, count })),
    newTickers: tickers
      .filter((t) => weekAgo && dayKey(t.firstSeen) >= weekAgo)
      .map((t) => t.ticker),
  };

  const output = {
    updatedAt: new Date().toISOString(),
    isSample,
    handle: raw.handle ?? "aleabitoreddit",
    totalTweets: tweets.length,
    totalMentions: mentions.length,
    mentions,
    tickers,
    digest,
  };

  // Avoid timestamp-only churn: if nothing but updatedAt changed, keep the old
  // timestamp so the CI commit step sees no diff and skips the daily no-op
  // commit (and the Pages rebuild it would trigger).
  try {
    const existing = JSON.parse(await readFile(OUT_FILE, "utf8"));
    const stable = (o) => JSON.stringify({ ...o, updatedAt: null });
    if (stable(existing) === stable(output)) {
      output.updatedAt = existing.updatedAt;
      console.log("No content changes — keeping previous updatedAt.");
    }
  } catch {
    /* first run */
  }

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(output, null, 2));
  console.log(
    `Processed ${tweets.length} tweets → ${mentions.length} mentions across ${tickers.length} tickers.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
