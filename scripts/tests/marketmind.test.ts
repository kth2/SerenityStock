import { SimulationCallBudget, MAX_CALLS } from "@/lib/marketmind/budget";
import { validateReaction, LocalMarketMindEngine } from "@/lib/marketmind/engine";
import { aggregate, hasConverged } from "@/lib/marketmind/aggregate";
import { buildSeed } from "@/lib/marketmind/seed";
import { AGENTS } from "@/lib/marketmind/agents";
import type { AgentReaction } from "@/lib/marketmind/types";

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, extra = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
}

console.log("\n== budget ==");
{
  const b = new SimulationCallBudget(25);
  b.recorder("serenity")(); b.recorder("agent")(); b.recorder("agent")(); b.recorder("synthesis")();
  ok("counts by kind", b.serenityCalls===1 && b.agentCalls===2 && b.synthesisCalls===1);
  ok("total", b.totalCalls===4, `got ${b.totalCalls}`);
  ok("canSpend within cap", b.canSpend(21) === true);
  ok("canSpend beyond cap", b.canSpend(22) === false);
  const snap = b.snapshot();
  ok("snapshot shape", snap.maximumCalls===25 && snap.totalCalls===4);
  const full = new SimulationCallBudget(2);
  full.spend("agent"); full.spend("agent");
  ok("spend refuses past cap", full.spend("agent") === false);
}

console.log("\n== validateReaction (malformed input must never throw) ==");
{
  const bad = [null, undefined, 42, "string", [], {}, {stance:"MOON",conviction:"99",horizon:"decade"}];
  let threw = false;
  for (const b of bad) { try { validateReaction(b, "retail"); } catch { threw = true; } }
  ok("never throws on garbage", !threw);
  const r = validateReaction({stance:"MOON", conviction: 99, horizon:"decade", triggers:"nope", risks:[1,2,"real"]}, "retail");
  ok("unknown stance -> neutral", r.stance==="neutral");
  ok("conviction clamped 0-5", r.conviction===5, `got ${r.conviction}`);
  ok("unknown horizon -> days", r.horizon==="days");
  ok("non-array triggers -> []", Array.isArray(r.triggers) && r.triggers.length===0);
  ok("filters non-strings in arrays", r.risks.length===1 && r.risks[0]==="real");
  ok("empty response flagged degraded", validateReaction({}, "value").degraded === true);
  const good = validateReaction({stance:"bullish",conviction:4,horizon:"weeks",action:"buy dips",rationale:"x",triggers:["a"],risks:["b"]}, "value");
  ok("valid response not degraded", good.degraded === undefined && good.stance==="bullish");
}

console.log("\n== aggregate ==");
{
  const mk = (agent: any, stance: any, conviction: number, horizon: any = "days", degraded = false): AgentReaction =>
    ({agent, stance, conviction, horizon, action:"a", triggers:["shared trigger"], risks:["shared risk"], rationale:"r", ...(degraded?{degraded:true}:{})});
  const allBull = AGENTS.map(a => mk(a.id, "bullish", 4));
  const s1 = aggregate(allBull, 1);
  ok("unanimous consensus = 1", s1.consensus===1, `got ${s1.consensus}`);
  ok("netBias positive", s1.netBias > 0.7, `got ${s1.netBias}`);
  ok("avgConviction", s1.avgConviction===4);
  ok("dedupes triggers across agents", s1.topTriggers.length===1);
  ok("converges when confident+unanimous", hasConverged(s1)===true);

  const split = AGENTS.map((a,i) => mk(a.id, i%2 ? "bullish":"bearish", 3));
  const s2 = aggregate(split, 1);
  ok("split netBias ~0", Math.abs(s2.netBias) < 0.01, `got ${s2.netBias}`);
  ok("split does not converge", hasConverged(s2)===false);

  // Critical: a fully-degraded round looks unanimous+neutral but is meaningless
  const degraded = AGENTS.map(a => mk(a.id, "neutral", 0, "days", true));
  const s3 = aggregate(degraded, 1);
  ok("degraded round counted", s3.degradedCount===6);
  ok("degraded round must NOT converge", hasConverged(s3)===false);
}

