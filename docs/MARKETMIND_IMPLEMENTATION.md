# MarketMind Simulator — Implementation Notes

MarketMind is a lightweight multi-agent **market scenario simulator** that runs
entirely inside the existing SerenityStock PWA.

> **SerenityStock answers "What is happening?"**
> **MarketMind answers "Given what is happening, how might different market
> participants react?"**

It is a *scenario* simulator, **not** a price prediction tool, and not investment
advice. It produces a structured "if this, then plausibly that" narrative with
explicit assumptions and falsifiers, in the same research-support spirit as the
Serenity Skill it sits on top of.

---

## 1. Existing architecture summary

Established facts about the repo MarketMind must fit into (verified by
inspection, not assumed):

**Stack.** React 18 + TypeScript + Vite 6 + Tailwind, `vite-plugin-pwa`
(`registerType: autoUpdate`). Deployed as a **static** GitHub Pages site under
base path `/SerenityStock/`. There is **no backend of any kind** — every runtime
feature is either precomputed JSON committed by GitHub Actions, or a direct
browser→provider `fetch`.

**No router.** Navigation is a local `useState` tab switch in `src/App.tsx`
using the minimal `components/ui/tabs.tsx` primitives (`analyze`, `dashboard`,
`tickers`, `skill`). No React Router, no global state library — state is local
`useState` plus custom hooks. MarketMind therefore adds a **tab**, not a route.

**Data layer.** `src/hooks/useData.ts` fetches the committed
`public/data/{mentions,analyses,quotes}.json` (service worker: NetworkFirst).
`scripts/*.mjs` produce those files in CI.

**LLM layer (BYOK) — `src/lib/serenity/ai.ts`.** This is the important one:

- `AiConfig = { protocol: "gemini" | "openai"; baseUrl; apiKey; model }`.
- `AI_PRESETS` — **Gemini is `AI_PRESETS[0]`, already the default preset**;
  also OpenRouter, Groq, OpenAI, Ollama, and a fully custom endpoint.
- Config in `localStorage` under `serenity.aiConfig.v2`; **per-endpoint keychain**
  under `serenity.aiKeys.v1` (each API URL remembers its own key).
- Two wire protocols cover ~every provider: `callGemini` (Google Generative
  Language API) and `callOpenAi` (OpenAI-compatible `/chat/completions`, with a
  one-shot retry without `response_format` for providers that reject JSON mode).
- `callModel` strips markdown fences and extracts the outermost JSON object.
- `AiError` carries user-friendly messages for 401 / 404 / 429 / CORS failures.
- Keys live **only** in the browser and are sent **only** to the user's chosen
  provider. Nothing is proxied or committed.

**Serenity Skill layer.**
- `src/lib/serenity/analyze.ts` — `analyzeQuery(raw, aggs, config, signal, lang)`
  routes per SKILL.md: 1 ticker → deep dive, several → comparison, words →
  theme scan. Curated names resolve **synchronously with zero LLM calls**;
  uncatalogued names go to the AI path and fall back to the local engine on error.
- `src/lib/serenity/engine.ts` — deterministic curated engine + `parseQuery`.
- `src/lib/serenity/scorecard.ts` — the canonical bottleneck math. **The LLM only
  supplies 0–5 ratings; the app computes the score.** MarketMind must not change this.
- `src/lib/serenity/livedata.ts` — best-effort keyless quotes appended to prompts.
- `skill/SKILL.md` + `skill/references/evidence-ladder.md` are bundled via
  `?raw` imports and form the Serenity system prompt.

**History pattern.** `src/hooks/useAnalysisHistory.ts` — localStorage, capped at
50, newest-first, dedupes by query. MarketMind's history mirrors this shape.

**i18n.** `src/lib/i18n.tsx` — `I18nProvider` + `useI18n()` returning
`{ lang, setLang, toggle, t }`, flat `en`/`zh` dictionary, persisted. When `zh`
is active the AI is additionally instructed to answer in Chinese.

### What this means for MarketMind

1. **Reuse, don't duplicate, the transport.** The CORS handling, JSON-mode
   retry, fence-stripping, and friendly error mapping in `ai.ts` are exactly
   what the agents need. The only blocker: `callModel` was private and
   hard-wired to the *Serenity* system prompt. Fixed by a minimal refactor
   (§4) — not by a second HTTP client.
2. **Reuse the Serenity analysis** as the simulation seed rather than
   re-deriving "what is happening".
3. **Add a tab**, matching the existing navigation model.

---

## 2. MarketMind architecture

