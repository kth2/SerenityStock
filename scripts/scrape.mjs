#!/usr/bin/env node
// Scrapes recent posts from x.com/aleabitoreddit.
//
// Strategy (most → least robust):
//   1. Playwright: load the profile, scroll, extract tweet articles from the DOM.
//   2. Twitter syndication endpoint (no login, used by embedded timelines).
//
// New tweets are merged into public/data/tweets.json (deduped by id, newest
// first, capped). The scraper never wipes existing data on failure — worst
// case the file is left untouched and the processor keeps the last good set.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HANDLE = process.env.SERENITY_HANDLE ?? "aleabitoreddit";
const MAX_TWEETS = Number(process.env.MAX_TWEETS ?? 500);
const SCROLL_ROUNDS = Number(process.env.SCROLL_ROUNDS ?? 12);

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA_FILE = path.join(root, "public", "data", "tweets.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------- utils -- */

async function loadExisting() {
  try {
    const parsed = JSON.parse(await readFile(DATA_FILE, "utf8"));
    // Seed/sample tweets are placeholders — drop them once real data arrives.
    if (parsed.source === "seed") return [];
    return Array.isArray(parsed.tweets) ? parsed.tweets : [];
  } catch {
    return [];
  }
}

function normalize(tweet) {
  return {
    id: String(tweet.id),
    text: tweet.text?.trim() ?? "",
    createdAt: tweet.createdAt,
    url: tweet.url ?? `https://x.com/${HANDLE}/status/${tweet.id}`,
    stats: {
      replies: tweet.stats?.replies ?? 0,
      reposts: tweet.stats?.reposts ?? 0,
      likes: tweet.stats?.likes ?? 0,
      views: tweet.stats?.views ?? 0,
    },
  };
}

/* ----------------------------------------------------- 1. playwright ----- */

async function scrapeWithPlaywright() {
  const { chromium } = await import("playwright");
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH; // optional override
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 900 },
      locale: "en-US",
    });
    const page = await context.newPage();
    await page.goto(`https://x.com/${HANDLE}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Wait for the timeline to render; X is slow and sometimes shows an
    // interstitial first, so poll rather than fail fast.
    await page
      .waitForSelector("article[data-testid='tweet']", { timeout: 30_000 })
      .catch(() => {});

    const seen = new Map();
    for (let round = 0; round < SCROLL_ROUNDS; round++) {
      const batch = await page.$$eval("article[data-testid='tweet']", (articles) =>
        articles.map((article) => {
          const link = article.querySelector("a[href*='/status/'] time")?.closest("a");
          const time = article.querySelector("time");
          const textEl = article.querySelector("div[data-testid='tweetText']");
          const stat = (name) => {
            const el = article.querySelector(`[data-testid='${name}']`);
            const label = el?.getAttribute("aria-label") ?? el?.textContent ?? "";
            const m = label.replace(/,/g, "").match(/[\d.]+[KM]?/);
            if (!m) return 0;
            let n = parseFloat(m[0]);
            if (/K$/i.test(m[0])) n *= 1e3;
            if (/M$/i.test(m[0])) n *= 1e6;
            return Math.round(n);
          };
          const href = link?.getAttribute("href") ?? "";
          const id = href.split("/status/")[1]?.split(/[/?]/)[0] ?? "";
          return {
            id,
            href,
            text: textEl?.textContent ?? "",
            createdAt: time?.getAttribute("datetime") ?? "",
            replies: stat("reply"),
            reposts: stat("retweet"),
            likes: stat("like"),
          };
        }),
      );

      for (const t of batch) {
        if (t.id && t.text && !seen.has(t.id)) {
          seen.set(t.id, {
            id: t.id,
            text: t.text,
            createdAt: t.createdAt || new Date().toISOString(),
            url: `https://x.com${t.href}`,
            stats: { replies: t.replies, reposts: t.reposts, likes: t.likes, views: 0 },
          });
        }
      }

      await page.mouse.wheel(0, 2500);
      await sleep(1500 + Math.random() * 1500); // polite, human-ish pacing
    }

    return [...seen.values()];
  } finally {
    await browser.close();
  }
}

/* ------------------------------------------------- 2. syndication API ---- */

async function scrapeWithSyndication() {
  // Endpoint used by publish.twitter.com embedded timelines — no auth needed.
  // Returns server-rendered HTML with a __NEXT_DATA__ JSON blob.
  const url =
    `https://syndication.twitter.com/srv/timeline-profile/screen-name/${HANDLE}` +
    `?showReplies=false`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    },
  });
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
  console.log(`Scraping @${HANDLE} ...`);
  let scraped = [];
  let method = "";

  try {
    scraped = await scrapeWithPlaywright();
    method = "playwright";
  } catch (err) {
    console.warn(`Playwright scrape failed: ${err.message}`);
  }

  if (scraped.length === 0) {
    try {
      scraped = await scrapeWithSyndication();
      method = "syndication";
    } catch (err) {
      console.warn(`Syndication scrape failed: ${err.message}`);
    }
  }

  if (scraped.length === 0) {
    console.error(
      "No tweets scraped by any method — keeping existing data untouched.",
    );
    // Exit 0 so a transient block doesn't fail the whole scheduled workflow;
    // the processor will re-run on yesterday's data.
    return;
  }

  const existing = await loadExisting();
  const byId = new Map(existing.map((t) => [t.id, t]));
  let added = 0;
  for (const raw of scraped) {
    const t = normalize(raw);
    if (!byId.has(t.id)) added++;
    byId.set(t.id, t); // newer scrape wins (fresher stats)
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
