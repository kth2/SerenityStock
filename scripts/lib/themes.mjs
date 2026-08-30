// Theme taxonomy + period aggregation for the scraped Serenity feed.
//
// This is the deterministic half of the periodic digest: it classifies each
// post into supply-chain themes by keyword, then rolls mentions up by ISO week
// and calendar month so the app can show WHAT Serenity is focused on and HOW
// that shifted versus the previous period. No LLM is involved, so this works
// offline, costs nothing, and always produces the same answer for the same data.
//
// Honesty rules baked in:
// - Sample sizes travel with every number; a week here is only ~20-35 posts, so
//   one busy day about one stock can dominate.
// - A rising/cooling verdict is only issued when BOTH periods clear a minimum
//   sample. Otherwise the trend is reported as "thin" rather than invented.
// - Posts matching nothing land in "unclassified" instead of being forced into
//   a bucket.

/** Theme ids/titles mirror src/lib/serenity/themes.ts; keywords are tuned for
 *  post prose rather than search queries. */
export const THEMES = [
  {
    id: "neocloud",
    title: "Neocloud / GPU cloud & HPC",
    keywords: [
      "neocloud", "neo cloud", "gpu cloud", "hpc", "data center", "datacenter",
      "compute", "inference", "training cluster", "hyperscaler", "capacity",
    ],
  },
  {
    id: "optics",
    title: "AI optical interconnect / CPO",
    keywords: [
      "optic", "photonic", "cpo", "co-packaged", "transceiver", "800g", "1.6t",
      "laser", "fiber", "dwdm", "interconnect",
    ],
  },
  {
    id: "power",
    title: "Data-center power & grid",
    keywords: [
      "power", "grid", "electric", "switchgear", "transformer", "energy",
      "megawatt", "gigawatt", "turbine", "nuclear", "utility",
    ],
  },
  {
    id: "memory",
    title: "HBM / memory & storage",
    keywords: ["hbm", "memory", "dram", "nand", "ssd", "storage", "bandwidth", "flash"],
  },
  {
    id: "cooling",
    title: "Liquid cooling / thermal",
    keywords: ["cooling", "thermal", "liquid cooling", "cdu", "immersion", "heat"],
  },
  {
    id: "networking",
    title: "AI networking / Ethernet",
    keywords: ["networking", "ethernet", "infiniband", "switch fabric", "nic", "router"],
  },
  {
    id: "robotics",
    title: "Robotics / humanoids",
    keywords: ["robot", "humanoid", "actuator", "automation", "autonomous", "lidar"],
  },
  {
    id: "semicap",
    title: "Semis, packaging & equipment",
    keywords: [
      "wafer", "foundry", "lithography", "packaging", "cowos", "substrate",
      "semiconductor", "fab ", "etch", "deposition", "node ", "yield",
    ],
  },
  {
    id: "policy",
    title: "Policy, export controls & tariffs",
    keywords: [
      "tariff", "export control", "sanction", "ban", "chips act", "regulat",
      "fcc", "commerce department", "restriction",
    ],
  },
];

const MIN_SAMPLE = 4; // below this a period is too thin for a trend verdict

/** Which themes does one post touch? Returns theme ids (possibly empty). */
export function classifyPost(text) {
  const lower = (text || "").toLowerCase();
  const hits = [];
  for (const theme of THEMES) {
    if (theme.keywords.some((k) => lower.includes(k))) hits.push(theme.id);
  }
  return hits;
}

/** ISO week key like "2026-W35". */
export function isoWeekKey(iso) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() - day + 3);
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - jan4Day);
  const week = Math.floor((thursday - week1Mon) / (7 * 864e5)) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export const monthKey = (iso) => iso.slice(0, 7);

/**
 * Build period buckets for one granularity.
 * @param mentions per-ticker mention records (from process.mjs)
 * @param posts    the raw posts (used for theme classification + post counts)
 */
