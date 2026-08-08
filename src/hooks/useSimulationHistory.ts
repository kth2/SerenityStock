import { useCallback, useEffect, useState } from "react";
import type { MarketMindReport, StoredSimulation } from "@/lib/marketmind/types";

const KEY = "serenity.marketmind.v1";
const MAX_ENTRIES = 30;

/**
 * MarketMind simulation history, mirroring useAnalysisHistory: localStorage
 * only, newest first, capped.
 *
 * Reports carry a provider descriptor (protocol + model) but NEVER an API key —
 * keys live solely in the AI settings entries. Writes are best-effort: a full
 * or blocked quota must not break a simulation.
 */
function load(): StoredSimulation[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredSimulation[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(entries: StoredSimulation[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* storage full/blocked — history is a convenience, not critical */
  }
}

export function useSimulationHistory() {
  const [history, setHistory] = useState<StoredSimulation[]>([]);

  useEffect(() => {
    setHistory(load());
  }, []);

  const save = useCallback((report: MarketMindReport) => {
    const entry: StoredSimulation = {
      id: report.id,
      query: report.query,
      createdAt: report.createdAt,
      report,
    };
    setHistory((prev) => {
      const next = [
        entry,
        ...prev.filter((e) => e.query.toLowerCase() !== report.query.toLowerCase()),
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
