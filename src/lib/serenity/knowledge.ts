// Curated supply-chain knowledge base used by the simulated Serenity engine.
// Layer taxonomy follows SKILL.md → "Map the value chain":
// downstream demand → system integrators → modules/subsystems → chips/devices
// → process & packaging → equipment & testing → materials & consumables
// → physical infrastructure.
//
// Ratings are 0-5 per the bottleneck scorecard (skill/assets/bottleneck-scorecard.json).
// This is methodology demonstration data, not live research — the UI labels it
// as a simulated skill run and every evidence item carries its ladder grade.

import type { ChainLayer, EvidenceItem } from "@/types";

export interface TickerKnowledge {
  name: string;
  theme: string;
  layer: string; // which chain layer the company sits in
  whatItConstrains: string;
  chainPosition: string;
  scarceLayers: string[];
  factors: Record<string, number>;
  factorNotes: Record<string, string>;
  penalties: Record<string, number>;
  marketMayMiss: string;
  evidence: EvidenceItem[];
  weakeners: string[];
  nextChecks: string[];
}

/** Generic AI-infrastructure value chain, annotated per company at runtime. */
export function buildAiInfraChain(
  companyLayer: string,
  scarceLayers: string[],
): ChainLayer[] {
  const layers: [string, string][] = [
    ["Downstream demand", "Hyperscalers and AI labs buying compute capacity"],
    ["System integrators", "Rack/cluster builders and server ODMs"],
    ["Modules & subsystems", "Optics, networking gear, power shelves, cooling loops"],
    ["Chips & devices", "GPUs/accelerators, memory, retimers, switch silicon"],
    ["Process & packaging", "Advanced packaging (CoWoS-class), HBM stacking"],
    ["Equipment & testing", "Fab/packaging equipment, metrology, inspection"],
    ["Materials & consumables", "Substrates, laminates, specialty materials"],
    ["Physical infrastructure", "Power delivery, grid connection, thermal, shell"],
  ];
  return layers.map(([layer, role]) => ({
    layer: layer === companyLayer ? `${layer} ◀ company` : layer,
    role,
    isScarce: scarceLayers.includes(layer),
  }));
}