function buildPeriods(mentions, posts, keyOf) {
  const buckets = new Map();
  const bucket = (key) => {
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        from: null,
        to: null,
        posts: 0,
        mentions: 0,
        themeCounts: new Map(),
        tickerCounts: new Map(),
        tickerThemes: new Map(),
        unclassified: 0,
      });
    }
    return buckets.get(key);
  };

  // Posts → theme counts (a post can touch several themes).
  for (const p of posts) {
    const day = (p.createdAt || "").slice(0, 10);
    if (!day) continue;
    const b = bucket(keyOf(p.createdAt));
    b.posts += 1;
    b.from = b.from && b.from < day ? b.from : day;
    b.to = b.to && b.to > day ? b.to : day;
    const themes = classifyPost(p.text);
    if (themes.length === 0) b.unclassified += 1;
    for (const id of themes) {
      b.themeCounts.set(id, (b.themeCounts.get(id) ?? 0) + 1);
    }
  }

  // Mentions → ticker counts.
  for (const m of mentions) {
    const key = keyOf(m.createdAt);
    if (!buckets.has(key)) continue;
    const b = buckets.get(key);
    b.mentions += 1;
    b.tickerCounts.set(m.ticker, (b.tickerCounts.get(m.ticker) ?? 0) + 1);
    // Attribute the post's themes to the ticker it mentioned, so the app can
    // say "AAOI — optics" without re-classifying text in the browser.
    if (!b.tickerThemes.has(m.ticker)) b.tickerThemes.set(m.ticker, new Set());
    for (const id of classifyPost(m.text)) b.tickerThemes.get(m.ticker).add(id);
  }

  const ordered = [...buckets.values()].sort((a, b) => (a.key < b.key ? -1 : 1));

  // Attach shares, deltas and trend verdicts (vs the immediately prior period).
  return ordered.map((b, i) => {
    const prev = i > 0 ? ordered[i - 1] : null;
    const totalThemeHits = [...b.themeCounts.values()].reduce((s, n) => s + n, 0);
    const prevTotal = prev
      ? [...prev.themeCounts.values()].reduce((s, n) => s + n, 0)
      : 0;

    const themes = THEMES.map((t) => {
      const n = b.themeCounts.get(t.id) ?? 0;
      const share = totalThemeHits ? n / totalThemeHits : 0;
      const pn = prev ? (prev.themeCounts.get(t.id) ?? 0) : 0;
      const prevShare = prevTotal ? pn / prevTotal : 0;
      const deltaShare = prev ? share - prevShare : 0;

      // Only judge a trend when both periods carry enough posts to mean
      // something; otherwise say so rather than inventing a direction.
      let trend = "steady";
      if (!prev || b.posts < MIN_SAMPLE || prev.posts < MIN_SAMPLE) trend = "thin";
      else if (pn === 0 && n > 0) trend = "new";
      else if (deltaShare >= 0.06) trend = "rising";
      else if (deltaShare <= -0.06) trend = "cooling";

      return {
        id: t.id,
        title: t.title,
        posts: n,
        share: Number(share.toFixed(3)),
        prevPosts: pn,
        deltaShare: Number(deltaShare.toFixed(3)),
        trend,
      };
    })
      .filter((t) => t.posts > 0 || t.prevPosts > 0)
      .sort((a, b2) => b2.posts - a.posts);

    const topTickers = [...b.tickerCounts.entries()]
      .sort((a, b2) => b2[1] - a[1])
      .slice(0, 8)
      .map(([ticker, count]) => ({
        ticker,
        count,
        themes: [...(b.tickerThemes.get(ticker) ?? [])],
      }));

    // Tickers appearing this period but not the one before.
    const newTickers = prev
      ? topTickers.filter((t) => !prev.tickerCounts.has(t.ticker)).map((t) => t.ticker)
      : [];

    return {
      key: b.key,
      from: b.from,
      to: b.to,
      posts: b.posts,
      mentions: b.mentions,
      unclassified: b.unclassified,
      /** True when this period has too few posts to read much into. */
      thin: b.posts < MIN_SAMPLE,
      themes,
      topTickers,
      newTickers,
    };
  });
}

/** Weekly + monthly rollups, newest last. */
export function buildPeriodDigests(mentions, posts) {
  return {
    minSample: MIN_SAMPLE,
    weekly: buildPeriods(mentions, posts, (iso) => isoWeekKey(iso)),
    monthly: buildPeriods(mentions, posts, (iso) => monthKey(iso)),
  };
}
