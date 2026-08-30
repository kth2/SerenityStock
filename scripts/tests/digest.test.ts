import { generatePeriodInsight } from "@/lib/insights/digest";
let pass=0, fail=0;
const ok=(n:string,c:boolean,x="")=>{ if(c){pass++;console.log(`  ✓ ${n}`);} else {fail++;console.log(`  ✗ ${n} ${x}`);} };
const period: any = { key:"2026-W35", from:"2026-08-24", to:"2026-08-28", posts:20, mentions:29, unclassified:6, thin:false,
  themes:[{id:"optics",title:"Optics",posts:6,share:.3,prevPosts:4,deltaShare:.05,trend:"rising"}],
  topTickers:[{ticker:"NVDA",count:8,themes:["optics"]}], newTickers:["POET"] };
const board: any = { rows:[], priority:[{ticker:"NVDA",periodMentions:8,signalScore:69,bottleneckScore:63}],
  crowded:[{ticker:"AAOI",periodMentions:3,signalScore:74,bottleneckScore:26}], quiet:[], needsResearch:[] };
const cfg: any = {protocol:"openai", baseUrl:"https://x/v1", apiKey:"k", model:"m"};

console.log("\n== digest: happy path ==");
{
  const good = JSON.stringify({headline:"h",attentionShift:"a",impliedScarceLayer:"l",
    researchPriorities:[{ticker:"NVDA",why:"w",nextCheck:"c"}],crowdedWarnings:["cw"],contrarian:"co",falsifiers:["f"]});
  let calls=0;
  (globalThis as any).fetch = async (u:string)=>{ if(!String(u).includes("/chat/completions")) return {ok:false,status:403,text:async()=>"",json:async()=>({})};
    calls++; return {ok:true,status:200,json:async()=>({choices:[{message:{content:good}}]})}; };
  const r = await generatePeriodInsight(cfg, period, board, "weekly");
  ok("one call on success", calls===1, `calls=${calls}`);
  ok("parsed", r.headline==="h" && r.researchPriorities[0].ticker==="NVDA" && !r.degraded);
}

console.log("\n== digest: truncated then salvaged (no retry needed) ==");
{
  const partial = '{"headline":"Optics led the week","attentionShift":"Semis rose","impliedScarceLayer":"pack';
  let calls=0;
  (globalThis as any).fetch = async (u:string)=>{ if(!String(u).includes("/chat/completions")) return {ok:false,status:403,text:async()=>"",json:async()=>({})};
    calls++; return {ok:true,status:200,json:async()=>({choices:[{finish_reason:"length",message:{content:partial}}]})}; };
  const r = await generatePeriodInsight(cfg, period, board, "weekly");
  ok("salvaged without a second call", calls===1, `calls=${calls}`);
  ok("keeps complete fields", r.headline==="Optics led the week" && r.attentionShift==="Semis rose", JSON.stringify(r).slice(0,120));
  ok("not marked degraded", !r.degraded);
}

console.log("\n== digest: unsalvageable -> compact retry ==");
{
  const compactGood = JSON.stringify({headline:"short",attentionShift:"s",impliedScarceLayer:"l",
    researchPriorities:[{ticker:"MU",why:"w",nextCheck:"c"}],falsifiers:["f"]});
  let calls=0;
  (globalThis as any).fetch = async (u:string, init:any)=>{ if(!String(u).includes("/chat/completions")) return {ok:false,status:403,text:async()=>"",json:async()=>({})};
    calls++;
    const compact = JSON.stringify(JSON.parse(init.body)).includes("ONE short sentence\\\",\\\"attentionShift\\\":\\\"1 sentence");
    if (!compact) return {ok:true,status:200,json:async()=>({choices:[{finish_reason:"length",message:{content:"garbage no braces"}}]})};
    return {ok:true,status:200,json:async()=>({choices:[{message:{content:compactGood}}]})};
  };
  const r = await generatePeriodInsight(cfg, period, board, "weekly");
  ok("retried with a compact ask", calls===2, `calls=${calls}`);
  ok("compact result used", r.headline==="short" && r.researchPriorities[0].ticker==="MU", JSON.stringify(r).slice(0,120));
  ok("not degraded after successful retry", !r.degraded);
}

console.log("\n== digest: total failure stays graceful ==");
{
  (globalThis as any).fetch = async (u:string)=>{ if(!String(u).includes("/chat/completions")) return {ok:false,status:403,text:async()=>"",json:async()=>({})};
    return {ok:false,status:401,headers:{get:()=>null},json:async()=>({error:{message:"bad key"}})}; };
  const r = await generatePeriodInsight(cfg, period, board, "weekly");
  ok("returns degraded instead of throwing", r.degraded===true);
  ok("explains why", /API key/i.test(r.attentionShift), r.attentionShift);
}
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
