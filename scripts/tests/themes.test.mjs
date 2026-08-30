#!/usr/bin/env node
// Tests for the deterministic period digest (scripts/lib/themes.mjs).
// Pure functions over synthetic posts — no network, no LLM.

import { classifyPost, isoWeekKey, monthKey, buildPeriodDigests, THEMES } from "../lib/themes.mjs";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n} ${x}`); } };

console.log("\n== classifyPost ==");
ok("optics keyword", classifyPost("new 800G transceiver ramp").includes("optics"));
ok("power keyword", classifyPost("grid interconnect and transformer lead times").includes("power"));
ok("multi-theme post", classifyPost("HBM memory for GPU cloud datacenter").length >= 2);
ok("no keyword -> unclassified", classifyPost("just some general market chatter").length === 0);
ok("case insensitive", classifyPost("ROBOT humanoid").includes("robotics"));
ok("handles empty/undefined", classifyPost("").length === 0 && classifyPost(undefined).length === 0);

console.log("\n== date keys ==");
ok("ISO week format", /^\d{4}-W\d{2}$/.test(isoWeekKey("2026-08-28T00:00:00Z")));
ok("month key", monthKey("2026-08-28T10:00:00Z") === "2026-08");
// Mon 2026-08-24 .. Sun 2026-08-30 must share a week; the next Mon must not.
const wkMon = isoWeekKey("2026-08-24T00:00:00Z");
ok("Mon..Sun same ISO week", wkMon === isoWeekKey("2026-08-30T23:00:00Z"), `${wkMon} vs ${isoWeekKey("2026-08-30T23:00:00Z")}`);
ok("next Monday is a new week", wkMon !== isoWeekKey("2026-08-31T00:00:00Z"));

console.log("\n== period aggregation ==");
{
  const mk = (day, text, id) => ({ id, text, createdAt: `${day}T12:00:00Z` });
  // Week A: 6 optics posts. Week B: 6 power posts. Big, unambiguous shift.
  const posts = [
    ...Array.from({ length: 6 }, (_, i) => mk("2026-08-17", "optical transceiver 800G", `a${i}`)),
    ...Array.from({ length: 6 }, (_, i) => mk("2026-08-24", "grid power transformer", `b${i}`)),
  ];
  const mentions = posts.map((p, i) => ({ ticker: i < 6 ? "AAOI" : "GEV", createdAt: p.createdAt, text: p.text }));
  const d = buildPeriodDigests(mentions, posts);
  ok("two weekly buckets", d.weekly.length === 2, `got ${d.weekly.length}`);
  const last = d.weekly[1];
  ok("bucket counts posts", last.posts === 6);
  ok("bucket counts mentions", last.mentions === 6);
  const power = last.themes.find((t) => t.id === "power");
  const optics = last.themes.find((t) => t.id === "optics");
  // 0 -> 6 is "new", which is more precise than "rising".
  ok("theme absent last period is 'new'", power && power.trend === "new", JSON.stringify(power));
  ok("optics cooling in week B", optics && optics.trend === "cooling", JSON.stringify(optics));
  ok("ticker themes attributed", last.topTickers[0].themes.includes("power"));
  ok("newTickers detects GEV", last.newTickers.includes("GEV"));
  ok("not flagged thin at 6 posts", last.thin === false);
}

console.log("\n== sample-size honesty (must NOT invent trends) ==");
{
  const mk = (day, text, id) => ({ id, text, createdAt: `${day}T12:00:00Z` });
  // 2 posts one week, 2 the next: below MIN_SAMPLE, so no trend verdict.
  const posts = [
    mk("2026-08-17", "optical transceiver", "a1"), mk("2026-08-17", "optical laser", "a2"),
    mk("2026-08-24", "grid power", "b1"), mk("2026-08-24", "power transformer", "b2"),
  ];
  const d = buildPeriodDigests([], posts);
  const last = d.weekly[1];
  ok("thin period flagged", last.thin === true);
  ok("every trend reported as thin, not rising/cooling",
     last.themes.every((t) => t.trend === "thin"),
     JSON.stringify(last.themes.map((t) => [t.id, t.trend])));
}

console.log("\n== unclassified tracking ==");
{
  const posts = [
    { id: "1", text: "optical transceiver", createdAt: "2026-08-24T12:00:00Z" },
    { id: "2", text: "unrelated chatter about nothing", createdAt: "2026-08-24T12:00:00Z" },
  ];
  const d = buildPeriodDigests([], posts);
  ok("counts posts matching no theme", d.weekly[0].unclassified === 1, `got ${d.weekly[0].unclassified}`);
}

console.log("\n== robustness ==");
{
  let threw = false;
  try {
    buildPeriodDigests([], []);
    buildPeriodDigests([], [{ id: "x", text: null, createdAt: "" }]);
    buildPeriodDigests([{ ticker: "X", createdAt: "2026-08-24T00:00:00Z", text: "" }], []);
  } catch { threw = true; }
  ok("empty/malformed input does not throw", !threw);
  ok("theme ids unique", new Set(THEMES.map((t) => t.id)).size === THEMES.length);
}


console.log("\n== 'rising' requires presence in BOTH periods ==");
{
  const mk = (day, text, id) => ({ id, text, createdAt: `${day}T12:00:00Z` });
  // Week A: 4 optics + 4 power. Week B: 6 optics + 1 power -> optics share up.
  const posts = [
    ...Array.from({ length: 4 }, (_, i) => mk("2026-08-17", "optical transceiver", `a${i}`)),
    ...Array.from({ length: 4 }, (_, i) => mk("2026-08-17", "grid power", `c${i}`)),
    ...Array.from({ length: 6 }, (_, i) => mk("2026-08-24", "optical transceiver", `b${i}`)),
    mk("2026-08-24", "grid power", "d0"),
  ];
  const d = buildPeriodDigests([], posts);
  const last = d.weekly[1];
  const optics = last.themes.find((t) => t.id === "optics");
  const power = last.themes.find((t) => t.id === "power");
  ok("share gain in both periods -> rising", optics && optics.trend === "rising", JSON.stringify(optics));
  ok("share loss in both periods -> cooling", power && power.trend === "cooling", JSON.stringify(power));
  ok("shares sum to ~1", Math.abs(last.themes.reduce((s, t) => s + t.share, 0) - 1) < 0.01);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail) process.exit(1);
