#!/usr/bin/env node
// Scrapes recent Serenity (@aleabitoreddit) posts. Primary source is
// https://www.trackserenity.com/, with the x.com syndication timeline as a
// fallback. Output shape is unchanged (public/data/tweets.json: id/text/
// createdAt/url/stats), so process.mjs → mentions.json needs no changes.
//
// trackserenity.com's homepage is dominated by per-ticker SUMMARY CARDS (e.g.
// "$GLW GLW $146.64 $8.39 (+6.07%) Latest Serenity X post 2026-07-13 …
// TradingView"). Those are NOT posts — they carry a stale "Latest Serenity X
// post" date and no real content. This scraper therefore:
//   1. Prefers real post embeds — elements that link to x.com/…/status/<id>.
//   2. Derives the true post time from the tweet's status id (snowflake),
//      not the scrape time, so the feed sorts by when the post was made.
//   3. Discards the summary cards (identified by the "Latest Serenity X post"
//      label / price-change signature).
//   4. Falls back to the X syndication timeline whenever trackserenity yields
//      too FEW real posts — not only when it yields zero items.
//
// New posts are merged (deduped by id, newest first, capped). The scraper never
// wipes existing data on failure — worst case the file is left untouched.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import crypto from "node:crypto";

const SITE_URL = process.env.SERENITY_URL ?? "https://www.trackserenity.com/";
const HANDLE = process.env.SERENITY_HANDLE ?? "aleabitoreddit";
const MAX_TWEETS = Number(process.env.MAX_TWEETS ?? 500);
const SCROLL_ROUNDS = Number(process.env.SCROLL_ROUNDS ?? 8);
// Below this many real posts from trackserenity, prefer the syndication feed.
const MIN_REAL_POSTS = Number(process.env.MIN_REAL_POSTS ?? 3);

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA_FILE = path.join(root, "public", "data", "tweets.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/* ---------------------------------------------------------------- utils -- */

async function loadExisting() {
  try {
    const parsed = JSON.parse(await readFile(DATA_FILE, "utf8"));
    // Seed/sample posts are placeholders — drop them once real data arrives.
    if (parsed.source === "seed") return [];
    return Array.isArray(parsed.tweets) ? parsed.tweets : [];
  } catch {
    return [];
  }
}

// Stable id from a post's identity so re-scrapes dedupe cleanly.
function stableId(seed) {
  return crypto.createHash("sha1").update(seed).digest("hex").slice(0, 16);
}

// Twitter/X status ids are snowflakes: the high bits encode the creation time.
// This recovers the REAL post time, independent of what trackserenity displays.
const TWITTER_EPOCH = 1288834974657n;
function snowflakeToIso(id) {
  try {
    const ms = (BigInt(id) >> 22n) + TWITTER_EPOCH;
    const d = new Date(Number(ms));
    if (d.getFullYear() >= 2015 && d.getTime() <= Date.now() + 864e5) {
      return d.toISOString();
    }
  } catch {
    /* not a snowflake */
  }
  return null;
}

// Parse a date embedded in card/post text, e.g. "… 2026-07-13 08:45 …".
function parseTextDate(text) {
  const m = text.match(/(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2}))?/);
  if (!m) return null;
  const time = m[2] ? m[2].padStart(5, "0") : "00:00";
  const d = new Date(`${m[1]}T${time}:00Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// The per-ticker summary cards carry this label (real posts never do).
function isSummaryCard(text) {
  return (
    /Latest Serenity X post/i.test(text) ||
    // "$146.64 $8.39 (+6.07%)" price + change signature.
    /\$\d[\d,]*\.\d{2}\s+\$?\d[\d,]*\.\d{2}\s*\(\s*[+-]?\d/.test(text)
  );
}

const extractStatusId = (href) => (href || "").match(/status\/(\d+)/)?.[1] ?? null;

function normalize(post) {
  return {
    id: String(post.id),
    text: post.text?.trim() ?? "",
    createdAt: post.createdAt || new Date().toISOString(),
    url: post.url ?? SITE_URL,
    stats: {
      replies: post.stats?.replies ?? 0,
      reposts: post.stats?.reposts ?? 0,
      likes: post.stats?.likes ?? 0,
      views: post.stats?.views ?? 0,
    },
  };
}

/* ------------------------------------------------ 1. trackserenity.com --- */

async function scrapeTrackSerenity() {
  const { chromium } = await import("playwright");
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH; // optional override
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });

  try {
    const context = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1280, height: 900 },
      locale: "en-US",
    });
    const page = await context.newPage();
    await page.goto(SITE_URL, { waitUntil: "networkidle", timeout: 60_000 });
    await sleep(2500);
    for (let i = 0; i < SCROLL_ROUNDS; i++) {
      await page.mouse.wheel(0, 3000);
      await sleep(1200 + Math.random() * 800);
    }

    // Extract candidates in the browser. Two tiers:
    //  A) real post embeds — anything linking to an x.com/twitter status;
    //  B) prose blocks — fallback text blocks, only used if A is thin.
    const raw = await page.evaluate(() => {
      const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
      const STATUS = "a[href*='/status/']";

      // --- A) status-linked post embeds (one entry per status id) ---
      const posts = [];
      const seenIds = new Set();
      for (const a of Array.from(document.querySelectorAll(STATUS))) {
        const href = a.href || a.getAttribute("href") || "";
        const idm = href.match(/status\/(\d+)/);
        if (!idm) continue;
        const id = idm[1];
        if (seenIds.has(id)) continue;
        seenIds.add(id);
        // Climb to a container with real text, but never one holding a second
        // status link (that would merge two posts together).
        let el = a;
        for (let i = 0; i < 5 && el.parentElement; i++) {
          const parent = el.parentElement;
          if (parent.querySelectorAll(STATUS).length > 1) break;
          el = parent;
          if (clean(el.innerText).length >= 40) break;
        }
        posts.push({
          statusId: id,
          href,
          text: clean(el.innerText || el.textContent),
          datetime: el.querySelector("time")?.getAttribute("datetime") || "",
        });
      }

      // --- B) prose fallback blocks ---
      const blocks = [];
      const seenText = new Set(posts.map((p) => p.text));
      const SELECTORS = [
        "article",
        "[class*='tweet']",
        "[class*='post']",
        "[class*='feed'] li",
        "[class*='timeline'] li",
        "li",
        "[class*='card']",
      ];
      for (const sel of SELECTORS) {
        for (const el of Array.from(document.querySelectorAll(sel))) {
          if (el.querySelector(sel)) continue; // keep leaves
          const text = clean(el.innerText || el.textContent);
          if (text.length < 16 || text.length > 1500) continue;
          if (seenText.has(text)) continue;
          seenText.add(text);
          const a = el.querySelector(STATUS) || el.querySelector("a[href]");
          blocks.push({
            statusId: extractStatusId(a?.getAttribute("href") || ""),
            href: a?.getAttribute("href") || "",
            text,
            datetime: el.querySelector("time")?.getAttribute("datetime") || "",
          });
        }
        if (blocks.length >= 60) break;
      }
      function extractStatusId(href) {
        return (href || "").match(/status\/(\d+)/)?.[1] ?? null;
      }
      return { posts, blocks };
    });

    // Node-side: classify, date, and keep only REAL posts (drop summary cards).
    const out = [];
    const seen = new Set();
    const consider = [...raw.posts, ...raw.blocks];
    for (const c of consider) {
      const text = (c.text || "").trim();
      if (!text) continue;
      if (isSummaryCard(text)) continue; // stale per-ticker card — skip
      const statusId = c.statusId ?? extractStatusId(c.href);
      // A real post either links to a status or is substantial prose.
      if (!statusId && text.length < 40) continue;

      // Prefer the true post time: snowflake > <time> > date-in-text > now.
      const createdAt =
        (statusId && snowflakeToIso(statusId)) ||
        (c.datetime && !Number.isNaN(new Date(c.datetime).getTime())
          ? new Date(c.datetime).toISOString()
          : null) ||
        parseTextDate(text) ||
        new Date().toISOString();

      const id = statusId ?? stableId((c.href || "") + "|" + text.slice(0, 120));
      if (seen.has(id)) continue;
      seen.add(id);

      const url = statusId
        ? `https://x.com/${HANDLE}/status/${statusId}`
        : c.href
          ? new URL(c.href, SITE_URL).toString()
          : SITE_URL;

      out.push({
        id,
        text,
        createdAt,
        url,
        stats: { replies: 0, reposts: 0, likes: 0, views: 0 },
      });
    }
    return out;
  } finally {
    await browser.close();
  }
}

