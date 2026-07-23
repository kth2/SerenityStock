// Lightweight EN/中文 internationalization: a context + a flat key→{en,zh}
// dictionary. Components call t("key") and re-render when the language toggles.
// The choice is persisted in localStorage. The deep-analysis *content* from the
// curated knowledge base stays English; AI mode is asked to reply in Chinese
// when zh is active (see analyze.ts / ai.ts).

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Lang = "en" | "zh";

const STORAGE_KEY = "serenity.lang.v1";

type Entry = { en: string; zh: string };

const DICT: Record<string, Entry> = {
  // Header
  "app.subtitle": {
    en: "supply-chain bottleneck research assistant",
    zh: "供应链卡点研究助手",
  },
  "app.updated": { en: "Updated", zh: "更新于" },
  "lang.toggle": { en: "中文", zh: "EN" },
  "badge.offline": { en: "Offline", zh: "离线" },
  "badge.sample": { en: "Sample data", zh: "示例数据" },

  // Tabs
  "tab.analyze": { en: "Analyze", zh: "分析" },
  "tab.dashboard": { en: "Dashboard", zh: "看板" },
  "tab.tickers": { en: "Tickers", zh: "个股" },
  "tab.skill": { en: "Skill", zh: "方法" },

  // Analyze hero
  "analyze.title": { en: "Analyze anything with the Serenity Skill", zh: "用 Serenity 方法分析任何标的" },
  "analyze.placeholder": {
    en: "Ticker, list of tickers, or theme — e.g. AAOI · neocloud stocks · AI CPO · robotics",
    zh: "股票代码、多个代码或主题 —— 例如 AAOI · 新云算力 · AI 光互连 · 机器人",
  },
  "analyze.button": { en: "Deep Analyze", zh: "深度分析" },
  "analyze.running": { en: "Running skill…", zh: "分析中…" },
  "analyze.researching": { en: "Researching…", zh: "研究中…" },
  "analyze.try": { en: "Try:", zh: "试试：" },
  "analyze.desc": {
    en: "Runs the bundled Serenity research workflow: value-chain breakdown → scarce-layer ranking → bottleneck scorecard → graded evidence → failure modes → next checks. One ticker = deep dive · several = ranked comparison · words = theme scan.",
    zh: "运行内置的 Serenity 研究流程：产业链拆解 → 稀缺环节排序 → 卡点评分 → 证据分级 → 失效条件 → 下一步核查。单个代码 = 深度分析 · 多个 = 排名对比 · 文字 = 主题扫描。",
  },
  "analyze.aiOn": { en: "AI research is on", zh: "AI 研究已开启" },
  "analyze.aiOnTail": {
    en: " — anything outside the built-in knowledge base is researched by your model.",
    zh: "—— 知识库以外的标的将由你的 AI 模型研究。",
  },
  "analyze.connectAi": { en: "Connect an AI model", zh: "连接 AI 模型" },
  "analyze.connectAiTail": {
    en: " to research names beyond the built-in list.",
    zh: "以研究内置名单以外的标的。",
  },
  "analyze.empty": {
    en: "Enter a ticker or theme above — or revisit a past analysis from the history panel.",
    zh: "在上方输入股票代码或主题 —— 或从历史面板重新查看过往分析。",
  },
  "analyze.aiNudge": {
    en: "This name isn't in the built-in knowledge base, so you're seeing the generic research scaffold.",
    zh: "该标的不在内置知识库中，因此显示的是通用研究框架。",
  },
  "analyze.aiNudgeCta": { en: "Connect a free AI model", zh: "连接一个免费 AI 模型" },
  "analyze.aiNudgeTail": { en: " to get a full researched analysis instead.", zh: "以获得完整的研究分析。" },
  "badge.aiUnverified": { en: "AI · unverified", zh: "AI · 未核实" },

  // Result kinds
  "kind.ticker": { en: "single company", zh: "单一公司" },
  "kind.comparison": { en: "comparison", zh: "对比" },
  "kind.theme": { en: "theme scan", zh: "主题扫描" },

  // History
  "history.title": { en: "Past analyses", zh: "历史分析" },
  "history.clear": { en: "Clear", zh: "清空" },
  "history.empty": {
    en: "Analyses are saved here (locally in your browser) with timestamps.",
    zh: "分析结果会带时间戳保存在这里（仅存于你的浏览器本地）。",
  },

  // Dashboard
  "dash.updated": { en: "Data updated", zh: "数据更新于" },
  "dash.refresh": { en: "Refresh", zh: "刷新" },
  "dash.refreshing": { en: "Refreshing…", zh: "刷新中…" },
  "dash.source": { en: "Source", zh: "来源" },
  "dash.trackingNote": {
    en: "Mention tracking is a best-effort background feature and may skip days. The Analyze tab works regardless.",
    zh: "提及追踪是尽力而为的后台功能，可能会漏掉某些天。分析功能不受影响。",
  },
  "stat.mentions": { en: "Tracked mentions", zh: "追踪到的提及" },
  "stat.mentionsSub": { en: "from {n} posts", zh: "来自 {n} 条帖子" },
  "stat.tickers": { en: "Tickers tracked", zh: "追踪的个股" },
  "stat.tickersSub": { en: "{n} new this week", zh: "本周新增 {n} 个" },
  "stat.week": { en: "Mentions (7d)", zh: "提及（7天）" },
  "stat.top": { en: "Most mentioned", zh: "提及最多" },
  "chart.freq": { en: "Mention frequency", zh: "提及频率" },
  "chart.freqSub": { en: "Ticker mentions per day, all tickers", zh: "每日个股提及数（全部）" },
  "chart.top": { en: "Top tickers", zh: "热门个股" },
  "chart.topSub": { en: "By mention count — tap a bar to open the ticker", zh: "按提及次数 —— 点击柱状条查看个股" },
  "feed.title": { en: "Latest mentions", zh: "最新提及" },
  "feed.sub": { en: "Most recent posts containing ticker symbols", zh: "最近含有股票代码的帖子" },
  "feed.source": { en: "Source", zh: "来源" },
  "digest.title": { en: "Weekly digest", zh: "每周摘要" },
  "digest.discussed": { en: "Most discussed", zh: "讨论最多" },
  "digest.new": { en: "New this week", zh: "本周新增" },
  "digest.nothing": { en: "Nothing yet", zh: "暂无" },

  // Sample banner
  "banner.sample": {
    en: "Showing sample data to demonstrate the app. The daily pipeline replaces this with live data on its first successful run.",
    zh: "当前显示的是用于演示的示例数据。每日数据流程在首次成功运行后会替换为实时数据。",
  },

  // Data unavailable
  "data.unavailable": { en: "Mention data unavailable", zh: "提及数据不可用" },
  "data.unavailableNote": {
    en: "The Analyze tab works without it. If this is a fresh clone, run npm run process to generate the data files.",
    zh: "分析功能不依赖此数据。若为全新克隆，请运行 npm run process 生成数据文件。",
  },

  // Scorecard / analysis section titles
  "sec.constrains": { en: "What exactly does it constrain?", zh: "它究竟卡住了哪个环节？" },
  "sec.chain": { en: "Value-chain breakdown", zh: "产业链拆解" },
  "sec.scorecard": { en: "Bottleneck scorecard", zh: "卡点评分卡" },
  "sec.evidence": { en: "Evidence (graded per the evidence ladder)", zh: "证据（按证据阶梯分级）" },
  "sec.marketMiss": { en: "What the market may be missing", zh: "市场可能没看清的地方" },
  "sec.weakeners": { en: "What could prove this wrong", zh: "什么情况说明判断错了" },
  "sec.nextChecks": { en: "Next verification steps", zh: "下一步核查" },
  "sec.systemChange": { en: "System change driving the theme", zh: "驱动该主题的系统性变化" },
  "sec.layers": { en: "Layers ranked first (scarcest at top)", zh: "先给环节排序（最稀缺在最上）" },
  "sec.priorities": { en: "Research priority list (not a buy list)", zh: "优先研究名单（不是买入名单）" },
  "sec.popularLower": { en: "Popular, but ranked lower", zh: "热门但排名较低" },
  "sec.evidencePaths": { en: "Where the evidence lives", zh: "证据在哪里核查" },
  "sec.themeWrong": { en: "What could prove the theme wrong", zh: "什么情况说明主题判断错了" },
  "sec.nextMoves": { en: "Next research moves", zh: "下一步研究动作" },

  // Live data
  "live.badge": { en: "live price attached", zh: "已附加实时价格" },
  "live.note": {
    en: "Recent price context was fetched and passed to the AI. Prices are indicative and may be delayed.",
    zh: "已获取近期价格并提供给 AI。价格仅供参考，可能有延迟。",
  },

  // Disclaimers
  "disc.research": {
    en: "Research support only — ranked research priorities, not a buy/sell recommendation. The trading decision is yours.",
    zh: "仅为研究支持 —— 提供优先研究排序，不构成买卖建议。交易决定由你自行做出。",
  },
};

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function loadLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "zh" || v === "en") return v;
    // Default to Chinese if the browser prefers it.
    if (typeof navigator !== "undefined" && /^zh/i.test(navigator.language)) return "zh";
  } catch {
    /* ignore */
  }
  return "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(loadLang());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => setLang(lang === "en" ? "zh" : "en"), [lang, setLang]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const entry = DICT[key];
      let s = entry ? entry[lang] : key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      return s;
    },
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, toggle, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