console.log("\n== buildSeed ==");
{
  const ticker: any = {kind:undefined, ticker:"AAOI", companyName:"Applied Opto", finalScore:78, verdict:"High research priority",
    whatItConstrains:"optics", chainPosition:"module", marketMayMiss:"m", scarceLayers:["Modules & subsystems"],
    evidence:[{claim:"c",source:"s",strength:"primary"}], weakeners:["w1","w2"], nextChecks:["n1"]};
  const s = buildSeed("AAOI", ticker, false);
  ok("ticker kind", s.kind==="ticker");
  ok("carries scorecard verbatim", s.bottleneckScore===78 && s.verdict==="High research priority");
  ok("evidence graded", s.evidence[0].includes("[primary]"));
  const theme: any = {kind:"theme", title:"AI CPO", systemChange:"x", layers:[{name:"L1",rationale:"r",scarcity:3}],
    priorities:[{ticker:"X",name:"n",role:"controls",whyRanked:"w",score:70,verdict:"v"}], popularButLower:[], evidencePaths:["e"], risks:["r"], nextChecks:["n"]};
  ok("theme kind", buildSeed("AI CPO", theme, true).kind==="theme");
  const cmp: any = {kind:"comparison", query:"a", ranked:[ticker]};
  ok("comparison kind", buildSeed("A, B", cmp, false).kind==="comparison");
}

console.log("\n== engine end-to-end (stubbed provider) ==");
// NOTE: the engine also makes NON-LLM fetches (best-effort live quotes). Only
// requests to the chat endpoint are LLM calls, so the budget must match those.
function stubProvider(conviction: number) {
  const agentJson = JSON.stringify({stance:"bullish",conviction,horizon:"days",action:"a",triggers:["t"],risks:["r"],rationale:"because"});
  const synthJson = JSON.stringify({headline:"h",cascade:[{actor:"Retail",effect:"chases"}],bull:{narrative:"b",conditions:["c"]},base:{narrative:"n",conditions:[]},bear:{narrative:"x",conditions:[]},keyRisks:["k"],watchItems:["w"],reflexivity:"rf"});
  const counter = { llm: 0, other: 0 };
  (globalThis as any).fetch = async (url: string, init: any) => {
    const isLlm = String(url).includes("/chat/completions");
    if (!isLlm) { counter.other++; return { ok:false, status:403, text: async()=>"", json: async()=>({}) }; }
    counter.llm++;
    const isSynth = JSON.stringify(JSON.parse(init.body)).includes("Synthesize the simulation");
    return { ok:true, status:200, json: async () => ({ choices:[{message:{content: isSynth ? synthJson : agentJson}}] }) };
  };
  return counter;
}
{
  // conviction 3 => unanimous but not confident enough => NO early stop => full run
  const c = stubProvider(3);
  const cfg: any = {protocol:"openai", baseUrl:"https://x/v1", apiKey:"k", model:"test-model"};
  const engine = new LocalMarketMindEngine({config: cfg});
  const rep = await engine.run({query:"AAOI"});   // AAOI is curated => 0 Serenity calls
  ok("engine available", engine.isAvailable());
  ok("6 stage-1 reactions", rep.stage1.length===6);
  ok("stage 2 ran (agreement without conviction)", rep.stage2!==null && rep.stage2.length===6);
  ok("agent calls = 12", rep.budget.agentCalls===12, `got ${rep.budget.agentCalls}`);
  ok("serenity calls = 0 for curated ticker", rep.budget.serenityCalls===0, `got ${rep.budget.serenityCalls}`);
  ok("synthesis call = 1", rep.budget.synthesisCalls===1);
  ok("total = 13 (<= 15 target)", rep.budget.totalCalls===13, `got ${rep.budget.totalCalls}`);
  ok("total <= hard max", rep.budget.totalCalls<=MAX_CALLS);
  ok("budget == observed LLM fetches", c.llm===rep.budget.totalCalls, `llm=${c.llm} budget=${rep.budget.totalCalls}`);
  ok("non-LLM fetches excluded from budget", c.other>0);
  ok("no apiKey field anywhere in report", !JSON.stringify(rep).includes("apiKey"));
  ok("provider descriptor is protocol+model only", Object.keys(rep.provider).sort().join()==="model,protocol");
  ok("synthesis parsed", rep.synthesis.headline==="h" && rep.synthesis.cascade.length===1);
  ok("stopReason complete", rep.stoppedEarly==="complete", `got ${rep.stoppedEarly}`);
  console.log(`     → full run: ${rep.budget.totalCalls} LLM calls`);
}
{
  // conviction 5 => strong convergence => early stop skips stage 2
  const c = stubProvider(5);
  const cfg: any = {protocol:"openai", baseUrl:"https://x/v1", apiKey:"k", model:"test-model"};
  const rep = await new LocalMarketMindEngine({config: cfg}).run({query:"AAOI"});
  ok("early stop: stage2 skipped", rep.stage2===null);
  ok("early stop: reason converged", rep.stoppedEarly==="converged", `got ${rep.stoppedEarly}`);
  ok("early stop: 7 calls (6 agents + synthesis)", rep.budget.totalCalls===7, `got ${rep.budget.totalCalls}`);
  ok("early stop: budget == observed LLM fetches", c.llm===rep.budget.totalCalls);
  console.log(`     → early-stop run: ${rep.budget.totalCalls} LLM calls`);
}