/* ----------------------------------- 2. x.com syndication (fallback) ----- */

async function scrapeWithSyndication() {
  // Endpoint used by publish.twitter.com embedded timelines — no auth needed.
  const url =
    `https://syndication.twitter.com/srv/timeline-profile/screen-name/${HANDLE}` +
    `?showReplies=false`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`syndication HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s,
  );
  if (!m) throw new Error("syndication: __NEXT_DATA__ not found");
  const data = JSON.parse(m[1]);
  const entries =
    data?.props?.pageProps?.timeline?.entries?.filter((e) => e.type === "tweet") ??
    [];
  return entries.map((e) => {
    const t = e.content.tweet;
    return {
      id: String(t.id_str),
      text: t.full_text ?? t.text ?? "",
      createdAt: new Date(t.created_at).toISOString(),
      url: `https://x.com/${HANDLE}/status/${t.id_str}`,
      stats: {
        replies: t.reply_count ?? 0,
        reposts: t.retweet_count ?? 0,
        likes: t.favorite_count ?? 0,
        views: 0,
      },
    };
  });
}

async function syndicationWithBackoff() {
  const delays = [0, 25_000, 50_000];
  for (const delay of delays) {
    if (delay) {
      console.log(`Retrying syndication in ${delay / 1000}s ...`);
      await sleep(delay + Math.random() * 5000);
    }
    try {
      return await scrapeWithSyndication();
    } catch (err) {
      console.warn(`Syndication scrape failed: ${err.message}`);
    }
  }
  return [];
}

