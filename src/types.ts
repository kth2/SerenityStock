// Shared data-model types. These mirror the JSON produced by scripts/process.mjs
// and scripts/analyze.mjs.

export type SentimentLabel = "bullish" | "bearish" | "neutral";

export interface TweetStats {
  replies: number;
  reposts: number;
  likes: number;
  views: number;
}

export interface Mention {
  tweetId: string;
  ticker: string;
  text: string;
  createdAt: string;
  url: string;
  stats: TweetStats;
  sentiment: { score: number; label: SentimentLabel };
}

export interface TickerHistoryPoint {
  date: string;
  count: number;
  avgSentiment: number;
}

export interface TickerAggregate {
  ticker: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  avgSentiment: number;
  sentimentLabel: SentimentLabel;
  engagement: number;
  history: TickerHistoryPoint[];
}

export interface Digest {
  date: string | null;
  window: { from: string | null; to: string | null };
  totalMentions: number;
  topTickers: { ticker: string; count: number }[];
  newTickers: string[];
}

export interface MentionsData {
  updatedAt: string;
  isSample: boolean;
  handle: string;
  totalTweets: number;
  totalMentions: number;
  mentions: Mention[];
  tickers: TickerAggregate[];
  digest: Digest;
}

/** Precomputed Claude-API analysis stored in analyses.json (optional). */
export interface ApiAnalysis {
  ticker: string;
  generatedAt: string;
  engine: "claude-api";
  model: string;
  markdown: string;
}

export interface AnalysesData {
  updatedAt: string;
  analyses: Record<string, ApiAnalysis>;
}

/* ------------------------- Serenity Skill engine output ------------------ */

export interface ChainLayer {
  layer: string;
  role: string;
  isScarce: boolean;
}

export interface FactorScore {
  key: string;
  label: string;
  rating: number; // 0-5
  weight: number;
  points: number;
  note: string;
}

export interface PenaltyScore {
  key: string;
  label: string;
  rating: number; // 0-5
  points: number;
}

export interface EvidenceItem {
  claim: string;
  source: string;
  strength: "primary" | "media" | "analysis" | "social" | "rumor";
}

export interface SerenityAnalysis {
  ticker: string;
  companyName: string;
  generatedAt: string;
  mode: "simulated";
  whatItConstrains: string;
  chainPosition: string;
  chain: ChainLayer[];
  scarceLayers: string[];
  factors: FactorScore[];
  penalties: PenaltyScore[];
  rawFactorPoints: number;
  penaltyPoints: number;
  finalScore: number;
  verdict: string;
  marketMayMiss: string;
  evidence: EvidenceItem[];
  weakeners: string[];
  nextChecks: string[];
}