console.log("\n== engine degradation (provider always fails) ==");
{
  (globalThis as any).fetch = async () => ({ ok:false, status:429, json: async () => ({error:{message:"rate limited"}}) });
  const cfg: any = {protocol:"openai", baseUrl:"https://x/v1", apiKey:"k", model:"test-model"};
  const rep = await new LocalMarketMindEngine({config: cfg}).run({query:"AAOI"});
  ok("did not throw on total provider failure", true);
  ok("all reactions degraded", rep.stage1.every(r=>r.degraded));
  ok("report still renders synthesis fallback", rep.synthesis.degraded===true);
  ok("warnings surfaced", rep.warnings.length>0);
  ok("degraded round did NOT falsely converge", rep.stoppedEarly!=="converged", `stopped=${rep.stoppedEarly}`);
}


console.log("\n== transient failure retry (the 'high demand' fix) ==");
{
  // 503 twice, then success: the transport must retry and the agent must NOT degrade.
  let attempts = 0;
  const agentJson = JSON.stringify({stance:"bearish",conviction:4,horizon:"weeks",action:"a",triggers:["t"],risks:["r"],rationale:"ok"});
  (globalThis as any).fetch = async (url: string) => {
    if (!String(url).includes("/chat/completions")) return { ok:false, status:403, text:async()=>"", json:async()=>({}) };
    attempts++;
    if (attempts <= 2) return { ok:false, status:503, headers:{get:()=>null}, json: async()=>({error:{message:"This model is currently experiencing high demand."}}) };
    return { ok:true, status:200, json: async()=>({choices:[{message:{content:agentJson}}]}) };
  };
  const { callJson } = await import("@/lib/serenity/ai");
  const cfg: any = {protocol:"openai", baseUrl:"https://x/v1", apiKey:"k", model:"m"};
  let retries = 0;
  const out: any = await callJson(cfg, "hi", { onRetry: () => { retries++; } });
  ok("retried past transient 503s", attempts===3, `attempts=${attempts}`);
  ok("onRetry fired per retry", retries===2, `retries=${retries}`);
  ok("succeeded after retry", out.stance==="bearish");
}
{
  // Permanent failure (401) must NOT be retried — retrying a bad key is waste.
  let attempts = 0;
  (globalThis as any).fetch = async (url: string) => {
    if (!String(url).includes("/chat/completions")) return { ok:false, status:403, text:async()=>"", json:async()=>({}) };
    attempts++;
    return { ok:false, status:401, headers:{get:()=>null}, json: async()=>({error:{message:"bad key"}}) };
  };
  const { callJson } = await import("@/lib/serenity/ai");
  const cfg: any = {protocol:"openai", baseUrl:"https://x/v1", apiKey:"k", model:"m"};
  let threw = "";
  try { await callJson(cfg, "hi", {}); } catch (e: any) { threw = e.message; }
  ok("401 not retried", attempts===1, `attempts=${attempts}`);
  ok("401 gives key-specific message", /API key/i.test(threw), threw);
}
{
  // Truncated output (finish_reason=length) must say so, not "no JSON".
  (globalThis as any).fetch = async (url: string) => {
    if (!String(url).includes("/chat/completions")) return { ok:false, status:403, text:async()=>"", json:async()=>({}) };
    return { ok:true, status:200, json: async()=>({choices:[{finish_reason:"length", message:{content:'{"stance":"bul'}}]}) };
  };
  const { callJson } = await import("@/lib/serenity/ai");
  const cfg: any = {protocol:"openai", baseUrl:"https://x/v1", apiKey:"k", model:"m"};
  let threw = "";
  try { await callJson(cfg, "hi", {}); } catch (e: any) { threw = e.message; }
  ok("truncation reported clearly", /output space/i.test(threw), threw);
}
{
  // Engine-level: provider overloaded throughout -> retries counted, actionable hint.
  (globalThis as any).fetch = async (url: string) => {
    if (!String(url).includes("/chat/completions")) return { ok:false, status:403, text:async()=>"", json:async()=>({}) };
    return { ok:false, status:503, headers:{get:()=>null}, json: async()=>({error:{message:"This model is currently experiencing high demand."}}) };
  };
  const cfg: any = {protocol:"openai", baseUrl:"https://x/v1", apiKey:"k", model:"m"};
  const rep = await new LocalMarketMindEngine({config: cfg}).run({query:"AAOI"});
  ok("retries recorded in budget", rep.budget.retries > 0, `retries=${rep.budget.retries}`);
  ok("actionable throttling hint shown", rep.warnings.some(w=>/throttling or overloaded/i.test(w)), rep.warnings.join(" | "));
  ok("still produced a report", !!rep.synthesis);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail) process.exit(1);