/* ----------------------------------------------------------------- main -- */

async function main() {
  let realPosts = [];
  console.log(`Scraping ${SITE_URL} ...`);
  try {
    realPosts = await scrapeTrackSerenity();
    console.log(`trackserenity: ${realPosts.length} real posts (summary cards dropped).`);
  } catch (err) {
    console.warn(`trackserenity scrape failed: ${err.message}`);
  }

  let scraped = [];
  let method = "";

  if (realPosts.length >= MIN_REAL_POSTS) {
    scraped = realPosts;
    method = "trackserenity";
  } else {
    // Too few real posts (page was mostly summary cards) — prefer the real
    // chronological X timeline.
    console.log(
      `Only ${realPosts.length} real posts from trackserenity (< ${MIN_REAL_POSTS}); ` +
        `falling back to @${HANDLE} syndication ...`,
    );
    const synd = await syndicationWithBackoff();
    if (synd.length > 0) {
      scraped = synd;
      method = "syndication";
    } else if (realPosts.length > 0) {
      scraped = realPosts; // better than nothing
      method = "trackserenity";
    }
  }

  if (scraped.length === 0) {
    console.error("No posts scraped by any method — keeping existing data untouched.");
    return; // exit 0 so a transient block doesn't fail the scheduled workflow
  }

  const existing = await loadExisting();
  const byId = new Map(existing.map((t) => [t.id, t]));
  let added = 0;
  for (const rawPost of scraped) {
    const t = normalize(rawPost);
    if (!t.id || !t.text) continue;
    if (!byId.has(t.id)) added++;
    byId.set(t.id, t); // newer scrape wins (fresher content)
  }

  const merged = [...byId.values()]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, MAX_TWEETS);

  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(
    DATA_FILE,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        source: method,
        sourceUrl: method === "trackserenity" ? SITE_URL : `https://x.com/${HANDLE}`,
        handle: HANDLE,
        tweets: merged,
      },
      null,
      2,
    ),
  );
  console.log(
    `Done via ${method}: ${scraped.length} scraped, ${added} new, ${merged.length} stored.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
