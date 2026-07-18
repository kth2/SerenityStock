import { useCallback, useEffect, useState } from "react";
import type { AnalysisResult, StoredAnalysis } from "@/types";

const KEY = "serenity.analysisHistory.v1";
const MAX_ENTRIES = 50;

function load(): StoredAnalysis[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredAnalysis[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(entries: StoredAnalysis[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* storage full/blocked — history is a convenience, not critical */
  }
}

function labelFor(result: AnalysisResult): string {
  if (result.kind === "theme") return result.title;
  if (result.kind === "comparison")
    return result.ranked.map((r) => `$${r.ticker}`).join(" vs ");
  return `$${result.ticker} — ${result.companyName}`;
}

export function useAnalysisHistory() {
  const [history, setHistory] = useState<StoredAnalysis[]>([]);

  useEffect(() => {
    setHistory(load());
  }, []);

  const save = useCallback((query: string, result: AnalysisResult) => {
    const entry: StoredAnalysis = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      query,
      kind: result.kind ?? "ticker",
      label: labelFor(result),
      createdAt: new Date().toISOString(),
      result,
    };
    setHistory((prev) => {
      // Replace an older entry for the same query (case-insensitive)
      const next = [
        entry,
        ...prev.filter((e) => e.query.toLowerCase() !== query.toLowerCase()),
      ].slice(0, MAX_ENTRIES);
      persist(next);
      return next;
    });
    return entry;
  }, []);

  const remove = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    persist([]);
  }, []);

  return { history, save, remove, clear };
}
