import { useEffect, useState } from "react";
import type { AnalysesData, MentionsData } from "@/types";

interface DataState {
  data: MentionsData | null;
  analyses: AnalysesData | null;
  loading: boolean;
  error: string | null;
  offline: boolean;
}

/**
 * Loads mentions.json (required) and analyses.json (optional, only present
 * when the Claude API step has run). The service worker caches both with a
 * NetworkFirst strategy, so this works offline after the first visit.
 */
export function useData(): DataState {
  const [state, setState] = useState<DataState>({
    data: null,
    analyses: null,
    loading: true,
    error: null,
    offline: !navigator.onLine,
  });

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    let cancelled = false;

    async function load() {
      try {
        const [mentionsRes, analysesRes] = await Promise.all([
          fetch(`${base}data/mentions.json`),
          fetch(`${base}data/analyses.json`).catch(() => null),
        ]);
        if (!mentionsRes.ok) {
          throw new Error(`Failed to load data (HTTP ${mentionsRes.status})`);
        }
        const data = (await mentionsRes.json()) as MentionsData;
        let analyses: AnalysesData | null = null;
        if (analysesRes?.ok) {
          try {
            const parsed = (await analysesRes.json()) as AnalysesData;
            if (parsed && typeof parsed.analyses === "object") analyses = parsed;
          } catch {
            /* optional file, ignore parse errors */
          }
        }
        if (!cancelled) {
          setState((s) => ({ ...s, data, analyses, loading: false, error: null }));
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: err instanceof Error ? err.message : String(err),
          }));
        }
      }
    }

    load();
    const onOnline = () => setState((s) => ({ ...s, offline: false }));
    const onOffline = () => setState((s) => ({ ...s, offline: true }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return state;
}
