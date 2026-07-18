# Serenity Stock Tracker

A fully installable, offline-capable **Progressive Web App** that tracks stock
mentions by [@aleabitoreddit](https://x.com/aleabitoreddit) ("Serenity") and
applies deep **supply-chain bottleneck analysis** using the open
[serenity-skill](https://github.com/muxuuu/serenity-skill) research methodology
— bundled in full under [`skill/`](skill/).

Built with **Vite + React 18 + TypeScript + Tailwind CSS + shadcn-style UI +
Recharts**, deployed as a static site to **GitHub Pages**, refreshed daily by a
**GitHub Actions** scraping pipeline.

> **Disclaimer** — unofficial and independent. Research support only, never
> investment advice. Until the first successful scrape, the app displays
> clearly-labeled *synthetic sample data* (not real posts).

---

## Features

- **Dashboard** — stat cards, mention-frequency chart, top-tickers chart,
  latest-mentions feed, weekly digest with new tickers.
- **Ticker tracker** — searchable table with per-ticker mention counts,
  lexicon-based sentiment (score + history sparkline), and expandable rows.
- **"Deep Analyze with Serenity Skill"** — per-ticker structured research:
  value-chain breakdown, scarce-layer ranking, bottleneck scorecard (exact math
  ported from `skill/scripts/serenity_scorecard.py`), graded evidence per the
  skill's evidence ladder, what-the-market-may-miss, failure conditions, and
  next verification steps.
- **Optional Claude-API analyses** — with an `ANTHROPIC_API_KEY` secret the
  daily pipeline runs the actual skill through Claude and the UI shows those
  richer markdown analyses instead of the simulated engine.
- **PWA** — installable (manifest + icons), auto-updating service worker,
  offline caching of the app shell (precache) and the latest data JSON
  (NetworkFirst runtime cache). Mobile-first, dark mode.

## Architecture

```
┌───────────────────── GitHub Actions (daily 06:30 UTC) ─────────────────────┐
│ scripts/scrape.mjs      Playwright → x.com/aleabitoreddit (scroll+extract) │
│                         fallback: Twitter syndication endpoint             │
│         ↓ public/data/tweets.json (merged, deduped, capped)                │
│ scripts/process.mjs     $TICKER extraction + sentiment + aggregates        │
│         ↓ public/data/mentions.json                                        │
│ scripts/analyze.mjs     (optional) Claude API × bundled Serenity Skill     │
│         ↓ public/data/analyses.json                                        │
│ commit → push → triggers deploy.yml → GitHub Pages rebuild                 │
└────────────────────────────────────────────────────────────────────────────┘

Frontend (static, no backend):
  src/hooks/useData.ts          fetches the JSON (SW-cached for offline)
  src/lib/serenity/scorecard.ts exact port of serenity_scorecard.py math
  src/lib/serenity/knowledge.ts curated value-chain knowledge base
  src/lib/serenity/engine.ts    simulated skill runs in the browser
```

## Project structure

```
├── .github/workflows/
│   ├── update-data.yml     daily scrape → process → analyze → commit
│   └── deploy.yml          build + deploy to GitHub Pages on push to main
├── public/
│   ├── data/               tweets.json · mentions.json · analyses.json
│   └── icons/              PWA icons (regenerate: npm run icons)
├── scripts/
│   ├── scrape.mjs          Playwright scraper (+ syndication fallback)
│   ├── process.mjs         mention/sentiment processor
│   ├── analyze.mjs         optional Claude-API skill runner
│   ├── generate-icons.mjs  dependency-free PNG icon generator
│   └── lib/text.mjs        shared ticker/sentiment helpers
├── skill/                  the full Serenity Skill (MIT, from muxuuu/serenity-skill)
│   ├── SKILL.md            methodology + behavior contract
│   ├── references/         evidence ladder, workflows, market playbooks…
│   ├── assets/             thesis template, scorecard JSON, prompt pack
│   ├── examples/           end-to-end demo analyses
│   └── scripts/            serenity_scorecard.py, validate_skill.py
└── src/
    ├── components/         Dashboard, TickerTable, AnalysisPanel, Charts…
    ├── components/ui/      shadcn-style primitives (button, card, tabs…)
    ├── lib/serenity/       scorecard + knowledge base + engine
    └── hooks/useData.ts    data loading with offline awareness
```

## Run locally

Requires Node 20+.

```bash
npm install
npm run process        # build mentions.json from the bundled tweets.json
npm run dev            # http://localhost:5173/SerenityStock/
```

Production build & preview:

```bash
npm run build          # type-checks, builds to dist/, generates SW + manifest
npm run preview        # serves dist/ at http://localhost:4173/SerenityStock/
```

Run the scraper locally (needs a Playwright browser):

```bash
npx playwright install chromium
npm run scrape         # updates public/data/tweets.json
npm run process        # rebuild mentions.json
```

Run the Claude-API deep analysis locally (optional):

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run analyze        # writes public/data/analyses.json for the top tickers
```

Or run everything: `npm run pipeline`.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. **Settings → Pages → Source: GitHub Actions.**
3. Push to `main` (or run the *Deploy to GitHub Pages* workflow manually).
   The site appears at `https://<user>.github.io/<repo>/`.
4. Optional: add an `ANTHROPIC_API_KEY` repository secret
   (**Settings → Secrets and variables → Actions**) to enable Claude-powered
   analyses in the daily pipeline.
5. The *Update data* workflow runs daily at 06:30 UTC (or on demand via *Run
   workflow*); its data commit automatically triggers a Pages redeploy.

The Vite `base` defaults to `/SerenityStock/` and is set from the repo name in
CI. For a custom domain or a root site, build with `BASE_PATH=/ npm run build`.

## Customize

| What | Where |
|---|---|
| Tracked account | `SERENITY_HANDLE` env var for `scripts/scrape.mjs` (also update the workflow + UI copy) |
| Scrape depth / retention | `SCROLL_ROUNDS`, `MAX_TWEETS` env vars |
| Ticker blacklist & sentiment lexicon | `scripts/lib/text.mjs` |
| Analysis knowledge base | `src/lib/serenity/knowledge.ts` — add tickers with layer, factors (0–5), penalties, evidence, risks |
| Scorecard weights | `src/lib/serenity/scorecard.ts` (keep in sync with `skill/scripts/serenity_scorecard.py`) |
| How many tickers get API analysis | `ANALYZE_TOP_N` env var for `scripts/analyze.mjs` |
| Theme | CSS variables in `src/index.css`, Tailwind tokens in `tailwind.config.js` |
| Schedule | cron in `.github/workflows/update-data.yml` |

## Scraper reliability notes

- Playwright loads the real profile page with human-ish scroll pacing; if X
  blocks or changes markup, the scraper falls back to the public **syndication
  endpoint** used by embedded timelines.
- If both methods fail, the run exits **without touching existing data** — the
  site keeps serving the last good dataset.
- New tweets are merged and deduped by ID; stats refresh on re-scrape; storage
  is capped at 500 tweets.
- Scraping X may violate its Terms of Service and can break at any time; use
  respectfully, keep the daily cadence, and prefer the official API if you have
  access.

## The Serenity Skill integration

The complete skill lives in [`skill/`](skill/) (MIT license, attribution in
`skill/LICENSE`). It is used in three ways:

1. **In-app simulated engine** — `src/lib/serenity/` implements the skill's
   research workflow shape (chain → scarce layer → evidence → risks → next
   checks) and ports the bottleneck scorecard math exactly:
   `Σ(rating/5 × weight) − 2 × penalties`, clamped 0–100, with the same verdict
   thresholds (85/70/55).
2. **Claude API runner** — `scripts/analyze.mjs` loads `SKILL.md` plus the
   evidence-ladder and deep-research references as the system prompt and asks
   Claude for a structured single-company challenge per top ticker.
3. **Reference UI** — the *Skill* tab documents the workflow, bundled files,
   weights, and the skill's risk boundary.

## License

- App code: MIT.
- `skill/` contents: MIT, © the serenity-skill authors
  ([muxuuu/serenity-skill](https://github.com/muxuuu/serenity-skill)).
- Not affiliated with @aleabitoreddit or X Corp.