```
User query
   │
   ▼
MarketMind UI  (src/components/MarketMindTab.tsx)
   │
   ▼
Serenity Skill  (analyzeQuery — curated = 0 calls, AI = 1 call)
   │
   ▼
MarketMind Seed  (src/lib/marketmind/seed.ts)
   │   compresses the Serenity analysis + live quote into a compact,
   │   token-cheap situation brief shared by all agents
   ▼
Stage 1 — 6 agents react independently            (6 calls)
   │
   ▼
Deterministic aggregation  (aggregate.ts — 0 calls)
   │   consensus, crowding, dispersion, dominant horizon, top triggers/risks
   │   └── strong convergence? ──► skip Stage 2 (early stop)
   ▼
Stage 2 — same 6 agents react to the aggregate    (6 calls)
   │   this is the reflexivity step: agents respond to other agents
   ▼
Deterministic aggregation  (0 calls)
   │
   ▼
Final synthesis                                    (1 call)
   │
   ▼
MarketMind Report  →  localStorage history
```

**Layering rule: MarketMind sits *on top of* the Serenity Skill and never
replaces it.** Serenity establishes the situation (the bottleneck thesis, the
scorecard, the evidence); MarketMind only explores participant *reactions* to
that situation. The scorecard math stays canonical and untouched.

### Engine abstraction

```ts
interface SimulationEngine {
  readonly id: string;
  isAvailable(): boolean;
  run(input: SimulationInput, hooks: SimulationHooks): Promise<MarketMindReport>;
}
```

- `LocalMarketMindEngine` — the in-browser implementation described above.
- `MiroFishRemoteEngine` — **not implemented**; the interface exists so a remote
  engine can be dropped in later without touching the UI (see §9).

---

## 3. Files created / modified

**Created**
| File | Purpose |
|---|---|
| `docs/MARKETMIND_IMPLEMENTATION.md` | This document |
| `src/lib/marketmind/types.ts` | All MarketMind types (agents, reactions, report, progress) |
| `src/lib/marketmind/budget.ts` | `SimulationCallBudget` — the single source of truth for call counts |
| `src/lib/marketmind/agents.ts` | The six participant personas + prompt builders |
| `src/lib/marketmind/seed.ts` | Serenity → MarketMind adapter (situation brief) |
| `src/lib/marketmind/aggregate.ts` | Deterministic aggregation + convergence detection (no LLM) |
| `src/lib/marketmind/engine.ts` | `SimulationEngine` interface + `LocalMarketMindEngine` |
| `src/hooks/useSimulationHistory.ts` | localStorage history (capped, key-free) |
| `src/components/MarketMindTab.tsx` | Mobile-first simulator UI + progress |
| `src/components/MarketMindReport.tsx` | Report rendering (timeline, cascade, scenarios) |

**Modified**
| File | Change |
|---|---|
| `src/lib/serenity/ai.ts` | Export `callJson` (generic JSON call with a caller-supplied system prompt); add `onCall` instrumentation. No change to Serenity behaviour. |
| `src/lib/serenity/analyze.ts` | Thread an optional `onLlmCall` callback so seed-stage calls are counted exactly. |
| `src/App.tsx` | Register the MarketMind tab. |
| `src/lib/i18n.tsx` | MarketMind EN/中文 strings. |

---

## 4. LLM call budget design

**Target ≤ 15 calls per simulation; hard maximum 25.**

| # | Stage | Calls |
|---|---|---|
| 1 | Serenity Skill analysis | 0 (curated) or 1 (AI research) |
| 2–7 | Stage 1 — six agents, initial reaction | 6 |
| — | Aggregation | **0** (deterministic, in-app) |
| 8–13 | Stage 2 — six agents, secondary reaction | 6 (skipped on early stop) |
| — | Aggregation | **0** |
| 14 | Final synthesis | 1 |
| | **Typical total** | **13–14** (curated seed → 13, AI seed → 14) |
| | **Early-stop total** | **7–8** |
| | **Hard cap** | **25** |

`SimulationCallBudget` records `serenityCalls`, `agentCalls`, `synthesisCalls`,
`totalCalls`, `maximumCalls`, and exposes `canSpend(n)` / `spend(kind, n)`.
Every LLM call in a simulation goes through it. When the cap is reached the run
**stops gracefully**: the engine finishes with whatever stages completed, marks
the report `stoppedEarly: "budget"`, and still renders a valid report rather than
throwing.

Exactness matters, so the count is *observed*, not estimated. `ai.ts` accepts an
optional `onCall` hook that fires per HTTP request to the provider; the seed
stage threads it through `analyzeQuery`, so a comparison query that internally
researches three tickets is counted as three calls, not one.

