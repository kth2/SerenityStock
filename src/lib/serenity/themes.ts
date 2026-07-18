// Theme-scan definitions for the Serenity engine, following SKILL.md's theme
// mode: rank the supply-chain layers before ranking companies, and always
// include at least one popular/obvious area that ranked lower with the reason.
//
// Candidate tickers reference the curated KNOWLEDGE base; scoring happens in
// engine.ts with the bottleneck scorecard.

export interface ThemeDef {
  id: string;
  title: string;
  keywords: string[]; // lowercase substrings matched against the query
  systemChange: string;
  layers: { name: string; rationale: string; scarcity: 0 | 1 | 2 | 3 }[];
  candidates: { ticker: string; role: string; whyRanked: string }[];
  popularButLower: { name: string; why: string }[];
  evidencePaths: string[];
  risks: string[];
  nextChecks: string[];
}

export const THEMES: ThemeDef[] = [
  {
    id: "neocloud",
    title: "Neocloud / GPU cloud & HPC conversions",
    keywords: ["neocloud", "neo cloud", "gpu cloud", "neoclouds", "bitcoin miner", "miner", "hpc"],
    systemChange:
      "AI labs need compute faster than hyperscalers can energize new campuses, so demand spills into anyone holding grid-connected, powered capacity today — including bitcoin miners converting sites to HPC hosting. The binding constraint moved from GPUs to megawatts.",
    layers: [
      { name: "Energized sites & grid interconnects", rationale: "Multi-year utility queues; owning a substation today cannot be replicated quickly — the true scarce layer", scarcity: 3 },
      { name: "Creditworthy long-term contracts", rationale: "A take-or-pay from a hyperscaler converts speculative MW into bankable cash flow; counterparty quality separates winners", scarcity: 2 },
      { name: "Datacenter construction & electrical supply chain", rationale: "Switchgear/transformer lead times gate delivery even after power is secured", scarcity: 2 },
      { name: "GPU allocation & fleet operations", rationale: "Scarce in bursts, but vendors allocate to funded buyers; operational maturity matters at scale", scarcity: 1 },
      { name: "Compute reselling / brokerage", rationale: "Lowest-moat layer; spot GPU rental commoditizes first as supply catches up", scarcity: 0 },
    ],
    candidates: [
      { ticker: "IREN", role: "controls the scarce layer", whyRanked: "Owns energized sites + interconnect pipeline outright; conversion optionality per contract" },
      { ticker: "CRWV", role: "controls scale in the operating layer", whyRanked: "Largest contracted GPU fleet; backlog quality vs leverage is the debate" },
      { ticker: "NBIS", role: "supplies the scarce layer, self-funded", whyRanked: "Cash-funded buildout avoids the sector's refinancing risk" },
      { ticker: "CIFR", role: "supplies the scarce layer", whyRanked: "Anchor hyperscaler hosting deal validates the site pipeline" },
      { ticker: "WULF", role: "supplies the scarce layer", whyRanked: "Very large announced TCV vs size; contract quality is the verification job" },
      { ticker: "APLD", role: "supplies the scarce layer", whyRanked: "Build-to-suit campuses; each signed lease de-risks, financing is the constraint" },
    ],
    popularButLower: [
      { name: "Pure GPU-rental marketplaces / compute brokers", why: "No control of power or contracts — the layer commoditizes first when supply normalizes" },
      { name: "Miners without announced HPC contracts", why: "Powered land is necessary but not sufficient; without a counterparty the optionality stays unpriced for good reason" },
    ],
    evidencePaths: [
      "8-K/press releases for hosting agreements: duration, counterparty, backstops, capex split",
      "10-Q: contracted backlog, customer concentration, debt maturity ladder",
      "Utility interconnection queues for claimed pipeline MW",
      "Financing terms of each raise (rate, dilution, covenants)",
    ],
    risks: [
      "GPU rental prices compress as hyperscaler self-build catches up",
      "TCV headlines that never convert to bankable revenue",
      "Dilution spirals funding capex ahead of cash flow",
      "A single counterparty walk-away re-rating the whole group",
    ],
    nextChecks: [
      "For each name: MW energized vs MW contracted-to-AI (the conversion ratio)",
      "Read one full hosting agreement 8-K — terms generalize across the group",
      "Track spot vs contracted GPU pricing monthly",
    ],
  },
  {
    id: "optics",
    title: "AI optical interconnect / CPO",
    keywords: ["cpo", "optic", "photonic", "transceiver", "interconnect", "800g", "1.6t", "co-packaged"],
    systemChange:
      "Cluster scale-out makes the network the bottleneck: every GPU generation doubles link speeds, forcing 800G→1.6T transitions and pulling co-packaged optics from research into roadmaps. Laser capacity and qualification cycles gate the ramp.",
    layers: [
      { name: "Laser dies & InP capacity", rationale: "Slowest to expand, yield-sensitive, few qualified fabs — the scarce layer", scarcity: 3 },
      { name: "Qualification slots at hyperscalers", rationale: "First to qualify at each speed grade locks sockets for years", scarcity: 2 },
      { name: "Precision optical manufacturing", rationale: "Few CMs can assemble at tolerance and scale (the Fabrinet layer)", scarcity: 2 },
      { name: "Module assembly", rationale: "More competitive; Chinese vendors compress pricing here first", scarcity: 1 },
      { name: "Copper alternatives (AEC/retimers)", rationale: "Adjacent layer that wins where optics are overkill — complements, not substitutes", scarcity: 1 },
    ],
    candidates: [
      { ticker: "COHR", role: "controls the scarce layer", whyRanked: "Vertical integration down to InP lasers — the hard-to-replicate piece" },
      { ticker: "FN", role: "controls the manufacturing layer", whyRanked: "Standard-agnostic: builds for every vendor, wins regardless of which module maker wins" },
      { ticker: "LITE", role: "supplies the scarce layer", whyRanked: "Laser chips + hyperscaler supply agreements shifting it toward captive capacity" },
      { ticker: "CRDO", role: "controls an adjacent chokepoint", whyRanked: "Copper reach at low power — the sweet spot widens with every speed bump" },
      { ticker: "ALAB", role: "supplies an adjacent layer", whyRanked: "Connectivity silicon with superlinear content growth, but concentration + multiple risk" },
      { ticker: "AAOI", role: "benefits from the trend", whyRanked: "Re-qualification story into a tight market — needs order evidence before ranking higher" },
    ],
    popularButLower: [
      { name: "Module-assembly pure plays", why: "The most visible layer but the least defensible — pricing compresses there first every cycle" },
    ],
    evidencePaths: [
      "Segment disclosure: datacom vs telecom revenue inflection",
      "Capacity-expansion capex specifics for InP in filings",
      "1.6T qualification timeline commentary in transcripts",
      "Hyperscaler supply-agreement announcements (take-or-pay?)",
    ],
    risks: [
      "CPO/LPO transition shrinking the pluggable market faster than expected",
      "Chinese optical vendors compressing module margins",
      "A capex digestion quarter at one or two hyperscalers",
    ],
    nextChecks: [
      "Compare InP capacity plans across COHR/LITE (supply response speed)",
      "Track which vendors pass 1.6T qualification first",
      "Watch FN utilization of newly built capacity",
    ],
  },
  {
    id: "power",
    title: "AI data-center power & grid",
    keywords: ["power", "grid", "electric", "switchgear", "transformer", "energy", "datacenter power", "data center power"],
    systemChange:
      "Gigawatt-scale AI campuses hit a grid built for slower growth: interconnection queues, transformer and switchgear lead times, and on-site power gear are now the longest lead-time items in the entire AI supply chain.",
    layers: [
      { name: "Grid interconnection & utility capacity", rationale: "Multi-year queues; nothing downstream matters until energization — the scarce layer", scarcity: 3 },
      { name: "Transformers & switchgear", rationale: "60+ week lead times, few qualified manufacturers, slow capacity response", scarcity: 3 },
      { name: "Power distribution & UPS inside the DC", rationale: "Tight and growing with rack density, but more suppliers than the grid layer", scarcity: 2 },
      { name: "Thermal management", rationale: "Liquid cooling shifting from optional to required; capacity tight", scarcity: 2 },
      { name: "Generation (nuclear/gas deals)", rationale: "Headline-heavy but long-dated; announcements outrun megawatts", scarcity: 1 },
    ],
    candidates: [
      { ticker: "POWL", role: "controls the scarce layer", whyRanked: "Engineered-to-order switchgear with structural backlog re-rating" },
      { ticker: "VRT", role: "controls the distribution/thermal layer", whyRanked: "Power + cooling with contracted backlog and a service-network moat" },
      { ticker: "MOD", role: "benefits from the trend", whyRanked: "Cooling exposure, but does not control the tight layer — evidence quality gap vs VRT" },
    ],
    popularButLower: [
      { name: "Nuclear/SMR story stocks", why: "The generation layer is real but decade-dated; announcements price in megawatts that don't exist yet" },
    ],
    evidencePaths: [
      "Backlog by end-market in filings (POWL, VRT)",
      "Peer commentary on lead times (Eaton, Schneider, ABB calls)",
      "Utility interconnection-queue data for DC projects",
    ],
    risks: [
      "Capex digestion pause compressing orders faster than backlog burns",
      "Large incumbents adding engineered-to-order capacity",
      "Grid constraints redirecting buildouts to other regions",
    ],
    nextChecks: [
      "Book-to-bill for POWL/VRT next quarter",
      "Transformer lead-time trend in trade press",
      "Any hyperscaler commentary on energization as the gating item",
    ],
  },
  {
    id: "memory",
    title: "HBM / memory bandwidth",
    keywords: ["hbm", "memory", "dram", "bandwidth"],
    systemChange:
      "Accelerator performance is bound by memory bandwidth, not FLOPs. HBM consumes ~3x wafer capacity per bit, has three qualified suppliers, and capacity is reserved years ahead — a structural tightening of the whole memory complex.",
    layers: [
      { name: "HBM supply (3-supplier oligopoly)", rationale: "Yield-limited, capacity-reserved, the classic bottleneck setup", scarcity: 3 },
      { name: "Advanced packaging (stacking/CoWoS)", rationale: "Every HBM stack needs TSV/bonding capacity that expands slowly", scarcity: 3 },
      { name: "Packaging metrology & inspection", rationale: "When yield is the constraint, defect-finding tools gate output", scarcity: 2 },
      { name: "Commodity DRAM/NAND", rationale: "Tightened indirectly as wafers shift to HBM — cyclical but supported", scarcity: 1 },
    ],
    candidates: [
      { ticker: "MU", role: "controls the scarce layer", whyRanked: "One of three HBM suppliers; sold-out capacity with filing-grade evidence" },
      { ticker: "ONTO", role: "supplies the scarce layer", whyRanked: "Packaging process control rides HBM capex regardless of which memory maker wins" },
      { ticker: "CAMT", role: "supplies the scarce layer", whyRanked: "Same layer as ONTO; announced-order aggregation is a leading indicator" },
    ],
    popularButLower: [
      { name: "Pure compute/GPU names as a memory play", why: "They consume the scarce layer rather than control it — the pricing power sits upstream" },
    ],
    evidencePaths: [
      "HBM sold-out commentary + bit-share targets in transcripts",
      "All three suppliers' capex allocation to HBM lines",
      "Customer prepayment / capacity-reservation disclosures",
    ],
    risks: [
      "DRAM cycle downturn overwhelming HBM mix",
      "Competitor yield breakthroughs normalizing supply",
      "Architecture shifts reducing HBM content per accelerator",
    ],
    nextChecks: [
      "MU HBM revenue mix next quarter",
      "SK Hynix/Samsung capacity announcements",
      "CoWoS-class capacity adds at foundries/OSATs",
    ],
  },
  {
    id: "cooling",
    title: "Liquid cooling / thermal",
    keywords: ["cooling", "thermal", "liquid cooling", "cdu"],
    systemChange:
      "Next-gen rack power density makes air cooling physically insufficient — liquid cooling transitions from optional to required, creating a new attach market with tight near-term capacity.",
    layers: [
      { name: "Cooling distribution units & loops", rationale: "Required attach for new racks; capacity and service networks tight", scarcity: 2 },
      { name: "Facility water/heat-rejection systems", rationale: "Site-level constraint interacting with permits and water rights", scarcity: 2 },
      { name: "Cold plates & manifolds", rationale: "Component layer scaling fast; more suppliers emerging", scarcity: 1 },
    ],
    candidates: [
      { ticker: "VRT", role: "controls the layer", whyRanked: "Contracted backlog + global service footprint — the evidence-quality leader" },
      { ticker: "MOD", role: "benefits from the trend", whyRanked: "Converted legacy capacity; re-rating depends on data-center mix continuing to climb" },
      { ticker: "CLS", role: "adjacent integrator", whyRanked: "Liquid-cooled rack integration know-how rides the transition" },
    ],
    popularButLower: [
      { name: "Small-cap cooling story stocks", why: "The transition is real but the skill demands contracted-backlog evidence — most have narrative only" },
    ],
    evidencePaths: [
      "Liquid-cooling attach commentary in VRT/hyperscaler calls",
      "Segment margins showing pricing power (or its absence)",
      "Reference designs for next-gen racks (what's required vs optional)",
    ],
    risks: [
      "Competitors scale manufacturing faster than the attach ramp",
      "A rack-architecture shift changing the cooling bill of materials",
    ],
    nextChecks: [
      "VRT thermal orders next quarter",
      "MOD data-center segment mix trajectory",
      "New entrants' capacity announcements",
    ],
  },
  {
    id: "networking",
    title: "AI networking / Ethernet",
    keywords: ["networking", "switch", "ethernet", "network", "infiniband"],
    systemChange:
      "GPU fleet utilization is set by the network fabric. Ethernet is taking AI back-end share from InfiniBand, and each cluster generation raises switching content per GPU.",
    layers: [
      { name: "Switch silicon", rationale: "Two-ish credible merchant vendors; long design cycles", scarcity: 2 },
      { name: "Network OS & validated designs", rationale: "The software/qualification moat (Arista's layer)", scarcity: 2 },
      { name: "Optics & cabling attach", rationale: "Rides every port shipped (see the optics theme)", scarcity: 2 },
      { name: "White-box assembly", rationale: "Commodity layer hyperscalers use for leverage", scarcity: 0 },
    ],
    candidates: [
      { ticker: "AVGO", role: "controls the silicon layer", whyRanked: "Merchant switch silicon + custom XPU — wins both outcomes" },
      { ticker: "ANET", role: "controls the systems layer", whyRanked: "EOS + hyperscaler design wins; white-box is the standing debate" },
      { ticker: "CRDO", role: "supplies the attach layer", whyRanked: "AECs/retimers scale with port speeds" },
      { ticker: "CLS", role: "supplies the build layer", whyRanked: "Hyperscaler networking programs with margin evidence" },
    ],
    popularButLower: [
      { name: "White-box assemblers", why: "Volume without pricing power — the classic 'benefits but doesn't control' profile" },
    ],
    evidencePaths: [
      "AI back-end revenue targets vs actuals (ANET)",
      "Ethernet vs InfiniBand share in cluster disclosures",
      "Custom-ASIC program announcements (AVGO)",
    ],
    risks: [
      "Hyperscaler in-housing of switching stacks",
      "InfiniBand holding share longer than Ethernet roadmaps assume",
    ],
    nextChecks: [
      "Next-gen cluster reference designs (who's in them)",
      "ANET customer-concentration disclosure",
      "Broadcom AI revenue guidance vs delivery",
    ],
  },
  {
    id: "robotics",
    title: "Robotics / humanoids",
    keywords: ["robot", "robotics", "humanoid", "actuator"],
    systemChange:
      "If humanoid/general robotics scales, demand concentrates in precision motion components with automotive-grade reliability — the layers with decades of process know-how and few qualified suppliers.",
    layers: [
      { name: "Precision reducers & harmonic drives", rationale: "Historically 1-2 dominant suppliers (mostly Japan-listed); long qualification", scarcity: 3 },
      { name: "High-density actuators & motors", rationale: "Design + magnet supply chain; hard to scale with quality", scarcity: 2 },
      { name: "Rare-earth magnets & materials", rationale: "Geopolitically concentrated supply; export-control sensitive", scarcity: 2 },
      { name: "Force/torque & vision sensors", rationale: "Growing supplier base; differentiated at the high end", scarcity: 1 },
      { name: "Robot integrators / humanoid OEMs", rationale: "The visible layer — crowded, capital-hungry, story-rich", scarcity: 0 },
    ],
    candidates: [],
    popularButLower: [
      { name: "Humanoid OEM story stocks", why: "The integrator layer is where the hype concentrates and the least scarce link in the chain — rank the reducers and magnets first" },
    ],
    evidencePaths: [
      "Reducer/actuator supplier order books (Japan/Taiwan filings — see the skill's market playbook)",
      "Rare-earth export policy and pricing data",
      "OEM bill-of-materials teardowns in trade press",
    ],
    risks: [
      "The humanoid ramp slipping years (the whole chain is demand-dated)",
      "Design substitution (e.g. planetary vs harmonic) shifting the scarce layer",
      "Export controls on magnets re-routing the chain",
    ],
    nextChecks: [
      "This theme's candidate universe is mostly non-US-listed — build it from the skill's market-source playbook (Japan/Korea/Taiwan filings) before ranking companies",
      "Track one reducer maker's monthly orders as the theme's demand proxy",
    ],
  },
];

export function matchTheme(query: string): ThemeDef | null {
  const q = query.toLowerCase();
  let best: { def: ThemeDef; hits: number } | null = null;
  for (const def of THEMES) {
    const hits = def.keywords.filter((k) => q.includes(k)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { def, hits };
  }
  return best?.def ?? null;
}
