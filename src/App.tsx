import { useState } from "react";
import { BookOpen, BrainCircuit, LayoutDashboard, Microscope, Table2 } from "lucide-react";
import { AnalyzeTab } from "@/components/AnalyzeTab";
import { MarketMindTab } from "@/components/MarketMindTab";
import { Header } from "@/components/Header";
import { ScrapeButton } from "@/components/ScrapeButton";
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

// Phone: five equal columns with the icon stacked over a short label, so every
// tab stays reachable at 320px. sm+: the original inline row with full labels.
const TAB_CLS =
  "min-w-0 flex-col gap-0.5 px-0.5 py-1.5 text-[10px] leading-tight sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm";

function TabLabel({ short, full }: { short: string; full: string }) {
  return (
    <>
      <span className="max-w-full truncate sm:hidden">{short}</span>
      <span className="hidden sm:inline">{full}</span>
    </>
  );
}

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
  const { data, analyses, quotes, loading, error, offline, refreshing, refresh } = useData();
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
              <TabsList className="grid h-auto w-full grid-cols-5 gap-0.5 sm:inline-flex sm:h-10 sm:w-auto sm:gap-1">
                <TabsTrigger value="analyze" className={TAB_CLS}>
                  <Microscope className="h-4 w-4 shrink-0" />
                  <TabLabel short={t("tab.analyze.short")} full={t("tab.analyze")} />
                </TabsTrigger>
                <TabsTrigger value="marketmind" className={TAB_CLS}>
                  <BrainCircuit className="h-4 w-4 shrink-0" />
                  <TabLabel short={t("tab.marketmind.short")} full={t("tab.marketmind")} />
                </TabsTrigger>
                <TabsTrigger value="dashboard" className={TAB_CLS}>
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  <TabLabel short={t("tab.dashboard.short")} full={t("tab.dashboard")} />
                </TabsTrigger>
                <TabsTrigger value="tickers" className={TAB_CLS}>
                  <Table2 className="h-4 w-4 shrink-0" />
                  <TabLabel short={t("tab.tickers.short")} full={t("tab.tickers")} />
                </TabsTrigger>
                <TabsTrigger value="skill" className={TAB_CLS}>
                  <BookOpen className="h-4 w-4 shrink-0" />
                  <TabLabel short={t("tab.skill.short")} full={t("tab.skill")} />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analyze">
                <AnalyzeTab data={data} analyses={analyses} quotes={quotes} />
              </TabsContent>

              <TabsContent value="marketmind">
                <MarketMindTab data={data} />
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
                      <ScrapeButton onReload={refresh} reloading={refreshing} />
                    </div>

                    <StatCards data={data} />
                    <div className="grid gap-4 lg:grid-cols-2">
                      <MentionFrequencyChart data={data} />
                      <TopTickersChart data={data} onSelect={jumpToTicker} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
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
                    quotes={quotes}
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