**Cost design for free tiers.** Two rounds (not N rounds); aggregation between
rounds is deterministic so no LLM is spent summarizing; the seed brief is
compressed to the fields agents actually need; agents get a small
`maxOutputTokens`; agent calls run with bounded concurrency (default 3) to stay
under per-minute rate limits, and a 429 degrades the agent to a fallback
reaction rather than failing the run.

---

## 5. Gemini integration approach

- **Gemini is the preferred/default provider**: `AI_PRESETS[0]` is Gemini and
  `loadAiConfig()` already migrates legacy Gemini-only configs. MarketMind reuses
  that stored `AiConfig` verbatim — if the user has not configured anything, the
  UI points them at the existing AI settings panel.
- **No model names are hardcoded anywhere in MarketMind.** The model identifier
  comes from `AiConfig.model`, which the user sets (or takes from a preset) in
  the existing settings UI. MarketMind never references `gemini-1.5-flash`,
  `gemini-2.0-flash`, or any other literal — model availability changes over
  time and the configuration system is the single source of truth.
- **Provider coverage** is inherited: `protocol: "gemini"` → Generative Language
  API; `protocol: "openai"` → any OpenAI-compatible endpoint (OpenRouter, Groq,
  OpenAI, local Ollama, custom). Anything the Analyze tab can talk to,
  MarketMind can talk to.
- **No API keys are ever hardcoded, committed, or written into history.**

---

## 6. Serenity Skill integration

The Serenity analysis is the *input*, never overwritten:

1. `analyzeQuery()` runs first, exactly as the Analyze tab does (same router,
   same curated/AI split, same fallback-on-error semantics).
2. `buildSeed()` compresses the result into a `SimulationSeed`: the subject, the
   one-line "what it constrains", chain position, the **bottleneck score and
   verdict computed by `scorecard.ts`**, scarce layers, the strongest evidence,
   the weakeners (which become the bear-case seeds), and the pending
   verification steps.
3. Live price context (`livedata.ts`) is attached when available, clearly
   labelled indicative/possibly-delayed.
4. Every agent prompt carries this same brief, so all six reason about one
   shared, Serenity-grounded situation.

The scorecard is **read-only** to MarketMind. Agent opinions never feed back
into the bottleneck score — that would corrupt the methodology.

---

## 7. Structured output + validation

Every agent returns strict JSON, validated and coerced before use:

```jsonc
{
  "stance": "bullish" | "bearish" | "neutral",
  "conviction": 0-5,
  "horizon": "intraday" | "days" | "weeks" | "months",
  "action": "one concrete action this participant would consider",
  "triggers": ["what would make them act"],
  "risks": ["what would make them wrong"],
  "rationale": "2-3 sentences in this persona's voice"
}
```

Validation rules: unknown `stance` → `neutral`; `conviction` clamped to 0–5;
unknown `horizon` → `days`; arrays filtered to strings and capped; missing
`rationale` → an explicit "no usable response" placeholder. A malformed or
failed call produces a **fallback reaction** flagged `degraded: true` — visible
in the UI — so **a bad JSON response can never crash a simulation**.

---

## 8. localStorage design

| Key | Contents | Cap |
|---|---|---|
| `serenity.marketmind.v1` | Simulation history (newest first) | 30 entries |

Each entry stores the query, timestamp, the full report, the final budget
counts, and a **provider descriptor** (`protocol` + `model` only).

**API keys are never written to history** — the key lives solely in the existing
`serenity.aiConfig.v2` / `serenity.aiKeys.v1` entries owned by the AI settings
panel. Writes are wrapped in try/catch: history is a convenience, and a full or
blocked quota must not break a simulation.

---

## 9. Future: remote MiroFish backend

The `SimulationEngine` interface is the seam. A future remote engine would:

1. Implement `SimulationEngine` as `MiroFishRemoteEngine` (`src/lib/marketmind/remote.ts`).
2. POST the `SimulationInput` to a user-configured endpoint and stream progress
   back through the same `SimulationHooks`.
3. Be selected by an engine picker in the MarketMind UI, defaulting to local.

Nothing in the UI or report rendering would change — they depend on
`MarketMindReport`, not on how it was produced. **No such backend is bundled,
required, or assumed today**; the app remains fully client-side per the project
constraints.

---

## 10. Known limitations

- Agents are **LLM role-play, not calibrated market models**. Output is a
  structured brainstorm of plausible reactions — no probabilities are implied
  and none should be inferred.
- No live order-flow, positioning, or options data. Price context is a single
  indicative quote.
- Two rounds capture first-order reflexivity only, not a full cascade.
- Quality tracks the configured model; small free-tier models give shallower
  personas.
- The simulator inherits the AI path's "no live web access" caveat: every claim
  is unverified until checked against the sources Serenity lists.
