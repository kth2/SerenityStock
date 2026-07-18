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
