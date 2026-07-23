// Deterministic "Serenity signal score" — a faithful port of haskaomni's
// serenity-stock-scorer (score_serenity_stock.py). Unlike the bottleneck
// scorecard (which needs an LLM to rate qualitative factors 0-5), THIS score
// is computed purely from the scraped mention feed: how often, how recently,
// how convincingly, and with what engagement a name is discussed — minus a
// risk/caution penalty. No AI key, no live-market data. It answers a different
// question ("how strong is the social signal?") than the bottleneck scorecard
// ("how good is the supply-chain thesis?"), so the two run side by side.
//
// Exact weights, caps and lexicons mirror the upstream script. The seven topic
// groups are named upstream; their member keywords are adapted here to the same
// categories (upstream ships them in a data file we reproduce below).

const CONVICTION = [
  "went long", "long $", "own ", "position", "positions", "started",
  "bought", "buying", "cost average", "high conviction",
];
const ASYMMETRY = [
  "asymmetry", "mispriced", "rerate", "undervalued", "cheap", "ignored",
  "underappreciated", "hidden", "overlooked",
];
const SUPPLY_CHAIN = [
  "supply chain", "bottleneck", "scarcity", "capacity", "shortage",
  "lead time", "constraints", "monopoly", "duopoly",
];
const CATALYST = [
  "catalyst", "earnings", "guidance", "guide", "order", "contract", "launch",
  "ramp", "mass production", "nasdaq listing", "chips act",
];
const RISK = [
  "risk", "dilution", "debt", "uncertainty", "tariff", "execution",
  "customer concentration", "competition", "overhang",
];
const CAUTION = [
  "short term", "trim", "sold", "take profit", "too hot", "overpriced",
  "overvalued", "bubble", "expensive", "crowded",
];

// Seven topic groups (upstream category names; keyword members adapted).
const TOPICS = {
  ai_infra_neocloud: [
    "ai", "gpu", "datacenter", "data center", "neocloud", "compute",
    "inference", "training", "hyperscaler", "accelerator", "cluster",
  ],
  optical_photonics_networking: [
    "optical", "photonics", "silicon photonics", "cpo", "transceiver",
    "laser", "fiber", "networking", "interconnect", "dwdm", "800g", "1.6t",
  ],
  memory_storage: ["memory", "dram", "hbm", "nand", "storage", "ssd", "flash"],
  semi_materials_packaging: [
    "semiconductor", "wafer", "foundry", "packaging", "advanced packaging",
    "substrate", "lithography", "etch", "deposition", "cowos", "chip",
  ],
  power_grid_energy: [
    "power", "grid", "energy", "electricity", "transformer", "nuclear",
    "solar", "battery", "utility", "megawatt", "gigawatt",
  ],
  robotics_space_industrial: [
    "robot", "robotics", "automation", "humanoid", "space", "satellite",
    "aerospace", "industrial", "drone",
  ],
  platforms_consumer_fintech: [
    "platform", "software", "saas", "fintech", "payments", "consumer",
    "subscription",
  ],
};

const DAY = 86_400_000;

/** Count non-overlapping occurrences of a phrase in a lowercased corpus. */
function occ(corpus, phrase) {
  if (!phrase) return 0;
  return corpus.split(phrase).length - 1;
}
/** Total occurrences across a lexicon. */
function hits(corpus, lexicon) {
  let n = 0;
  for (const w of lexicon) n += occ(corpus, w);
  return n;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round1 = (v) => Math.round(v * 10) / 10;

/**
 * Compute the Serenity signal score for one ticker from its mention list.
 * @param {Array<{text:string,createdAt:string,stats?:{likes?:number,reposts?:number,replies?:number}}>} mentions
 * @param {number} now epoch ms used for recency (defaults to Date.now()).
 * @returns {{score:number, band:string, components:object}}
 */
export function serenitySignalScore(mentions, now = Date.now()) {
  const n = mentions.length;
  if (n === 0) {
    return { score: 0, band: "Weak Serenity signal", components: {} };
  }

  const corpus = mentions.map((m) => (m.text || "").toLowerCase()).join(" \n ");
  const times = mentions
    .map((m) => new Date(m.createdAt).getTime())
    .filter((t) => Number.isFinite(t));
  const last = times.length ? Math.max(...times) : now;
  const first = times.length ? Math.min(...times) : now;

  // Frequency (log-scaled to 50).
  const frequency = Math.min(18, (Math.log1p(n) / Math.log1p(50)) * 18);

  // Recency: days since the most recent mention.
  const daysSince = (now - last) / DAY;
  const recency =
    daysSince <= 7 ? 10 : daysSince <= 30 ? 8 : daysSince <= 90 ? 5 : daysSince <= 180 ? 3 : 1;

  // Persistence: distinct calendar months + span, capped.
  const months = new Set(mentions.map((m) => (m.createdAt || "").slice(0, 7)).filter(Boolean)).size;
  const spanDays = Math.max(0, (last - first) / DAY);
  const persistence = Math.min(8, months * 1.4 + (Math.min(spanDays, 180) / 180) * 3);

  // Engagement: log-scaled average weighted engagement (quotes not tracked → 0).
  const avgEng =
    mentions.reduce((s, m) => {
      const st = m.stats || {};
      return s + (st.likes ?? 0) + 2 * (st.reposts ?? 0) + (st.replies ?? 0);
    }, 0) / n;
  const engagement = Math.min(10, (Math.log1p(avgEng) / Math.log1p(3000)) * 10);

  // Conviction.
  const convictionHits = hits(corpus, CONVICTION);
  const asymmetryHits = hits(corpus, ASYMMETRY);
  const conviction = Math.min(15, convictionHits * 1.7 + asymmetryHits * 1.4 + Math.min(n, 20) * 0.15);

  // Theme fit across the seven topic groups.
  const topicHits = Object.values(TOPICS).map((lex) => hits(corpus, lex));
  const topicCount = topicHits.filter((h) => h > 0).length;
  const maxTopicHits = topicHits.length ? Math.max(...topicHits) : 0;
  const supplyChainHits = hits(corpus, SUPPLY_CHAIN);
  const themeFit = Math.min(15, topicCount * 1.7 + maxTopicHits * 0.35 + supplyChainHits * 0.9);

  // Catalyst.
  const catalystHits = hits(corpus, CATALYST);
  const catalyst = Math.min(12, catalystHits * 1.5 + supplyChainHits * 0.5);

  // Risk penalty.
  const riskHits = hits(corpus, RISK);
  const cautionHits = hits(corpus, CAUTION);
  const risk = Math.min(18, riskHits * 1.4 + cautionHits * 1.8);

  const raw = 12 + frequency + recency + persistence + engagement + conviction + themeFit + catalyst - risk;
  const score = round1(clamp(raw, 0, 100));

  const band =
    score >= 80
      ? "High-conviction Serenity fit"
      : score >= 65
        ? "Constructive / worth work"
        : score >= 45
          ? "Mixed or early"
          : "Weak Serenity signal";

  return {
    score,
    band,
    components: {
      base: 12,
      frequency: round1(frequency),
      recency,
      persistence: round1(persistence),
      engagement: round1(engagement),
      conviction: round1(conviction),
      themeFit: round1(themeFit),
      catalyst: round1(catalyst),
      risk: round1(risk),
    },
  };
}

/** Short band key for i18n / styling. */
export function signalBandKey(score) {
  if (score >= 80) return "high";
  if (score >= 65) return "constructive";
  if (score >= 45) return "mixed";
  return "weak";
}