export const KNOWLEDGE: Record<string, TickerKnowledge> = {
  VRT: {
    name: "Vertiv Holdings",
    theme: "AI data-center power & thermal",
    layer: "Physical infrastructure",
    whatItConstrains:
      "Power delivery and liquid-cooling capacity for high-density AI racks — the physical layer every deployment must pass through.",
    chainPosition:
      "Physical infrastructure: power management, thermal management, and cooling distribution for data centers.",
    scarceLayers: ["Physical infrastructure", "Modules & subsystems"],
    factors: {
      demand_inflection: 5, architecture_coupling: 4, chokepoint_severity: 4,
      supplier_concentration: 3, expansion_difficulty: 3, evidence_quality: 4,
      valuation_disconnect: 2, catalyst_timing: 4,
    },
    factorNotes: {
      demand_inflection: "AI rack densities force a power/thermal redesign of every new build",
      evidence_quality: "Contracted backlog and raised guidance are filing-grade evidence",
      valuation_disconnect: "Story is increasingly recognized; less mispricing left",
    },
    penalties: { hype_risk: 2, cyclicality: 2, alternative_design_risk: 1, dilution_financing: 0, governance: 0, geopolitics: 1, liquidity: 0, accounting_quality: 0 },
    marketMayMiss:
      "The service and installation network is the moat, not the hardware — competitors can copy a cooling unit but not a global field-service footprint on data-center timelines.",
    evidence: [
      { claim: "Reported backlog growth tied to AI infrastructure demand", source: "Company 10-Q / earnings release", strength: "primary" },
      { claim: "Liquid cooling shifting from optional to required at next-gen rack power", source: "Trade press + hyperscaler reference designs", strength: "analysis" },
      { claim: "Tracked account flags thermal capacity as sold out into next year", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "Hyperscalers standardize on in-house or competing thermal designs",
      "Data-center capex digestion phase compresses orders faster than backlog burns",
      "Margins revert as competitors scale liquid-cooling manufacturing",
    ],
    nextChecks: [
      "Backlog and book-to-bill in the next 10-Q",
      "Liquid-cooling attach rate commentary on the earnings call",
      "Competitor capacity announcements (thermal specialists, large industrials)",
    ],
  },

  POWL: {
    name: "Powell Industries",
    theme: "Grid connection & electrical distribution",
    layer: "Physical infrastructure",
    whatItConstrains:
      "Custom switchgear and power-control rooms — the grid-interconnection equipment with 60+ week lead times that gates when a data center can energize.",
    chainPosition:
      "Physical infrastructure: engineered-to-order electrical distribution between the utility and the facility.",
    scarceLayers: ["Physical infrastructure"],
    factors: {
      demand_inflection: 4, architecture_coupling: 3, chokepoint_severity: 5,
      supplier_concentration: 4, expansion_difficulty: 4, evidence_quality: 4,
      valuation_disconnect: 3, catalyst_timing: 3,
    },
    factorNotes: {
      chokepoint_severity: "Grid connection is repeatedly cited as the single hardest constraint in AI buildouts",
      expansion_difficulty: "Engineered-to-order manufacturing with skilled-labor limits; capacity responds slowly",
    },
    penalties: { cyclicality: 3, hype_risk: 1, liquidity: 1, alternative_design_risk: 1, dilution_financing: 0, governance: 0, geopolitics: 0, accounting_quality: 0 },
    marketMayMiss:
      "A historically oil-and-gas-cyclical name re-rating into a structural data-center/electrification story — the mix shift changes the multiple the business deserves.",
    evidence: [
      { claim: "Record backlog with growing data-center segment disclosure", source: "10-K/10-Q segment reporting", strength: "primary" },
      { claim: "Industry-wide switchgear and transformer lead times remain extended", source: "Utility trade publications, peer earnings calls", strength: "analysis" },
      { claim: "Tracked account reports gigawatt-scale projects in the bid pipeline", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "Large electrical incumbents add engineered-to-order capacity faster than expected",
      "Data-center order mix stalls and legacy oil & gas cyclicality reasserts",
      "Backlog conversion slips on skilled-labor shortages",
    ],
    nextChecks: [
      "Backlog by end-market in the next quarterly filing",
      "Commentary on lead times and pricing from peers (Eaton, Schneider, ABB)",
      "Utility interconnection-queue data for data-center projects",
    ],
  },

  MU: {
    name: "Micron Technology",
    theme: "HBM / memory bandwidth",
    layer: "Chips & devices",
    whatItConstrains:
      "High-bandwidth memory supply — one of only three qualified HBM suppliers globally, with capacity reserved by customers years ahead.",
    chainPosition:
      "Chips & devices: DRAM/NAND maker; HBM stacks feed directly into every leading AI accelerator.",
    scarceLayers: ["Chips & devices", "Process & packaging"],
    factors: {
      demand_inflection: 5, architecture_coupling: 5, chokepoint_severity: 4,
      supplier_concentration: 5, expansion_difficulty: 4, evidence_quality: 4,
      valuation_disconnect: 3, catalyst_timing: 4,
    },
    factorNotes: {
      supplier_concentration: "Three-supplier oligopoly (SK Hynix, Samsung, Micron)",
      architecture_coupling: "Memory bandwidth is the binding constraint of accelerator architecture",
      expansion_difficulty: "HBM consumes ~3x wafer capacity per bit vs standard DRAM; yield ramp is hard",
    },
    penalties: { cyclicality: 4, geopolitics: 2, hype_risk: 1, alternative_design_risk: 1, dilution_financing: 0, governance: 0, liquidity: 0, accounting_quality: 0 },
    marketMayMiss:
      "HBM structurally tightens commodity DRAM supply too — the scarce layer bleeds into the whole memory complex, muting the historical cycle trough.",
    evidence: [
      { claim: "HBM capacity described as sold out for the calendar year", source: "Earnings call transcript", strength: "primary" },
      { claim: "HBM bit share targets and capex allocation to HBM lines", source: "Investor presentation / filings", strength: "primary" },
      { claim: "Tracked account frames HBM as classic three-supplier bottleneck", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "DRAM cycle downturn overwhelms HBM mix benefits",
      "Competitor yield breakthroughs normalize HBM supply faster than expected",
      "Architecture shift reduces HBM content per accelerator (e.g. larger on-chip SRAM)",
    ],
    nextChecks: [
      "HBM revenue mix and bit-share disclosure next quarter",
      "Capex plans of all three HBM suppliers (supply response speed)",
      "Customer prepayment / capacity-reservation disclosures",
    ],
  },

  ANET: {
    name: "Arista Networks",
    theme: "AI networking / Ethernet switching",
    layer: "Modules & subsystems",
    whatItConstrains:
      "High-performance Ethernet switching for AI clusters — the network fabric that determines how efficiently GPU fleets can be utilized.",
    chainPosition:
      "Modules & subsystems: data-center switching and routing atop merchant silicon, sold into hyperscalers.",
    scarceLayers: ["Modules & subsystems", "Chips & devices"],
    factors: {
      demand_inflection: 5, architecture_coupling: 4, chokepoint_severity: 3,
      supplier_concentration: 3, expansion_difficulty: 3, evidence_quality: 4,
      valuation_disconnect: 2, catalyst_timing: 3,
    },
    factorNotes: {
      chokepoint_severity: "Software (EOS) and validated designs are the constraint, not manufacturing",
      valuation_disconnect: "Widely-owned quality compounder; limited mispricing",
    },
    penalties: { hype_risk: 2, alternative_design_risk: 2, cyclicality: 2, dilution_financing: 0, governance: 0, geopolitics: 1, liquidity: 0, accounting_quality: 0 },
    marketMayMiss:
      "The debate anchors on switch share vs white-box, while attach of routing, automation software, and AI-tuned fabrics grows the revenue per cluster.",
    evidence: [
      { claim: "Hyperscaler AI back-end network design wins disclosed", source: "Earnings call transcript", strength: "primary" },
      { claim: "Ethernet gaining vs InfiniBand in AI back-end networks", source: "Industry analyses, standards-body roadmaps", strength: "analysis" },
      { claim: "Tracked account notes expanding AI routing attach story", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "A top customer moves switching fully in-house (white-box + Sonic-style stack)",
      "Customer concentration cuts both ways on any capex pause",
      "Merchant-silicon roadmap slips vs proprietary alternatives",
    ],
    nextChecks: [
      "Customer-concentration disclosure in the 10-K",
      "AI back-end revenue targets vs actuals each quarter",
      "White-box adoption signals in hyperscaler infrastructure papers",
    ],
  },

  COHR: {
    name: "Coherent Corp",
    theme: "Optical interconnect / datacom lasers",
    layer: "Modules & subsystems",
    whatItConstrains:
      "Indium-phosphide laser and 800G+ transceiver capacity — the photonics layer that links GPUs into clusters.",
    chainPosition:
      "Modules & subsystems with vertical integration down to III-V materials and lasers.",
    scarceLayers: ["Modules & subsystems", "Materials & consumables"],
    factors: {
      demand_inflection: 5, architecture_coupling: 4, chokepoint_severity: 4,
      supplier_concentration: 3, expansion_difficulty: 4, evidence_quality: 3,
      valuation_disconnect: 3, catalyst_timing: 3,
    },
    factorNotes: {
      expansion_difficulty: "InP capacity expansion is slow, capital-intensive, and yield-sensitive",
    },
    penalties: { dilution_financing: 1, cyclicality: 2, hype_risk: 1, alternative_design_risk: 2, governance: 1, geopolitics: 1, liquidity: 0, accounting_quality: 0 },
    marketMayMiss:
      "Vertical integration into indium phosphide is the scarce piece — module assemblers are replaceable, laser fabs are not.",
    evidence: [
      { claim: "Datacom transceiver revenue inflecting with 800G ramp", source: "10-Q segment disclosure", strength: "primary" },
      { claim: "Industry commentary that datacom lasers are supply-constrained", source: "Trade press, peer calls", strength: "media" },
      { claim: "Tracked account highlights InP capacity as the layer to watch", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "Co-packaged optics or LPO shrinks the pluggable-transceiver market",
      "Balance-sheet leverage limits capacity investment vs competitors",
      "Chinese optical vendors compress module pricing faster than mix improves",
    ],
    nextChecks: [
      "InP capacity-expansion capex specifics in filings",
      "1.6T qualification timelines vs competitors",
      "Debt paydown trajectory and segment margin bridge",
    ],
  },

  LITE: {
    name: "Lumentum Holdings",
    theme: "Optical interconnect / photonics",
    layer: "Modules & subsystems",
    whatItConstrains:
      "Datacom laser chips and high-speed transceivers feeding AI cluster interconnects.",
    chainPosition: "Modules & subsystems: photonic components and modules.",
    scarceLayers: ["Modules & subsystems"],
    factors: {
      demand_inflection: 4, architecture_coupling: 4, chokepoint_severity: 3,
      supplier_concentration: 3, expansion_difficulty: 3, evidence_quality: 3,
      valuation_disconnect: 3, catalyst_timing: 3,
    },
    factorNotes: {},
    penalties: { cyclicality: 2, hype_risk: 1, alternative_design_risk: 2, dilution_financing: 1, governance: 0, geopolitics: 1, liquidity: 0, accounting_quality: 0 },
    marketMayMiss:
      "Laser-chip supply agreements with hyperscalers signal a shift from merchant module sales to captive-capacity relationships — stickier than the market models.",
    evidence: [
      { claim: "Cloud/datacom revenue inflection in recent quarters", source: "10-Q segment disclosure", strength: "primary" },
      { claim: "Hyperscaler laser supply agreements reported", source: "Trade press", strength: "media" },
      { claim: "Appears in tracked account's optical-layer watchlist", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "Telecom segment drag persists longer than datacom growth can offset",
      "CPO transition led by competitors' silicon photonics",
      "Customer concentration in a few cloud accounts",
    ],
    nextChecks: [
      "Datacom vs telecom mix next quarter",
      "Announced capacity agreements and their take-or-pay terms",
      "Competitive position in 1.6T and CPO qualification",
    ],
  },

  FN: {
    name: "Fabrinet",
    theme: "Optical manufacturing services",
    layer: "System integrators",
    whatItConstrains:
      "Precision optical/electro-mechanical manufacturing capacity that nearly every optics vendor and some hyperscalers rely on.",
    chainPosition:
      "System integrator for optics: contract manufacturer with process know-how competitors struggle to replicate.",
    scarceLayers: ["System integrators", "Modules & subsystems"],
    factors: {
      demand_inflection: 4, architecture_coupling: 3, chokepoint_severity: 3,
      supplier_concentration: 4, expansion_difficulty: 3, evidence_quality: 4,
      valuation_disconnect: 2, catalyst_timing: 3,
    },
    factorNotes: {
      supplier_concentration: "Few CMs possess high-precision optical assembly capability at scale",
    },
    penalties: { hype_risk: 1, cyclicality: 2, alternative_design_risk: 1, geopolitics: 2, dilution_financing: 0, governance: 0, liquidity: 0, accounting_quality: 0 },
    marketMayMiss:
      "Standard-agnostic position: whichever optics vendor or interconnect standard wins, the manufacturing flows through the same floor — it's a picks-and-shovels play on the whole layer.",
    evidence: [
      { claim: "Revenue growth tracking 800G ramp with major customer concentration disclosed", source: "10-K / earnings releases", strength: "primary" },
      { claim: "New capacity buildings announced ahead of demand", source: "Company announcements", strength: "primary" },
      { claim: "Tracked account frames it as building for everyone", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "Largest customer insources or dual-sources assembly",
      "Thailand concentration (site/geopolitical risk)",
      "Optics pricing pressure flows through to CM margins",
    ],
    nextChecks: [
      "Customer-concentration percentages in the 10-K",
      "Utilization of newly-built capacity",
      "Any hyperscaler direct-engagement disclosures",
    ],
  },

  CRDO: {
    name: "Credo Technology",
    theme: "High-speed connectivity (AECs, retimers, SerDes)",
    layer: "Chips & devices",
    whatItConstrains:
      "Low-power high-speed copper reach — active electrical cables and retimers that keep intra-rack connectivity viable as speeds double.",
    chainPosition:
      "Chips & devices: SerDes IP, retimers, and active electrical cables.",
    scarceLayers: ["Chips & devices"],
    factors: {
      demand_inflection: 5, architecture_coupling: 4, chokepoint_severity: 3,
      supplier_concentration: 3, expansion_difficulty: 3, evidence_quality: 3,
      valuation_disconnect: 2, catalyst_timing: 4,
    },
    factorNotes: {
      catalyst_timing: "Rack-density transitions force cabling redesigns on a knowable cadence",
    },
    penalties: { hype_risk: 3, cyclicality: 2, alternative_design_risk: 2, liquidity: 1, dilution_financing: 0, governance: 0, geopolitics: 1, accounting_quality: 0 },
    marketMayMiss:
      "AECs displace both passive copper (reach limits) and short optics (power/cost) in a widening sweet spot as speeds rise — the niche grows with every rack generation.",
    evidence: [
      { claim: "Hyperscaler AEC deployments ramping across multiple customers", source: "Earnings call transcript", strength: "primary" },
      { claim: "Power-per-bit advantage cited in third-party teardowns", source: "Technical analyses", strength: "analysis" },
      { claim: "Tracked account: 'can answer what it constrains in one sentence'", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "Optics cost/power curve improves faster, shrinking the copper window",
      "Large silicon vendors bundle retimer functionality",
      "Valuation already prices years of flawless execution",
    ],
    nextChecks: [
      "Customer count and concentration trends each quarter",
      "Design-win to revenue conversion timing",
      "Competitor (Astera, Marvell, Broadcom) product-cycle roadmaps",
    ],
  },

  ALAB: {
    name: "Astera Labs",
    theme: "Connectivity silicon (PCIe/CXL retimers, fabric)",
    layer: "Chips & devices",
    whatItConstrains:
      "Signal-integrity silicon between accelerators, memory, and CPUs — retimers and smart fabric that scale with every added GPU.",
    chainPosition:
      "Chips & devices: purpose-built connectivity silicon for AI servers.",
    scarceLayers: ["Chips & devices"],
    factors: {
      demand_inflection: 5, architecture_coupling: 5, chokepoint_severity: 3,
      supplier_concentration: 3, expansion_difficulty: 3, evidence_quality: 3,
      valuation_disconnect: 1, catalyst_timing: 3,
    },
    factorNotes: {
      architecture_coupling: "Content grows superlinearly with accelerator count per rack",
      valuation_disconnect: "Richly valued; the layer logic is known to the market",
    },
    penalties: { hype_risk: 4, cyclicality: 2, alternative_design_risk: 2, liquidity: 1, dilution_financing: 1, governance: 0, geopolitics: 1, accounting_quality: 0 },
    marketMayMiss:
      "Risk runs the other way: heavy customer concentration and a premium multiple mean the market may be over-crediting rather than missing the story — the skill flags this as a hype-check case.",
    evidence: [
      { claim: "Revenue concentrated in a small number of hyperscaler customers", source: "10-Q customer-concentration disclosure", strength: "primary" },
      { claim: "Platform expansion from retimers into switch fabric announced", source: "Company announcements", strength: "primary" },
      { claim: "Tracked account flags concentration as the real risk", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "A lead customer designs retimer functionality out or dual-sources",
      "Multiple compresses toward semiconductor peers on any growth wobble",
      "Fabric products fail to convert against entrenched switch vendors",
    ],
    nextChecks: [
      "10-Q customer-concentration percentages trend",
      "Fabric/switch product design-win disclosures",
      "Insider-transaction patterns post-lockup",
    ],
  },

  MOD: {
    name: "Modine Manufacturing",
    theme: "Data-center cooling",
    layer: "Modules & subsystems",
    whatItConstrains:
      "Air- and liquid-cooling hardware capacity for data centers, from a converted legacy auto-thermal manufacturing base.",
    chainPosition: "Modules & subsystems: thermal management hardware.",
    scarceLayers: ["Physical infrastructure", "Modules & subsystems"],
    factors: {
      demand_inflection: 4, architecture_coupling: 3, chokepoint_severity: 2,
      supplier_concentration: 2, expansion_difficulty: 2, evidence_quality: 3,
      valuation_disconnect: 3, catalyst_timing: 3,
    },
    factorNotes: {
      chokepoint_severity: "Benefits from the tight cooling layer but does not control it",
    },
    penalties: { hype_risk: 3, cyclicality: 3, alternative_design_risk: 2, dilution_financing: 0, governance: 0, geopolitics: 0, liquidity: 1, accounting_quality: 0 },
    marketMayMiss:
      "Per the skill's classification: 'benefits from the trend' rather than 'controls the scarce layer' — the re-rating depends on data-center mix continuing to climb, which deserves stress-testing rather than extrapolation.",
    evidence: [
      { claim: "Data-center segment growth disclosed in filings", source: "10-Q segment reporting", strength: "primary" },
      { claim: "Legacy vehicular business still a large share of revenue", source: "10-K", strength: "primary" },
      { claim: "Compared unfavorably to contracted-backlog peers by tracked account", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "Cooling capacity industry-wide catches up, removing scarcity pricing",
      "Legacy segments drag through an industrial downturn",
      "Larger thermal players out-invest in liquid cooling",
    ],
    nextChecks: [
      "Data-center segment mix and margin trajectory",
      "Order/backlog disclosure quality vs peers",
      "Capacity expansion announcements and their funding",
    ],
  },

  CLS: {
    name: "Celestica",
    theme: "AI rack-scale integration (EMS)",
    layer: "System integrators",
    whatItConstrains:
      "Rack-scale AI system integration capacity and hyperscaler-grade networking hardware programs.",
    chainPosition:
      "System integrators: EMS provider with hyperscaler networking and storage programs.",
    scarceLayers: ["System integrators"],
    factors: {
      demand_inflection: 4, architecture_coupling: 3, chokepoint_severity: 3,
      supplier_concentration: 3, expansion_difficulty: 3, evidence_quality: 4,
      valuation_disconnect: 3, catalyst_timing: 3,
    },
    factorNotes: {
      chokepoint_severity: "Integration know-how at rack scale is harder to commoditize than board assembly",
    },
    penalties: { cyclicality: 2, hype_risk: 2, alternative_design_risk: 2, dilution_financing: 0, governance: 0, geopolitics: 1, liquidity: 0, accounting_quality: 0 },
    marketMayMiss:
      "Sustained margin expansion is the tell that this is know-how, not commodity assembly — three quarters running of mix-driven margin gains contradict the 'it's just EMS' framing.",
    evidence: [
      { claim: "CCS segment margins expanding on AI program mix", source: "Quarterly filings", strength: "primary" },
      { claim: "Program wins with multiple hyperscalers", source: "Earnings call transcript", strength: "primary" },
      { claim: "Tracked account frames the durability question directly", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "Hyperscalers rotate programs to competing EMS on price",
      "ODM-direct models squeeze the integrator layer",
      "AI networking program pause at a top customer",
    ],
    nextChecks: [
      "Segment margin bridge next quarter",
      "New program win disclosures and customer breadth",
      "Peer commentary (Flex, Jabil) on AI program pricing",
    ],
  },

  ONTO: {
    name: "Onto Innovation",
    theme: "Advanced packaging metrology",
    layer: "Equipment & testing",
    whatItConstrains:
      "Inspection and metrology for advanced packaging — when HBM/CoWoS yield is the constraint, defect-finding tools gate output.",
    chainPosition: "Equipment & testing: process control for packaging and specialty devices.",
    scarceLayers: ["Equipment & testing", "Process & packaging"],
    factors: {
      demand_inflection: 4, architecture_coupling: 4, chokepoint_severity: 3,
      supplier_concentration: 4, expansion_difficulty: 3, evidence_quality: 3,
      valuation_disconnect: 3, catalyst_timing: 3,
    },
    factorNotes: {
      supplier_concentration: "Small number of credible packaging-metrology vendors",
    },
    penalties: { cyclicality: 3, hype_risk: 1, alternative_design_risk: 1, liquidity: 1, dilution_financing: 0, governance: 0, geopolitics: 1, accounting_quality: 0 },
    marketMayMiss:
      "Packaging process control grows faster than wafer-fab equipment overall because every new stacking step adds inspection points — a mix shift the broad semicap multiple doesn't capture.",
    evidence: [
      { claim: "Advanced-packaging revenue called out as record in recent quarters", source: "Earnings releases", strength: "primary" },
      { claim: "HBM stacking steps expand inspection intensity", source: "Technical/industry analyses", strength: "analysis" },
      { claim: "Paired with CAMT in tracked account's metrology watchlist", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "Packaging capex pauses after the initial HBM buildout wave",
      "Larger process-control vendors (KLA) push into the niche",
      "Customer concentration among a few OSATs/memory makers",
    ],
    nextChecks: [
      "Advanced-packaging revenue mix next quarter",
      "HBM supplier capex plans (their tools ride on it)",
      "Competitive win/loss anecdotes vs KLA and Camtek",
    ],
  },

  CAMT: {
    name: "Camtek",
    theme: "Advanced packaging inspection",
    layer: "Equipment & testing",
    whatItConstrains:
      "Inspection systems for HBM and advanced-packaging lines — the other half of the packaging process-control duopoly-like niche.",
    chainPosition: "Equipment & testing: inspection and metrology for packaging.",
    scarceLayers: ["Equipment & testing", "Process & packaging"],
    factors: {
      demand_inflection: 4, architecture_coupling: 4, chokepoint_severity: 3,
      supplier_concentration: 4, expansion_difficulty: 3, evidence_quality: 3,
      valuation_disconnect: 3, catalyst_timing: 3,
    },
    factorNotes: {},
    penalties: { cyclicality: 3, geopolitics: 2, hype_risk: 1, liquidity: 1, alternative_design_risk: 1, dilution_financing: 0, governance: 0, accounting_quality: 0 },
    marketMayMiss:
      "Order momentum from HBM lines is disclosed in discrete press releases the market under-aggregates — summing announced orders gives a leading indicator on the quarter.",
    evidence: [
      { claim: "Multiple announced order batches tied to HBM capacity", source: "Company press releases", strength: "primary" },
      { claim: "Inspection intensity rises with stacking layer count", source: "Technical analyses", strength: "analysis" },
      { claim: "Appears in tracked account's packaging-metrology pairing", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "HBM equipment digestion after front-loaded orders",
      "Geopolitical exposure (regional listing/operations) discounts the multiple",
      "Share loss to Onto/KLA in next-gen inspection",
    ],
    nextChecks: [
      "Aggregate announced orders vs consensus revenue",
      "Book-to-bill commentary next call",
      "HBM supplier capacity roadmaps",
    ],
  },

  AVGO: {
    name: "Broadcom",
    theme: "Custom AI silicon + networking",
    layer: "Chips & devices",
    whatItConstrains:
      "Custom accelerator (XPU) design capacity and merchant switch silicon — positioned to win whether hyperscalers buy GPUs or build their own.",
    chainPosition:
      "Chips & devices: custom ASICs, networking silicon, plus infrastructure software.",
    scarceLayers: ["Chips & devices", "Process & packaging"],
    factors: {
      demand_inflection: 5, architecture_coupling: 4, chokepoint_severity: 4,
      supplier_concentration: 4, expansion_difficulty: 4, evidence_quality: 4,
      valuation_disconnect: 2, catalyst_timing: 3,
    },
    factorNotes: {
      chokepoint_severity: "Few teams on earth can deliver frontier-class custom silicon programs",
    },
    penalties: { hype_risk: 2, cyclicality: 1, alternative_design_risk: 1, dilution_financing: 0, governance: 1, geopolitics: 2, liquidity: 0, accounting_quality: 0 },
    marketMayMiss:
      "The custom-vs-merchant debate is a false dichotomy for this position — both outcomes route through its silicon and its switch fabric; the market prices it as a directional bet rather than a toll booth.",
    evidence: [
      { claim: "Multi-customer XPU pipeline and AI revenue guidance", source: "Earnings call transcript", strength: "primary" },
      { claim: "Ethernet AI fabric share documented in hyperscaler designs", source: "Industry analyses", strength: "analysis" },
      { claim: "Tracked account frames it as benefiting either way", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "Custom-silicon programs slip or get cancelled by cost-conscious customers",
      "Software segment integration issues distract from silicon execution",
      "Regulatory/geopolitical action against a major customer relationship",
    ],
    nextChecks: [
      "AI revenue guidance vs delivery each quarter",
      "New XPU customer disclosures",
      "Networking share in next-gen cluster reference designs",
    ],
  },

  GLW: {
    name: "Corning",
    theme: "Glass substrates / optical fiber",
    layer: "Materials & consumables",
    whatItConstrains:
      "Specialty glass know-how relevant to next-gen glass-core substrates, plus fiber for data-center interconnects.",
    chainPosition: "Materials & consumables: glass, ceramics, and optical fiber.",
    scarceLayers: ["Materials & consumables"],
    factors: {
      demand_inflection: 3, architecture_coupling: 3, chokepoint_severity: 3,
      supplier_concentration: 4, expansion_difficulty: 4, evidence_quality: 2,
      valuation_disconnect: 3, catalyst_timing: 2,
    },
    factorNotes: {
      evidence_quality: "Glass-substrate thesis is early — mostly roadmap talk, little filed evidence",
    },
    penalties: { cyclicality: 2, hype_risk: 1, alternative_design_risk: 2, dilution_financing: 0, governance: 0, geopolitics: 1, liquidity: 0, accounting_quality: 0 },
    marketMayMiss:
      "Decades of precision-glass process knowledge filed mentally under 'TV screens' — if glass-core packaging substrates ship at scale, the qualified-supplier list is very short.",
    evidence: [
      { claim: "Fiber demand inflecting with data-center interconnect buildouts", source: "Earnings commentary", strength: "primary" },
      { claim: "Industry roadmaps put glass-core substrates in advanced packaging", source: "Trade press / consortium roadmaps", strength: "media" },
      { claim: "Tracked account explicitly labels it an early, unverified lead", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "Glass-core substrates stay niche or slip beyond the research window",
      "Display/consumer glass cyclicality dominates the mix",
      "Organic substrate improvements defer the transition",
    ],
    nextChecks: [
      "Any capacity or customer-qualification announcements for glass substrates",
      "Packaging-roadmap presentations from major foundries/OSATs",
      "Enterprise fiber segment growth rate next quarter",
    ],
  },

  SMCI: {
    name: "Super Micro Computer",
    theme: "AI server ODM",
    layer: "System integrators",
    whatItConstrains:
      "Fast-turn AI server assembly — moves boxes at speed, but the scarce layers (GPUs, HBM, optics, power) sit upstream of it.",
    chainPosition: "System integrators: server design and assembly.",
    scarceLayers: ["Chips & devices", "Process & packaging"],
    factors: {
      demand_inflection: 4, architecture_coupling: 2, chokepoint_severity: 1,
      supplier_concentration: 1, expansion_difficulty: 2, evidence_quality: 2,
      valuation_disconnect: 2, catalyst_timing: 2,
    },
    factorNotes: {
      chokepoint_severity: "Assembly capacity is expandable; allocation of upstream parts is the real gate",
      supplier_concentration: "Many credible competitors (Dell, HPE, ODM-directs)",
    },
    penalties: { hype_risk: 4, accounting_quality: 3, cyclicality: 2, alternative_design_risk: 2, governance: 2, dilution_financing: 1, liquidity: 0, geopolitics: 1 },
    marketMayMiss:
      "The skill's discipline cuts against the crowd here: volume growth without control of a scarce layer is a story, not a moat — margins are the referee and they argue for caution.",
    evidence: [
      { claim: "Revenue scale-up with AI server demand", source: "Filings", strength: "primary" },
      { claim: "Thin and volatile gross margins vs integration peers", source: "Filings", strength: "primary" },
      { claim: "Tracked account explicitly cautious on the crowded story", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "This is largely a bear-framed profile: the upside case requires durable margin proof",
      "Governance/reporting concerns resurfacing would compound the discount",
      "Customer shift to ODM-direct or competing integrators",
    ],
    nextChecks: [
      "Gross-margin trajectory vs Dell/HPE AI server lines",
      "Auditor and filing timeliness status",
      "Liquid-cooling attach as a differentiation claim — verify with customer evidence",
    ],
  },

  /* ------------------------- Neocloud universe -------------------------- */
  // The layer logic: what neoclouds actually control is energized, grid-
  // connected data-center capacity — powered land + interconnects — which is
  // the scarce input. GPUs are allocatable; megawatts are not.

  CRWV: {
    name: "CoreWeave",
    theme: "Neocloud / GPU cloud",
    layer: "System integrators",
    whatItConstrains:
      "Deployed, operational GPU capacity at hyperscale — contracted compute that AI labs can rent today instead of waiting quarters to build.",
    chainPosition:
      "System integrator: the largest pure-play GPU cloud, sitting between AI-lab demand and the power/GPU supply chain.",
    scarceLayers: ["Physical infrastructure", "System integrators"],
    factors: {
      demand_inflection: 5, architecture_coupling: 4, chokepoint_severity: 3,
      supplier_concentration: 3, expansion_difficulty: 4, evidence_quality: 4,
      valuation_disconnect: 2, catalyst_timing: 3,
    },
    factorNotes: {
      chokepoint_severity: "Operational maturity at scale is scarce, but compute itself is rentable from many parties",
      evidence_quality: "Contracted backlog / take-or-pay disclosures are filing-grade",
    },
    penalties: { dilution_financing: 4, hype_risk: 3, cyclicality: 2, governance: 1, accounting_quality: 1, alternative_design_risk: 2, liquidity: 0, geopolitics: 0 },
    marketMayMiss:
      "The debate fixates on debt and GPU depreciation while the contracted-backlog duration and counterparty quality determine whether the leverage is actually dangerous — read the contract terms, not the headline debt number.",
    evidence: [
      { claim: "Multi-billion contracted backlog with hyperscaler/AI-lab counterparties", source: "Filings / earnings releases", strength: "primary" },
      { claim: "Debt-financed GPU fleet with structured vehicles", source: "Filings", strength: "primary" },
      { claim: "Tracked account flagged the recent ER as bearish", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "GPU rental prices compress as hyperscaler capacity catches up",
      "A top-2 customer non-renews or renegotiates take-or-pay terms",
      "Refinancing cost spikes against depreciating collateral",
    ],
    nextChecks: [
      "Backlog duration and customer concentration in the latest 10-Q",
      "Debt maturity ladder vs contracted cash flows",
      "GPU rental spot-price trend vs contracted rates",
    ],
  },

  NBIS: {
    name: "Nebius Group",
    theme: "Neocloud / GPU cloud",
    layer: "System integrators",
    whatItConstrains:
      "Self-built AI cloud capacity backed by an unusually cash-rich balance sheet — capacity growth without the leverage most neoclouds carry.",
    chainPosition:
      "System integrator: full-stack AI cloud (own DCs, own software layer), ex-Yandex engineering base.",
    scarceLayers: ["Physical infrastructure", "System integrators"],
    factors: {
      demand_inflection: 5, architecture_coupling: 3, chokepoint_severity: 3,
      supplier_concentration: 3, expansion_difficulty: 3, evidence_quality: 4,
      valuation_disconnect: 3, catalyst_timing: 3,
    },
    factorNotes: {
      evidence_quality: "Anchor hyperscaler contract disclosed; balance sheet visible in filings",
    },
    penalties: { hype_risk: 3, dilution_financing: 2, governance: 2, cyclicality: 2, alternative_design_risk: 2, liquidity: 1, geopolitics: 1, accounting_quality: 0 },
    marketMayMiss:
      "Cash-funded expansion means the bear case that kills levered neoclouds (refinancing against depreciating GPUs) mostly doesn't apply — the market prices the sector as one homogeneous risk bucket.",
    evidence: [
      { claim: "Large multi-year capacity contract with a major hyperscaler", source: "Company announcement / filings", strength: "primary" },
      { claim: "Net-cash balance sheet funding DC buildout", source: "Filings", strength: "primary" },
      { claim: "Listed in tracked account's neocloud cheat sheet", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "Software/platform differentiation fails to hold pricing vs bare-metal rivals",
      "Ex-Yandex governance/geopolitical discount persists",
      "Capacity additions outrun contracted demand",
    ],
    nextChecks: [
      "Contracted vs merchant capacity mix next quarter",
      "Capex per MW vs peers (build efficiency)",
      "Any new anchor-customer announcements",
    ],
  },

  IREN: {
    name: "IREN (Iris Energy)",
    theme: "Neocloud / energized sites",
    layer: "Physical infrastructure",
    whatItConstrains:
      "Owned, energized, grid-connected sites with expansion headroom — the powered-land layer that gates every AI data-center buildout.",
    chainPosition:
      "Physical infrastructure: vertically integrated site owner (land, substations, power contracts) pivoting capacity from BTC mining to AI/HPC.",
    scarceLayers: ["Physical infrastructure"],
    factors: {
      demand_inflection: 4, architecture_coupling: 3, chokepoint_severity: 4,
      supplier_concentration: 3, expansion_difficulty: 4, evidence_quality: 3,
      valuation_disconnect: 3, catalyst_timing: 3,
    },
    factorNotes: {
      chokepoint_severity: "Grid interconnects take years; owning them is the moat",
      expansion_difficulty: "New entrants can't conjure substation capacity",
    },
    penalties: { hype_risk: 3, cyclicality: 3, dilution_financing: 3, alternative_design_risk: 1, governance: 1, liquidity: 1, geopolitics: 0, accounting_quality: 0 },
    marketMayMiss:
      "The market still partly prices it as a bitcoin miner; the value of secured megawatts is only recognized when an AI/HPC contract converts them — the re-rating happens per-contract, not per-narrative.",
    evidence: [
      { claim: "Hundreds of MW energized with multi-GW interconnect pipeline disclosed", source: "Investor presentations / filings", strength: "primary" },
      { claim: "AI cloud revenue segment emerging alongside mining", source: "Filings", strength: "primary" },
      { claim: "Listed in tracked account's neocloud cheat sheet", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "HPC contracts fail to materialize and capacity reverts to BTC economics",
      "Equity raises to fund GPUs dilute faster than contracts add value",
      "Interconnect timelines slip (utility-side risk)",
    ],
    nextChecks: [
      "MW energized vs contracted-to-AI split each update",
      "Announced HPC/colocation contract terms (duration, counterparty)",
      "Share count trajectory vs capacity growth",
    ],
  },

  APLD: {
    name: "Applied Digital",
    theme: "Neocloud / DC builder",
    layer: "Physical infrastructure",
    whatItConstrains:
      "Purpose-built AI data-center campuses (powered shells) leased to hyperscalers and neoclouds — the build-to-suit layer of the buildout.",
    chainPosition:
      "Physical infrastructure: designs, builds, and leases high-density campuses; tenants bring the GPUs.",
    scarceLayers: ["Physical infrastructure"],
    factors: {
      demand_inflection: 4, architecture_coupling: 3, chokepoint_severity: 3,
      supplier_concentration: 3, expansion_difficulty: 4, evidence_quality: 3,
      valuation_disconnect: 3, catalyst_timing: 3,
    },
    factorNotes: {},
    penalties: { dilution_financing: 4, hype_risk: 3, governance: 2, accounting_quality: 1, cyclicality: 2, liquidity: 1, alternative_design_risk: 1, geopolitics: 0 },
    marketMayMiss:
      "Lease agreements with credit-worthy anchors convert speculative shells into bond-like cash flows — each signed lease de-risks the story more than the stock's risk bucket implies.",
    evidence: [
      { claim: "Long-term lease agreements for AI campuses announced", source: "Company announcements / filings", strength: "primary" },
      { claim: "Heavy reliance on external financing for construction", source: "Filings", strength: "primary" },
      { claim: "Listed in tracked account's neocloud cheat sheet", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "Financing gap stalls construction mid-buildout",
      "Anchor tenant walks or renegotiates before occupancy",
      "Build-cost inflation compresses development yields",
    ],
    nextChecks: [
      "Signed-lease coverage of announced capacity",
      "Construction financing terms and dilution",
      "Delivery timelines vs guidance",
    ],
  },

  CIFR: {
    name: "Cipher Mining",
    theme: "Neocloud / HPC pivot",
    layer: "Physical infrastructure",
    whatItConstrains:
      "Energized sites converting from BTC mining to HPC hosting, validated by a hyperscaler-grade anchor deal.",
    chainPosition:
      "Physical infrastructure: site owner/operator with mining legacy and an HPC hosting pipeline.",
    scarceLayers: ["Physical infrastructure"],
    factors: {
      demand_inflection: 4, architecture_coupling: 3, chokepoint_severity: 3,
      supplier_concentration: 3, expansion_difficulty: 4, evidence_quality: 4,
      valuation_disconnect: 3, catalyst_timing: 4,
    },
    factorNotes: {
      evidence_quality: "An anchor hyperscaler hosting agreement is the strongest possible validation for a converting miner",
    },
    penalties: { hype_risk: 3, cyclicality: 3, dilution_financing: 3, governance: 1, liquidity: 1, alternative_design_risk: 1, geopolitics: 0, accounting_quality: 0 },
    marketMayMiss:
      "One blue-chip hosting agreement re-rates the entire remaining site pipeline: the market prices announced deals but not the now-higher probability of the next ones.",
    evidence: [
      { claim: "HPC hosting agreement with a major cloud counterparty", source: "Company announcement", strength: "primary" },
      { claim: "Tracked account called the ER positive on the strength of that deal", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "Remaining pipeline fails to convert and BTC economics dominate again",
      "Deal economics (hosting margins) prove thinner than the market assumes",
      "Financing for buildout dilutes aggressively",
    ],
    nextChecks: [
      "Contract terms in the 8-K/10-Q (duration, revenue, capex split)",
      "Next site-conversion announcements",
      "Hosting gross margin once reported",
    ],
  },

  WULF: {
    name: "TeraWulf",
    theme: "Neocloud / HPC hosting",
    layer: "Physical infrastructure",
    whatItConstrains:
      "Zero-carbon powered capacity converting to HPC hosting with very large announced contract value relative to its size.",
    chainPosition:
      "Physical infrastructure: energized sites (hydro/nuclear-adjacent power) hosting HPC tenants.",
    scarceLayers: ["Physical infrastructure"],
    factors: {
      demand_inflection: 4, architecture_coupling: 3, chokepoint_severity: 3,
      supplier_concentration: 3, expansion_difficulty: 4, evidence_quality: 3,
      valuation_disconnect: 3, catalyst_timing: 4,
    },
    factorNotes: {
      evidence_quality: "Large TCV announced; contract quality/backstops need verification against filings",
    },
    penalties: { dilution_financing: 4, hype_risk: 3, cyclicality: 2, governance: 1, liquidity: 1, alternative_design_risk: 1, geopolitics: 0, accounting_quality: 1 },
    marketMayMiss:
      "Announced total-contract-value figures dwarf the market cap, but TCV ≠ revenue — the spread between headline TCV and bankable, backstopped cash flow is where the thesis is decided either way.",
    evidence: [
      { claim: "Multi-billion TCV HPC capacity agreements announced (hundreds of MW)", source: "Company announcements", strength: "primary" },
      { claim: "Large financing raised for data-center expansion", source: "Company announcements / filings", strength: "primary" },
      { claim: "Tracked account: ER positive; deal financing the key confirmation", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "Counterparty or backstop weakness turns TCV into paper",
      "Buildout capex outruns financing capacity → dilution spiral",
      "Delivery slips push revenue right while interest accrues",
    ],
    nextChecks: [
      "Contract counterparties and any credit backstops in filings",
      "Financing terms (rate, dilution, covenants)",
      "MW delivered vs contracted each quarter",
    ],
  },

  AAOI: {
    name: "Applied Optoelectronics",
    theme: "Optical transceivers",
    layer: "Modules & subsystems",
    whatItConstrains:
      "Additional 800G transceiver supply into a tight optics market — a capacity supplier to the scarce layer rather than its controller.",
    chainPosition:
      "Modules & subsystems: vertically integrated (own laser fabs) transceiver maker re-entering hyperscaler datacom after years in CATV/access.",
    scarceLayers: ["Modules & subsystems"],
    factors: {
      demand_inflection: 4, architecture_coupling: 3, chokepoint_severity: 2,
      supplier_concentration: 2, expansion_difficulty: 3, evidence_quality: 2,
      valuation_disconnect: 3, catalyst_timing: 3,
    },
    factorNotes: {
      chokepoint_severity: "Supplies a tight layer but competes against larger, qualified incumbents",
      evidence_quality: "Qualification progress is mostly management commentary so far — verify with orders",
    },
    penalties: { hype_risk: 4, dilution_financing: 3, accounting_quality: 1, cyclicality: 2, liquidity: 1, alternative_design_risk: 2, governance: 1, geopolitics: 1 },
    marketMayMiss:
      "Cuts both ways: the market may be under-crediting a genuine 800G re-qualification at a top hyperscaler — or over-crediting a company with a long history of margin disappointment. The skill's answer: demand order evidence before ranking it above the incumbents.",
    evidence: [
      { claim: "800G products in qualification with hyperscaler customers", source: "Earnings call commentary", strength: "media" },
      { claim: "History of thin/volatile margins vs optics peers", source: "Filings", strength: "primary" },
    ],
    weakeners: [
      "Qualification slips or lands at low share/margins",
      "Incumbents (COHR/Innolight/Eoptolink) absorb the demand first",
      "Convertible/equity financing dilutes ahead of the ramp",
    ],
    nextChecks: [
      "Datacom revenue inflection in the next 10-Q (orders, not commentary)",
      "Customer concentration disclosure",
      "Gross-margin trajectory vs peers during the ramp",
    ],
  },

  NVDA: {
    name: "NVIDIA",
    theme: "AI accelerators / platform",
    layer: "Chips & devices",
    whatItConstrains:
      "The dominant AI compute platform — but per the skill, the binding constraints on its output sit upstream (CoWoS, HBM) and downstream (power).",
    chainPosition:
      "Chips & devices: GPU/accelerator design with a full-stack software moat (CUDA).",
    scarceLayers: ["Process & packaging", "Chips & devices", "Physical infrastructure"],
    factors: {
      demand_inflection: 5, architecture_coupling: 5, chokepoint_severity: 4,
      supplier_concentration: 5, expansion_difficulty: 4, evidence_quality: 5,
      valuation_disconnect: 1, catalyst_timing: 3,
    },
    factorNotes: {
      valuation_disconnect: "The most-watched stock on earth; the layer logic is fully priced",
      evidence_quality: "Filing-grade evidence is abundant and unambiguous",
    },
    penalties: { hype_risk: 3, geopolitics: 3, cyclicality: 2, alternative_design_risk: 2, dilution_financing: 0, governance: 0, liquidity: 0, accounting_quality: 0 },
    marketMayMiss:
      "Little is missed on the company itself; the skill's edge here is second-order — mapping which suppliers gate its output and which layers capture the next dollar of its customers' capex.",
    evidence: [
      { claim: "Data-center revenue and supply commentary in filings", source: "10-Q / earnings calls", strength: "primary" },
      { claim: "Packaging (CoWoS-class) capacity repeatedly cited as the gate", source: "Foundry earnings calls", strength: "primary" },
      { claim: "Tracked account uses it as the anchor for upstream-layer scans", source: "@aleabitoreddit mention (lead only)", strength: "social" },
    ],
    weakeners: [
      "Custom silicon takes meaningful workload share at top customers",
      "Export-control expansion cuts addressable market again",
      "AI capex digestion phase after the current buildout wave",
    ],
    nextChecks: [
      "Hyperscaler capex guidance (its demand signal)",
      "Foundry advanced-packaging capacity adds",
      "Custom-ASIC program disclosures at major customers",
    ],
  },
};
