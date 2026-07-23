import { useState } from "react";
import { BookOpen, LayoutDashboard, Microscope, RefreshCw, Table2 } from "lucide-react";
import { AnalyzeTab } from "@/components/AnalyzeTab";
import { Header } from "@/components/Header";
import { StatCards } from "@/components/StatCards";
import { MentionFrequencyChart, TopTickersChart } from "@/components/Charts";
import { MentionFeed } from "@/components/MentionFeed";
import { DailyDigest } from "@/components/DailyDigest";
import { TickerTable } from "@/components/TickerTable";
import { SkillInfo } from "@/components/SkillInfo";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from "@/hooks/useData";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function DataUnavailable({ error }: { error: string | null }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-bearish/40 bg-bearish/10 p-6 text-center">
      <p className="font-medium">{t("data.unavailable")}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {error ?? "Could not load mentions.json"}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{t("data.unavailableNote")}</p>
    </div>
  );
}

export default function App() {
  const { data, analyses, loading, error, offline, refreshing, refresh } = useData();
  const { t } = useI18n();
  const [tab, setTab] = useState("analyze");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  function jumpToTicker(ticker: string) {
    setSelectedTicker(ticker);
    setTab("tickers");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col pb-[env(safe-area-inset-bottom)]">
      <Header data={data} offline={offline} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4">
        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        )}

        {!loading && (
          <>
            {data?.isSample && (
              <div className="mb-4 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 text-xs leading-relaxed text-foreground/80">
                {t("banner.sample")}
              </div>
            )}

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="analyze" className="flex-1 sm:flex-none">
                  <Microscope className="h-4 w-4" /> {t("tab.analyze")}
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="flex-1 sm:flex-none">
                  <LayoutDashboard className="h-4 w-4" /> {t("tab.dashboard")}
                </TabsTrigger>
                <TabsTrigger value="tickers" className="flex-1 sm:flex-none">
                  <Table2 className="h-4 w-4" /> {t("tab.tickers")}
                </TabsTrigger>
                <TabsTrigger value="skill" className="flex-1 sm:flex-none">
                  <BookOpen className="h-4 w-4" /> {t("tab.skill")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analyze">
                <AnalyzeTab data={data} analyses={analyses} />
              </TabsContent>

              <TabsContent value="dashboard" className="space-y-4">
                {data ? (
                  <>
                    {/* Last-updated indicator + manual refresh */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {t("dash.updated")}{" "}
                        <time className="font-medium text-foreground/80">
                          {new Date(data.updatedAt).toLocaleString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </p>
                      <button
                        onClick={refresh}
                        disabled={refreshing}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/50 px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-60"
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                        {refreshing ? t("dash.refreshing") : t("dash.refresh")}
                      </button>
                    </div>

                    <StatCards data={data} />
                    <div className="grid gap-4 lg:grid-cols-2">
                      <MentionFrequencyChart data={data} />
                      <TopTickersChart data={data} onSelect={jumpToTicker} />
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
                      <MentionFeed mentions={data.mentions} />
                      <DailyDigest data={data} onSelect={jumpToTicker} />
                    </div>
                    <p className="text-xs text-muted-foreground">{t("dash.trackingNote")}</p>
                  </>
                ) : (
                  <DataUnavailable error={error} />
                )}
              </TabsContent>

              <TabsContent value="tickers">
                {data ? (
                  <TickerTable
                    data={data}
                    analyses={analyses}
                    selected={selectedTicker}
                    onSelect={setSelectedTicker}
                  />
                ) : (
                  <DataUnavailable error={error} />
                )}
              </TabsContent>

              <TabsContent value="skill">
                <SkillInfo />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      <footer className="mx-auto mt-10 w-full max-w-6xl px-4 text-center text-xs text-muted-foreground">
        Serenity Stock Tracker · unofficial, independent tracker applying the open{" "}
        <a
          href="https://github.com/muxuuu/serenity-skill"
          target="_blank"
          rel="noreferrer noopener"
          className="text-accent hover:underline"
        >
          serenity-skill
        </a>{" "}
        methodology · not investment advice
      </footer>
    </div>
  );
}
