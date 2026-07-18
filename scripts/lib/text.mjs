// Shared text-processing helpers for the data pipeline:
// $TICKER extraction and lexicon-based sentiment scoring.

// Cashtag-shaped strings that are almost never real tickers in casual text.
const TICKER_BLACKLIST = new Set([
  "A", "I", "AI", "IT", "US", "USA", "EU", "UK", "CEO", "CFO", "IPO", "ETF",
  "GDP", "EPS", "PE", "YOY", "QOQ", "ATH", "IMO", "DD", "FYI", "PS", "OK",
  "LOL", "WTF", "HODL", "YOLO", "FOMO", "EV", "TAM", "CAGR", "GAAP", "M&A",
]);

const TICKER_RE = /\$([A-Za-z]{1,5})(?:\.[A-Za-z]{1,2})?\b/g;

/** Extract unique uppercase tickers from a tweet's text. */
export function extractTickers(text) {
  const out = new Set();
  for (const match of text.matchAll(TICKER_RE)) {
    const t = match[1].toUpperCase();
    if (!TICKER_BLACKLIST.has(t)) out.add(t);
  }
  return [...out];
}

// Small finance-flavoured sentiment lexicon. Deliberately simple — this is a
// first-pass signal; the deep view comes from the Serenity Skill analysis.
const POSITIVE = {
  bullish: 2, buy: 1, long: 1, upside: 2, undervalued: 2, cheap: 1, growth: 1,
  beat: 2, beats: 2, strong: 1, surge: 2, ramp: 1, ramping: 1, expanding: 1,
  winner: 2, wins: 1, moat: 2, scarce: 1, scarcity: 2, bottleneck: 1,
  chokepoint: 1, "sold out": 2, backlog: 1, record: 1, accelerating: 2,
  breakout: 1, opportunity: 1, conviction: 2, love: 1, great: 1, best: 1,
  mispriced: 1, asymmetric: 2, constrained: 1, tight: 1, pricing: 1,
  monopoly: 2, oligopoly: 1, irreplaceable: 2, critical: 1,
};
const NEGATIVE = {
  bearish: -2, sell: -1, short: -1, overvalued: -2, expensive: -1, miss: -2,
  missed: -2, weak: -1, crash: -2, dump: -2, decline: -1, dilution: -2,
  risk: -1, risky: -1, avoid: -2, loser: -2, hype: -1, bubble: -2, fraud: -3,
  crowded: -1, priced: -1, saturation: -1, oversupply: -2, glut: -2,
  cancelled: -2, delay: -1, delayed: -1, downgrade: -1, warning: -1,
  disappointing: -2, cut: -1, wrong: -1,
};

/**
 * Score sentiment of a text in [-1, 1] with a label.
 * Multi-word keys are matched as substrings; single words on word boundaries.
 */
export function scoreSentiment(text) {
  const lower = text.toLowerCase();
  let score = 0;
  let hits = 0;
  for (const [lex, weight] of [
    ...Object.entries(POSITIVE),
    ...Object.entries(NEGATIVE),
  ]) {
    const re = lex.includes(" ")
      ? new RegExp(lex.replace(/ /g, "\\s+"), "g")
      : new RegExp(`\\b${lex}\\b`, "g");
    const count = (lower.match(re) ?? []).length;
    if (count > 0) {
      score += weight * count;
      hits += count;
    }
  }
  const normalized = hits === 0 ? 0 : Math.max(-1, Math.min(1, score / (hits * 2)));
  const label =
    normalized > 0.15 ? "bullish" : normalized < -0.15 ? "bearish" : "neutral";
  return { score: Number(normalized.toFixed(3)), label };
}

export function dayKey(iso) {
  return iso.slice(0, 10);
}
