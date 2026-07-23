#!/usr/bin/env node
// Fetches indicative price quotes for the tracked tickers and writes
// public/data/quotes.json. Runs in CI (open egress → no browser CORS limits),
// so the dashboard can show a price chip reliably without every visitor's
// browser hitting a finance API. Best-effort: any ticker that fails is skipped,
// and if nothing at all comes back the existing file is left untouched.
//
// Source: Yahoo Finance v8 chart endpoint (keyless), Stooq CSV as a fallback.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MENTIONS_FILE = path.join(root, "public", "data", "mentions.json");
const OUT_FILE = path.join(root, "public", "data", "quotes.json");

const MAX_TICKERS = Number(process.env.MAX_QUOTE_TICKERS ?? 80);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function fromYahoo(ticker) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?interval=1d&range=1d`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (typeof price !== "number" || !Number.isFinite(price)) return null;
  const prev = meta?.chartPreviousClose ?? meta?.previousClose;
  const changePct = typeof prev === "number" && prev > 0 ? ((price - prev) / prev) * 100 : null;
  return {
    price: Number(price.toFixed(2)),
    changePct: changePct == null ? null : Number(changePct.toFixed(2)),
    currency: meta?.currency ?? null,
    asOf: meta?.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
    source: "Yahoo Finance",
  };
}

async function fromStooq(ticker) {
  const url =
    `https://stooq.com/q/l/?s=${encodeURIComponent(ticker.toLowerCase())}.us&f=sd2t2ohlcv&h&e=csv`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const text = await res.text();
  const lines = text.trim().split("\n");
  if (lines.length < 2) return null;
  const c = lines[1].split(",");
  const close = Number(c[6]);
  const open = Number(c[3]);
  if (!Number.isFinite(close) || close <= 0) return null;
  const changePct = Number.isFinite(open) && open > 0 ? ((close - open) / open) * 100 : null;
  return {
    price: Number(close.toFixed(2)),
    changePct: changePct == null ? null : Number(changePct.toFixed(2)),
    currency: "USD",
    asOf: c[1] && c[1] !== "N/D" ? `${c[1]} ${c[2] ?? ""}`.trim() : null,
    source: "Stooq",
  };
}

async function quote(ticker) {
  for (const fetcher of [fromYahoo, fromStooq]) {
    try {
      const q = await fetcher(ticker);
      if (q) return q;
    } catch {
      /* try next source */
    }
  }
  return null;
}

async function main() {
  let tickers = [];
  try {
    const mentions = JSON.parse(await readFile(MENTIONS_FILE, "utf8"));
    tickers = (mentions.tickers ?? []).map((t) => t.ticker).slice(0, MAX_TICKERS);
  } catch {
    console.error("No mentions.json — run process first. Skipping quotes.");
    return;
  }
  if (tickers.length === 0) {
    console.log("No tickers to quote.");
    return;
  }

  const quotes = {};
  let ok = 0;
  // Small concurrency with polite pacing to avoid provider throttling.
  const BATCH = 5;
  for (let i = 0; i < tickers.length; i += BATCH) {
    const batch = tickers.slice(i, i + BATCH);
    const results = await Promise.all(batch.map((t) => quote(t)));
    batch.forEach((t, j) => {
      if (results[j]) {
        quotes[t] = results[j];
        ok++;
      }
    });
    if (i + BATCH < tickers.length) await sleep(400);
  }

  if (ok === 0) {
    console.error("No quotes fetched — keeping existing quotes.json untouched.");
    return;
  }

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(
    OUT_FILE,
    JSON.stringify({ updatedAt: new Date().toISOString(), quotes }, null, 2),
  );
  console.log(`Wrote ${ok}/${tickers.length} quotes to quotes.json.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
