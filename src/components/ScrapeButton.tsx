import { useRef, useState } from "react";
import { Check, Eye, EyeOff, KeyRound, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  DEFAULT_REPO,
  dispatchScrape,
  GithubError,
  loadGhToken,
  loadRepo,
  saveGhToken,
  saveRepo,
  waitForRun,
  type RepoRef,
} from "@/lib/github";

type Phase = "idle" | "starting" | "scraping" | "building" | "reloading" | "done" | "error";

interface ScrapeButtonProps {
  onReload: () => Promise<void> | void;
  reloading: boolean;
}

export function ScrapeButton({ onReload, reloading }: ScrapeButtonProps) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // Token / repo config (localStorage-backed).
  const [token, setToken] = useState(loadGhToken);
  const [repo, setRepo] = useState<RepoRef>(loadRepo);
  const [tokenDraft, setTokenDraft] = useState("");
  const [repoDraft, setRepoDraft] = useState(`${repo.owner}/${repo.repo}`);
  const [showToken, setShowToken] = useState(false);

  const abortRef = useRef<{ aborted: boolean } | null>(null);
  const busy = phase !== "idle" && phase !== "done" && phase !== "error";

  async function run(tk: string, rf: RepoRef) {
    setError(null);
    const abort = { aborted: false };
    abortRef.current = abort;
    const since = Date.now();
    try {
      setPhase("starting");
      await dispatchScrape(tk, rf);
      setPhase("scraping");
      const dataRun = await waitForRun(tk, rf, "update-data.yml", since, () => {}, abort);
      if (dataRun.conclusion && dataRun.conclusion !== "success") {
        throw new GithubError(`Pipeline finished with: ${dataRun.conclusion}. See the Actions tab.`);
      }
      // Wait for the Pages deploy that the pipeline dispatches (best-effort:
      // if it doesn't appear, still try to reload after the data commit).
      setPhase("building");
      try {
        await waitForRun(tk, rf, "deploy.yml", since, () => {}, abort, 4 * 60_000);
      } catch {
        /* deploy poll is best-effort */
      }
      // Give the CDN a moment, then pull the fresh data.
      setPhase("reloading");
      await new Promise((r) => setTimeout(r, 4000));
      await onReload();
      setPhase("done");
      setTimeout(() => setPhase((p) => (p === "done" ? "idle" : p)), 5000);
    } catch (err) {
      if (abort.aborted) {
        setPhase("idle");
        return;
      }
      setError(err instanceof Error ? err.message : "Scrape failed.");
      setPhase("error");
    }
  }

  function onPrimaryClick() {
    if (busy) return;
    if (!token) {
      setTokenDraft("");
      setRepoDraft(`${repo.owner}/${repo.repo}`);
      setPanelOpen(true);
      return;
    }
    run(token, repo);
  }

  function saveAndRun() {
    const tk = tokenDraft.trim();
    const [owner, repoName] = repoDraft.split("/").map((s) => s.trim());
    const rf: RepoRef = owner && repoName ? { owner, repo: repoName } : DEFAULT_REPO;
    saveGhToken(tk);
    saveRepo(rf);
    setToken(tk);
    setRepo(rf);
    setPanelOpen(false);
    if (tk) run(tk, rf);
  }

  function forget() {
    saveGhToken("");
    setToken("");
    setPanelOpen(false);
  }

  const label =
    phase === "starting"
      ? t("scrape.starting")
      : phase === "scraping"
        ? t("scrape.scraping")
        : phase === "building"
          ? t("scrape.building")
          : phase === "reloading"
            ? t("scrape.reloading")
            : phase === "done"
              ? t("scrape.done")
              : t("scrape.run");

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {/* Quick data-only reload (no token needed). */}
        <button
          onClick={() => onReload()}
          disabled={busy || reloading}
          title={t("scrape.reload")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/50 px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", reloading && "animate-spin")} />
          <span className="hidden sm:inline">{t("scrape.reload")}</span>
        </button>

        {/* Primary: trigger the real scrape workflow. */}
        <button
          onClick={onPrimaryClick}
          disabled={busy}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-70",
            phase === "done"
              ? "border-bullish/50 bg-bullish/10 text-bullish"
              : phase === "error"
                ? "border-bearish/50 bg-bearish/10 text-bearish"
                : "border-primary/50 bg-primary/10 text-foreground hover:bg-primary/20",
          )}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : phase === "done" ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {phase === "error" ? t("scrape.run") : label}
        </button>

        {token && !busy && (
          <button
            onClick={() => {
              setTokenDraft("");
              setRepoDraft(`${repo.owner}/${repo.repo}`);
              setPanelOpen(true);
            }}
            title={t("scrape.tokenTitle")}
            className="text-muted-foreground hover:text-foreground"
          >
            <KeyRound className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {phase === "error" && error && (
        <p className="max-w-xs text-right text-[11px] text-bearish">{error}</p>
      )}
      {busy && <p className="text-[11px] text-muted-foreground">{t("scrape.note")}</p>}

      {/* Token / repo panel */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={() => setPanelOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">{t("scrape.tokenTitle")}</h2>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={t("scrape.cancel")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              {t("scrape.tokenIntro")}
            </p>
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-foreground/80">{t("scrape.tokenSecurity")}</p>
            </div>

            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t("scrape.repoLabel")}
            </label>
            <Input
              value={repoDraft}
              onChange={(e) => setRepoDraft(e.target.value)}
              placeholder="kth2/SerenityStock"
              className="mb-4 font-mono text-xs"
              spellCheck={false}
              autoCapitalize="none"
            />

            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t("scrape.tokenLabel")}
            </label>
            <div className="relative mb-4">
              <Input
                type={showToken ? "text" : "password"}
                value={tokenDraft}
                onChange={(e) => setTokenDraft(e.target.value)}
                placeholder="github_pat_…"
                className="pr-9 font-mono text-xs"
                spellCheck={false}
                autoCapitalize="none"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showToken ? "Hide" : "Show"}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={saveAndRun} disabled={!tokenDraft.trim()} className="gap-1.5">
                <Check className="h-4 w-4" /> {t("scrape.save")}
              </Button>
              {token && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={forget}
                  className="ml-auto text-muted-foreground"
                >
                  {t("scrape.forget")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
