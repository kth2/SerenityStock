import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AI_PRESETS,
  getKeyForUrl,
  loadAiConfig,
  saveAiConfig,
  testAiConnection,
  type AiConfig,
  type AiProtocol,
} from "@/lib/serenity/ai";

interface AiSettingsProps {
  open: boolean;
  onClose: () => void;
  onSaved: (config: AiConfig | null) => void;
}

type TestState = { status: "idle" | "testing" | "ok" | "error"; message?: string };

export function AiSettings({ open, onClose, onSaved }: AiSettingsProps) {
  const [presetId, setPresetId] = useState("gemini");
  const [protocol, setProtocol] = useState<AiProtocol>("gemini");
  const [baseUrl, setBaseUrl] = useState(AI_PRESETS[0].baseUrl);
  const [model, setModel] = useState(AI_PRESETS[0].model);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<TestState>({ status: "idle" });

  // Hydrate from stored config each time the panel opens.
  useEffect(() => {
    if (!open) return;
    const existing = loadAiConfig();
    if (existing) {
      const matched = AI_PRESETS.find(
        (p) => p.baseUrl === existing.baseUrl && p.protocol === existing.protocol,
      );
      setPresetId(matched?.id ?? "custom");
      setProtocol(existing.protocol);
      setBaseUrl(existing.baseUrl);
      setModel(existing.model);
      setApiKey(existing.apiKey);
    }
    setTest({ status: "idle" });
  }, [open]);

  function applyPreset(id: string) {
    setPresetId(id);
    setTest({ status: "idle" });
    const preset = AI_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setProtocol(preset.protocol);
    if (preset.id === "custom") {
      // Give a blank, obviously-editable form for a fully custom endpoint.
      setBaseUrl("");
      setModel("");
      setApiKey("");
    } else {
      setBaseUrl(preset.baseUrl);
      setModel(preset.model);
      // Recall the key stored for THIS endpoint (keys are per-API-URL).
      setApiKey(getKeyForUrl(preset.baseUrl));
    }
  }

  // Any hand-edit to the URL or model means the config is no longer a preset —
  // reflect that in the highlighted chip so edits visibly register.
  function editUrl(value: string) {
    setBaseUrl(value);
    setPresetId("custom");
    setTest({ status: "idle" });
  }
  function editModel(value: string) {
    setModel(value);
    setPresetId("custom");
    setTest({ status: "idle" });
  }

  // Recall the stored key when a manually-typed URL loses focus.
  function recallKeyForUrl(url: string) {
    const stored = getKeyForUrl(url);
    if (stored) setApiKey(stored);
  }

  const preset = AI_PRESETS.find((p) => p.id === presetId);
  const config: AiConfig = { protocol, baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim() };
  const canSave = Boolean(config.baseUrl && config.model);

  async function runTest() {
    if (!canSave) return;
    setTest({ status: "testing" });
    try {
      await testAiConnection(config);
      setTest({ status: "ok", message: "Connection works." });
    } catch (err) {
      setTest({ status: "error", message: err instanceof Error ? err.message : "Test failed." });
    }
  }

  function handleSave() {
    saveAiConfig(config);
    onSaved(config);
    onClose();
  }

  function handleDisable() {
    saveAiConfig(null);
    setApiKey("");
    onSaved(null);
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">AI research settings</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          Connect your own AI model to research any ticker or theme that isn't in the
          built-in knowledge base. Works with any OpenAI-compatible or Gemini-compatible
          endpoint.
        </p>

        {/* Privacy note */}
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-foreground/80">
            Your endpoint, key, and model are stored <strong>only in this browser</strong>{" "}
            (localStorage) and sent directly to the provider you choose — never to this
            site's server (there isn't one) or anywhere else.
          </p>
        </div>

        {/* Provider preset */}
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Provider</label>
        <div className="mb-4 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {AI_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={`rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                presetId === p.id
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border/70 bg-background/40 text-muted-foreground hover:border-border"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset && (
          <p className="mb-4 -mt-2 text-xs text-muted-foreground">{preset.keyHint}</p>
        )}

        {/* Protocol (only editable for custom) */}
        {presetId === "custom" && (
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">API format</label>
            <div className="flex gap-1.5">
              {(["openai", "gemini"] as AiProtocol[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setProtocol(p)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs transition-colors ${
                    protocol === p
                      ? "border-primary/60 bg-primary/10"
                      : "border-border/70 bg-background/40 text-muted-foreground"
                  }`}
                >
                  {p === "openai" ? "OpenAI-compatible" : "Gemini"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* API URL */}
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">API URL</label>
        <Input
          value={baseUrl}
          onChange={(e) => editUrl(e.target.value)}
          onBlur={(e) => recallKeyForUrl(e.target.value)}
          placeholder="https://api.example.com/v1"
          className="mb-1 font-mono text-xs"
          spellCheck={false}
          autoCapitalize="none"
        />
        <p className="mb-4 text-[11px] text-muted-foreground">
          {protocol === "openai"
            ? "Base URL ending in /v1 — the app appends /chat/completions."
            : "Gemini base URL, e.g. .../v1beta — the app appends the model path."}
        </p>

        {/* Model */}
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Model</label>
        <Input
          value={model}
          onChange={(e) => editModel(e.target.value)}
          placeholder="e.g. gemini-flash-lite-latest"
          className="mb-4 font-mono text-xs"
          spellCheck={false}
          autoCapitalize="none"
        />

        {/* API key */}
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          API key {protocol === "openai" && <span className="font-normal">(blank for keyless local servers)</span>}
        </label>
        <div className="relative mb-4">
          <Input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setTest({ status: "idle" });
            }}
            placeholder="Paste your key"
            className="pr-9 font-mono text-xs"
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showKey ? "Hide key" : "Show key"}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Test result */}
        {test.status !== "idle" && (
          <div
            className={`mb-4 flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
              test.status === "ok"
                ? "border-bullish/40 bg-bullish/10 text-bullish"
                : test.status === "error"
                  ? "border-bearish/40 bg-bearish/10 text-bearish"
                  : "border-border bg-muted/40 text-muted-foreground"
            }`}
          >
            {test.status === "testing" && <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />}
            {test.status === "ok" && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
            {test.status === "error" && <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
            <span>{test.status === "testing" ? "Testing…" : test.message}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={runTest} disabled={!canSave || test.status === "testing"}>
            Test
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave} className="gap-1.5">
            <Check className="h-4 w-4" /> Save &amp; enable
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDisable} className="ml-auto text-muted-foreground">
            Turn off AI
          </Button>
        </div>

        <p className="mt-4 border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
          Free options: Google Gemini and Groq both have no-cost tiers. AI answers come
          from the model's training knowledge without live web access, so they carry an{" "}
          <Badge variant="warning" className="mx-0.5">AI · unverified</Badge> label — always
          confirm with the sources each analysis lists before acting.
        </p>
      </div>
    </div>
  );
}
