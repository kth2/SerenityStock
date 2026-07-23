import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysesData, MentionsData } from "@/types";

interface DataState {
  data: MentionsData | null;
  analyses: AnalysesData | null;
  loading: boolean;
  error: string | null;
  offline: boolean;
  /** True while a user-triggered refresh is in flight. */
  refreshing: boolean;
  /** Re-fetch the data files, bypassing the service-worker cache. */
  refresh: () => Promise<void>;
}

/**
 * Loads mentions.json (required) and analyses.json (optional, only present
 * when the Claude API step has run). The service worker caches both with a
 * NetworkFirst strategy, so this works offline after the first visit.
 *
 * `refresh()` lets the user pull the latest data on demand; it appends a
 * cache-busting query and asks fetch to skip the HTTP cache so a manual
 * refresh always reaches the network when online.
 */
export function useData(): DataState {
  const [state, setState] = useState<Omit<DataState, "refresh">>({
    data: null,
    analyses: null,
    loading: true,
    error: null,
    offline: !navigator.onLine,
    refreshing: false,
  });
  const cancelledRef = useRef(false);

  const load = useCallback(async (manual: boolean) => {
    const base = import.meta.env.BASE_URL;
    // Cache-bust on manual refresh so we bypass the SW/HTTP cache entirely.
    const bust = manual ? `?t=${Date.now()}` : "";
    const init: RequestInit | undefined = manual ? { cache: "reload" } : undefined;
    setState((s) => ({ ...s, refreshing: manual, error: manual ? s.error : null }));
    try {
      const [mentionsRes, analysesRes] = await Promise.all([
        fetch(`${base}data/mentions.json${bust}`, init),
        fetch(`${base}data/analyses.json${bust}`, init).catch(() => null),
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
      if (!cancelledRef.current) {
        setState((s) => ({
          ...s,
          data,
          analyses,
          loading: false,
          refreshing: false,
          error: null,
        }));
      }
    } catch (err) {
      if (!cancelledRef.current) {
        setState((s) => ({
          ...s,
          loading: false,
          refreshing: false,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    }
  }, []);

  const refresh = useCallback(() => load(true), [load]);

  useEffect(() => {
    cancelledRef.current = false;
    load(false);
    const onOnline = () => setState((s) => ({ ...s, offline: false }));
    const onOffline = () => setState((s) => ({ ...s, offline: true }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cancelledRef.current = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [load]);

  return { ...state, refresh };
}
