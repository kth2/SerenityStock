# Theme Radar & Periodic Digest

Answers "**what has Serenity been focused on lately, and what changed?**" from
the scraped feed — weekly and monthly.

It is a **reading list, not a buy list**. That framing is a design decision, not
a disclaimer bolted on afterwards (see §3).

## 1. Two layers

**Layer 1 — deterministic (no LLM, no API key, works offline).**
Built in the pipeline by `scripts/lib/themes.mjs`, committed into
`public/data/mentions.json` under `periods`:

- every post is classified into supply-chain themes by keyword (a post can
  touch several; unmatched posts are counted as `unclassified`, never forced
  into a bucket)
- rolled up per ISO week and per calendar month
- each theme carries `posts`, `share`, `deltaShare` vs the previous period, and
  a `trend` verdict
- per-ticker theme attribution so the UI can say "AAOI — optics, networking"

**Layer 2 — optional narrative (exactly one LLM call).**
`src/lib/insights/digest.ts` reads the deterministic figures and writes the
interpretation: what shifted, which scarce layer that implies, what to research
first, and what would falsify the read. It uses the existing BYOK config, so no
model name is hardcoded.

## 2. The quadrant board

`src/lib/insights/priorities.ts` deliberately does **not** compute a blended
score. It plots two independent axes:

```
             bottleneck score →
  attention  ┌──────────────┬──────────────┐
     ↑       │   crowded    │   priority   │
             │ popular, but │ discussed +  │
             │  weak grip   │ scores well  │
             ├──────────────┼──────────────┤
             │  background  │    quiet     │
             │              │ scores well, │
             │              │ under-talked │
             └──────────────┴──────────────┘
```

Attention comes from the deterministic signal score; bottleneck from
`scorecard.ts`. Names outside the curated knowledge base only have a generic
scaffold score, so they are shown separately as **"not yet researched"** rather
than ranked as if their score were verified.

## 3. Why not a buy list

Ranking by mention count would **invert the Serenity methodology**:

- mention counts are **evidence-ladder tier 4** (social = lead generation, never
  proof of a thesis);
- the method's core claim is that attention concentrates in the **visible**
  layer, which is rarely the **scarce** one — so heavy discussion is a reason to
  *check* a name, not to favour it. The "crowded" bucket exists to make that
  visible rather than hide it;
- there are no verified fundamentals, no position sizing, and no risk profile
  in this app.

The digest prompt states all of this explicitly and forbids buy/sell language,
price targets, and allocations.

## 4. Sample-size honesty

A week here is roughly 20–35 posts; one busy day about one stock can dominate.
So:

- sample size (`posts` / `mentions`) is shown next to every period;
- a period below `minSample` posts is flagged `thin`, and the UI shows a warning;
- a **rising/cooling verdict is only issued when both the current and previous
  period clear the minimum** — otherwise the trend is reported as `thin` rather
  than invented. A theme absent last period is `new`, not `rising`;
- the digest prompt is told the sample is small and instructed to say so.

## 5. Files

| File | Role |
|---|---|
| `scripts/lib/themes.mjs` | Taxonomy, classification, weekly/monthly rollups |
| `scripts/process.mjs` | Emits `periods` into `mentions.json` |
| `src/lib/insights/priorities.ts` | Quadrant board (attention × bottleneck) |
| `src/lib/insights/digest.ts` | Optional 1-call AI narrative |
| `src/components/ThemeRadar.tsx` | Dashboard UI |
| `scripts/tests/themes.test.mjs` | 26 assertions incl. the honesty guard |

Lives in the **Dashboard** tab rather than a sixth tab — the phone tab bar is
already at its five-tab limit at 320px.

## 6. Limitations

- Keyword classification is coarse; a post about optics that never says
  "optical" lands in `unclassified`.
- History only goes back as far as the scraper has been accumulating.
- Sentiment is a small lexicon, so it informs nothing here beyond the ticker
  aggregates.
- The narrative layer is one LLM pass over aggregates — it cannot verify
  anything, and every claim still needs primary sources.
