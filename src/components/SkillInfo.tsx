import { ArrowRight, BookOpen, FileText, GitBranch, Shield, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FACTOR_LABELS, FACTOR_WEIGHTS } from "@/lib/serenity/scorecard";

const WORKFLOW = [
  ["Set the scope", "Market, theme, and time window"],
  ["Translate story → system change", "Which physical constraint matters most"],
  ["Map the value chain", "Demand → integrators → modules → chips → packaging → equipment → materials → infrastructure"],
  ["Find the scarce layer", "Low supplier count, hard expansion, long qualification"],
  ["Build the company universe", "Classify: controls / supplies / benefits / story"],
  ["Gather & grade evidence", "Primary sources first; social posts are leads only"],
  ["Rank priorities", "Layer priority before company priority"],
  ["Explain what could go wrong", "Substitution, expansion, dilution, valuation"],
  ["Give the next research move", "Concrete filings, metrics, and checks"],
] as const;

const BUNDLE = [
  ["SKILL.md", "Core methodology and behavior contract"],
  ["references/", "Evidence ladder, deep-research workflow, market source playbooks, dialogue protocol, risk & compliance"],
  ["assets/", "Thesis template, bottleneck scorecard JSON, research prompt pack"],
  ["examples/", "A-share AI semiconductor demo, AI-infrastructure chokepoint demo"],
  ["scripts/", "serenity_scorecard.py (this app ports its exact math), validate_skill.py"],
] as const;

export function SkillInfo() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <CardTitle>The Serenity Skill</CardTitle>
          </div>
          <CardDescription>
            A public-methodology supply-chain bottleneck research workflow, inspired by the
            public @aleabitoreddit style. Fully bundled in this repo under{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">skill/</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed text-foreground/90">
            Core promise:{" "}
            <span className="text-muted-foreground">
              market story → system change → required parts → supply-chain layers → scarce
              constraints → public companies → evidence → what the market may be missing →
              what could prove the idea wrong.
            </span>
          </p>
          <ol className="space-y-2">
            {WORKFLOW.map(([step, detail], i) => (
              <li key={step} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span>
                  <span className="font-medium">{step}</span>
                  <span className="block text-xs text-muted-foreground">{detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-accent" />
              <CardTitle>Bundled files</CardTitle>
            </div>
            <CardDescription>
              From{" "}
              <a
                href="https://github.com/muxuuu/serenity-skill"
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent hover:underline"
              >
                muxuuu/serenity-skill
              </a>{" "}
              (MIT)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {BUNDLE.map(([file, desc]) => (
                <li key={file} className="flex items-start gap-2 text-sm">
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{file}</code>
                    <span className="block text-xs text-muted-foreground">{desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scorecard weights</CardTitle>
            <CardDescription>
              The in-app engine uses the exact math from{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                skill/scripts/serenity_scorecard.py
              </code>
              : Σ(rating/5 × weight) − 2×penalties, clamped 0–100.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(FACTOR_WEIGHTS).map(([key, w]) => (
                <Badge key={key} variant="outline" className="gap-1">
                  {FACTOR_LABELS[key]} <span className="text-muted-foreground">×{w}</span>
                </Badge>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>≥85 Top priority</span>
              <ArrowRight className="h-3 w-3" />
              <span>≥70 High</span>
              <ArrowRight className="h-3 w-3" />
              <span>≥55 Worth tracking</span>
              <ArrowRight className="h-3 w-3" />
              <span>&lt;55 Early lead</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-yellow-400" />
              <CardTitle>Risk boundary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Research support only: ranked research priorities, reasoning chains, and
              verification steps — never guaranteed returns, buy/sell commands, or
              rumor-based recommendations. In-app analyses run the skill against a curated
              knowledge base or your own AI model; treat every claim as unverified until
              checked against the primary sources listed. The trading decision is always
              yours.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle>AI research (optional, your key)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Names outside the built-in knowledge base can be researched by connecting your
              own AI model in <span className="font-medium text-foreground/80">Analyze → AI</span>{" "}
              — any OpenAI-compatible or Gemini-compatible endpoint (Gemini and Groq have free
              tiers). Your API URL, key, and model live only in your browser and are sent
              directly to the provider; there is no server. The model supplies research and
              0–5 ratings, but the bottleneck score is always computed locally with the exact
              scorecard math, and AI answers are labeled{" "}
              <span className="font-medium text-yellow-400">AI · unverified</span> since they
              lack live sources.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
