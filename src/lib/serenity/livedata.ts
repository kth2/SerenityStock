// Best-effort, keyless live price context for AI analysis.
//
// Design contract:
// - Purely additive: a recent-price snapshot is fetched client-side and
//   appended to the AI prompt so the model reasons against current reality
//   instead of a stale training snapshot. It is NEVER used for the scorecard
//   math (which stays methodology-canonical) and is NOT investment data.
// - Keyless public endpoints only, tried in order. Browsers enforce CORS and
//   some networks block these hosts, so EVERY failure is swallowed and the
//   analysis proceeds exactly as before — live data is a bonus, not a
//   dependency. Nothing is thrown to the caller.
// - Prices are indicative and may be delayed; the prompt says so explicitly.

export interface LiveQuote {
  ticker: string;
  price: number;
  currency?: string;
  changePct?: number;
  asOf?: string;
  source: string;
}

/** Yahoo Finance v8 chart endpoint — no key, returns rich meta. */
async function fromYahoo(ticker: string, signal?: AbortSignal): Promise<LiveQuote | null> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?interval=1d&range=1d`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    chart?: {
      result?: {
        meta?: {
          regularMarketPrice?: number;
          chartPreviousClose?: number;
          previousClose?: number;
          currency?: string;
          regularMarketTime?: number;
        };
      }[];
    };
  };
  const meta = data.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (typeof price !== "number" || !Number.isFinite(price)) return null;
  const prev = meta?.chartPreviousClose ?? meta?.previousClose;
  const changePct =
    typeof prev === "number" && prev > 0 ? ((price - prev) / prev) * 100 : undefined;
  return {
    ticker,
    price,
    currency: meta?.currency,
    changePct,
    asOf: meta?.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : undefined,
    source: "Yahoo Finance",
  };
}

/** Stooq CSV fallback — simple, permissive, covers US listings as TICKER.us. */
async function fromStooq(ticker: string, signal?: AbortSignal): Promise<LiveQuote | null> {
  const url =
    `https://stooq.com/q/l/?s=${encodeURIComponent(ticker.toLowerCase())}.us` +
    `&f=sd2t2ohlcv&h&e=csv`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const text = await res.text();
  const lines = text.trim().split("\n");
  if (lines.length < 2) return null;
  const cols = lines[1].split(",");
  // Header: Symbol,Date,Time,Open,High,Low,Close,Volume
  const close = Number(cols[6]);
  const open = Number(cols[3]);
  if (!Number.isFinite(close) || close <= 0) return null;
  const changePct = Number.isFinite(open) && open > 0 ? ((close - open) / open) * 100 : undefined;
  return {
    ticker,
    price: close,
    changePct,
    asOf: cols[1] && cols[1] !== "N/D" ? `${cols[1]} ${cols[2] ?? ""}`.trim() : undefined,
    source: "Stooq",
  };
}

/** Fetch one ticker's quote, trying each source; null if all fail. */
async function fetchQuote(ticker: string, signal?: AbortSignal): Promise<LiveQuote | null> {
  for (const fetcher of [fromYahoo, fromStooq]) {
    try {
      const q = await fetcher(ticker, signal);
      if (q) return q;
    } catch (err) {
      if ((err as Error)?.name === "AbortError") throw err;
      /* swallow — try the next source */
    }
  }
  return null;
}

/**
 * Fetch indicative quotes for up to a handful of tickers in parallel.
 * Always resolves (never rejects except on abort); returns only the quotes
 * that succeeded.
 */
export async function fetchLiveQuotes(
  tickers: string[],
  signal?: AbortSignal,
): Promise<LiveQuote[]> {
  const unique = [...new Set(tickers.map((t) => t.toUpperCase()))].slice(0, 6);
  const results = await Promise.all(
    unique.map((t) =>
      fetchQuote(t, signal).catch((err) => {
        if ((err as Error)?.name === "AbortError") throw err;
        return null;
      }),
    ),
  );
  return results.filter((q): q is LiveQuote => q != null);
}

/** Format quotes as a compact text block to append to the AI prompt. */
export function formatQuotesForPrompt(quotes: LiveQuote[]): string {
  if (quotes.length === 0) return "";
  const lines = quotes.map((q) => {
    const cur = q.currency ? ` ${q.currency}` : "";
    const chg =
      typeof q.changePct === "number"
        ? ` (${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}% intraday)`
        : "";
    const asOf = q.asOf ? `, as of ${q.asOf}` : "";
    return `- $${q.ticker}: ${q.price.toFixed(2)}${cur}${chg} [${q.source}${asOf}]`;
  });
  return [
    "Live price context (indicative, possibly delayed — for situational awareness only,",
    "NOT to be used as the bottleneck rating or as investment data):",
    ...lines,
  ].join("\n");
}
