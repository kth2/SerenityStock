// Client-side trigger for the GitHub Actions data pipeline.
//
// A static GitHub Pages site has no backend, so the only way to start a real
// scrape from the page is to ask GitHub to dispatch the update-data workflow.
// That needs a token. Following the app's BYOK philosophy, the token lives
// ONLY in this browser's localStorage and is sent directly to api.github.com —
// never committed, proxied, or logged. Recommend a fine-grained PAT scoped to
// this one repo with just "Actions: read and write" so the blast radius is tiny.

const TOKEN_KEY = "serenity.ghToken.v1";
const REPO_KEY = "serenity.ghRepo.v1";

export interface RepoRef {
  owner: string;
  repo: string;
}

// Sensible default for this deployment; overridable in the UI (e.g. for forks).
export const DEFAULT_REPO: RepoRef = { owner: "kth2", repo: "SerenityStock" };

const WORKFLOW = "update-data.yml";
const DEPLOY_WORKFLOW = "deploy.yml";
const REF = "main";
const API = "https://api.github.com";

export function loadGhToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveGhToken(token: string) {
  try {
    if (token.trim()) localStorage.setItem(TOKEN_KEY, token.trim());
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked */
  }
}

export function loadRepo(): RepoRef {
  try {
    const raw = localStorage.getItem(REPO_KEY);
    if (raw) {
      const p = JSON.parse(raw) as RepoRef;
      if (p.owner && p.repo) return p;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_REPO;
}

export function saveRepo(ref: RepoRef) {
  try {
    localStorage.setItem(REPO_KEY, JSON.stringify(ref));
  } catch {
    /* storage blocked */
  }
}

export class GithubError extends Error {}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function ghFetch(url: string, token: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { ...headers(token), ...(init?.headers ?? {}) } });
  } catch {
    throw new GithubError(
      "Could not reach GitHub — check your connection. (The API must be reachable from your browser.)",
    );
  }
  if (res.status === 401)
    throw new GithubError("Invalid or expired GitHub token — check it in the scrape settings.");
  if (res.status === 403)
    throw new GithubError(
      "Token lacks permission (needs Actions: read & write on this repo) or you hit a rate limit.",
    );
  if (res.status === 404)
    throw new GithubError("Repo or workflow not found — check the owner/repo in scrape settings.");
  return res;
}

export interface WorkflowRun {
  id: number;
  status: string; // queued | in_progress | completed
  conclusion: string | null; // success | failure | ...
  created_at: string;
  event: string;
  html_url: string;
}

/** Kick off the data pipeline. Returns once GitHub accepts the dispatch. */
export async function dispatchScrape(token: string, ref: RepoRef): Promise<void> {
  const url = `${API}/repos/${ref.owner}/${ref.repo}/actions/workflows/${WORKFLOW}/dispatches`;
  const res = await ghFetch(url, token, {
    method: "POST",
    body: JSON.stringify({ ref: REF }),
  });
  if (res.status !== 204) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) detail = body.message;
    } catch {
      /* no body */
    }
    throw new GithubError(`Could not start the workflow: ${detail}`);
  }
}

async function listRuns(token: string, ref: RepoRef, workflow: string): Promise<WorkflowRun[]> {
  const url = `${API}/repos/${ref.owner}/${ref.repo}/actions/workflows/${workflow}/runs?per_page=10`;
  const res = await ghFetch(url, token, { cache: "no-store" });
  if (!res.ok) throw new GithubError(`Could not read workflow runs (HTTP ${res.status}).`);
  const data = (await res.json()) as { workflow_runs?: WorkflowRun[] };
  return data.workflow_runs ?? [];
}

/**
 * Poll a workflow until the newest run created after `sinceMs` completes.
 * Calls onTick with the current run (or null while waiting for it to appear).
 * Resolves with the completed run, or rejects on timeout/error/abort.
 */
export async function waitForRun(
  token: string,
  ref: RepoRef,
  workflow: "update-data.yml" | "deploy.yml",
  sinceMs: number,
  onTick: (run: WorkflowRun | null) => void,
  signal?: { aborted: boolean },
  timeoutMs = 6 * 60_000,
): Promise<WorkflowRun> {
  const wf = workflow === "deploy.yml" ? DEPLOY_WORKFLOW : WORKFLOW;
  const deadline = Date.now() + timeoutMs;
  // Allow a little clock skew when matching runs to the dispatch time.
  const floor = sinceMs - 90_000;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new GithubError("Cancelled.");
    const runs = await listRuns(token, ref, wf);
    const match = runs
      .filter((r) => new Date(r.created_at).getTime() >= floor)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    onTick(match ?? null);
    if (match && match.status === "completed") return match;
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new GithubError("Timed out waiting for the workflow — check the Actions tab on GitHub.");
}
