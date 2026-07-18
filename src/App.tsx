import { useState } from "react";
import { BookOpen, LayoutDashboard, Table2 } from "lucide-react";
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

export default function App() {
  const { data, analyses, loading, error, offline } = useData();
  const [tab, setTab] = useState("dashboard");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  function jumpToTicker(ticker: string) {
    setSelectedTicker(ticker);
    setTab("tickers");
  }

  return (
    <div className="min-h-screen pb-12">
      <Header data={data} offline={offline} />

      <main className="mx-auto max-w-6xl px-4 pt-4">
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

        {error && !data && (
          <div className="rounded-xl border border-bearish/40 bg-bearish/10 p-6 text-center">
            <p className="font-medium">Could not load data</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              If this is a fresh clone, run <code>npm run process</code> to generate the
              data files from the bundled sample tweets.
            </p>
          </div>
        )}

        {data && (
          <>
            {data.isSample && (
              <div className="mb-4 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 text-xs leading-relaxed text-foreground/80">
                Showing <strong>synthetic sample data</strong> written to demonstrate the
                app — these are not real posts. The GitHub Actions pipeline replaces this
                with live scraped data on its first successful run.
              </div>
            )}

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="dashboard" className="flex-1 sm:flex-none">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </TabsTrigger>
                <TabsTrigger value="tickers" className="flex-1 sm:flex-none">
                  <Table2 className="h-4 w-4" /> Tickers
                </TabsTrigger>
                <TabsTrigger value="skill" className="flex-1 sm:flex-none">
                  <BookOpen className="h-4 w-4" /> Skill
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="space-y-4">
                <StatCards data={data} />
                <div className="grid gap-4 lg:grid-cols-2">
                  <MentionFrequencyChart data={data} />
                  <TopTickersChart data={data} onSelect={jumpToTicker} />
                </div>
                <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
                  <MentionFeed mentions={data.mentions} />
                  <DailyDigest data={data} onSelect={jumpToTicker} />
                </div>
              </TabsContent>

              <TabsContent value="tickers">
                <TickerTable
                  data={data}
                  analyses={analyses}
                  selected={selectedTicker}
                  onSelect={setSelectedTicker}
                />
              </TabsContent>

              <TabsContent value="skill">
                <SkillInfo />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      <footer className="mx-auto mt-10 max-w-6xl px-4 text-center text-xs text-muted-foreground">
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
