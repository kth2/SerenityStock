#!/usr/bin/env node
// Scrapes recent stock updates from https://www.trackserenity.com/ (primary),
// falling back to the x.com/aleabitoreddit syndication timeline if the site
// yields nothing. Output shape is unchanged (public/data/tweets.json: a list of
// posts with id/text/createdAt/url/stats), so the rest of the pipeline
// (process.mjs → mentions.json) works without modification.
//
// The site's exact DOM is not assumed: extraction is defensive and tries
// several strategies, keeping any text block that carries a ticker symbol.
//
// New posts are merged (deduped by id, newest first, capped). The scraper
// never wipes existing data on failure — worst case the file is left
// untouched and the processor keeps the last good set.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import crypto from "node:crypto";

const SITE_URL = process.env.SERENITY_URL ?? "https://www.trackserenity.com/";
const HANDLE = process.env.SERENITY_HANDLE ?? "aleabitoreddit";
const MAX_TWEETS = Number(process.env.MAX_TWEETS ?? 500);
const SCROLL_ROUNDS = Number(process.env.SCROLL_ROUNDS ?? 8);

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
    // Give client-rendered content a moment, then scroll to load more items.
    await sleep(2500);
    for (let i = 0; i < SCROLL_ROUNDS; i++) {
      await page.mouse.wheel(0, 3000);
      await sleep(1200 + Math.random() * 800);
    }

    // Extract candidate post items in the browser. Strategy: prefer common
    // list/card containers; fall back to any block-level element that carries
    // enough text. Each item keeps its text plus a stable link if present.
    const items = await page.evaluate(() => {
      const SELECTORS = [
        "article",
        "[class*='card']",
        "[class*='post']",
        "[class*='update']",
        "[class*='item']",
        "[class*='entry']",
        "li",
        "tr",
      ];
      const seen = new Set();
      const out = [];
      const pushEl = (el) => {
        const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
        if (text.length < 8 || text.length > 1200) return;
        if (seen.has(text)) return;
        seen.add(text);
        const a = el.querySelector("a[href]");
        const time = el.querySelector("time");
        out.push({
          text,
          href: a?.getAttribute("href") || "",
          datetime: time?.getAttribute("datetime") || "",
        });
      };
      for (const sel of SELECTORS) {
        for (const el of Array.from(document.querySelectorAll(sel))) {
          // Skip elements that merely wrap other candidate items (keep leaves).
          if (el.querySelector(sel)) continue;
          pushEl(el);
        }
        if (out.length >= 40) break;
      }
      // Last resort: whole-page paragraphs.
      if (out.length === 0) {
        for (const el of Array.from(document.querySelectorAll("p, div"))) {
          pushEl(el);
          if (out.length >= 40) break;
        }
      }
      return out;
    });

    // Ticker detection: real cashtags ($AAOI) plus bracketed/paren symbols
    // like (AAOI) or NASDAQ: AAOI that finance sites commonly use. Anything
    // matched is emitted as a $-cashtag so process.mjs picks it up.
    const CASHTAG = /\$[A-Za-z]{1,5}\b/;
    const SYMBOL = /(?:\(|\b(?:NYSE|NASDAQ|AMEX)\s*:\s*)([A-Z]{2,5})\)?/g;
    const posts = [];
    for (const it of items) {
      let text = it.text;
      if (!CASHTAG.test(text)) {
        // Promote exchange-tagged/parenthesized symbols to cashtags.
        const found = new Set();
        for (const m of text.matchAll(SYMBOL)) found.add(m[1]);
        for (const sym of found) {
          text = text.replace(
            new RegExp(`(?<!\\$)\\b${sym}\\b`, "g"),
            `$${sym}`,
          );
        }
      }
      if (!CASHTAG.test(text)) continue; // no ticker → not a stock post
      const url = it.href
        ? new URL(it.href, SITE_URL).toString()
        : SITE_URL;
      const createdAt = it.datetime
        ? new Date(it.datetime).toISOString()
        : new Date().toISOString();
      posts.push({
        id: stableId(url + "|" + text.slice(0, 120)),
        text,
        createdAt,
        url,
        stats: { replies: 0, reposts: 0, likes: 0, views: 0 },
      });
    }
    return posts;
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

/* ----------------------------------------------------------------- main -- */

async function main() {
  let scraped = [];
  let method = "";

  console.log(`Scraping ${SITE_URL} ...`);
  try {
    scraped = await scrapeTrackSerenity();
    method = "trackserenity";
    console.log(`trackserenity: ${scraped.length} stock posts found.`);
  } catch (err) {
    console.warn(`trackserenity scrape failed: ${err.message}`);
  }

  // Fallback to the X syndication timeline (with backoff for transient 429s).
  if (scraped.length === 0) {
    console.log(`Falling back to @${HANDLE} syndication timeline ...`);
    const delays = [0, 25_000, 50_000];
    for (const delay of delays) {
      if (delay) {
        console.log(`Retrying syndication in ${delay / 1000}s ...`);
        await sleep(delay + Math.random() * 5000);
      }
      try {
        scraped = await scrapeWithSyndication();
        method = "syndication";
        break;
      } catch (err) {
        console.warn(`Syndication scrape failed: ${err.message}`);
      }
    }
  }

  if (scraped.length === 0) {
    console.error("No posts scraped by any method — keeping existing data untouched.");
    // Exit 0 so a transient block doesn't fail the scheduled workflow.
    return;
  }

  const existing = await loadExisting();
  const byId = new Map(existing.map((t) => [t.id, t]));
  let added = 0;
  for (const raw of scraped) {
    const t = normalize(raw);
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
