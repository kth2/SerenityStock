import { ExternalLink, Heart, Repeat2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompact } from "@/lib/utils";
import type { Mention } from "@/types";

function sentimentVariant(label: string): "bullish" | "bearish" | "secondary" {
  return label === "bullish" ? "bullish" : label === "bearish" ? "bearish" : "secondary";
}

/** Highlight $TICKER tokens inside tweet text. */
function TweetText({ text }: { text: string }) {
  const parts = text.split(/(\$[A-Za-z]{1,5})/g);
  return (
    <p className="text-sm leading-relaxed text-foreground/90">
      {parts.map((part, i) =>
        /^\$[A-Za-z]{1,5}$/.test(part) ? (
          <span key={i} className="font-semibold text-accent">
            {part.toUpperCase()}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

export function MentionFeed({ mentions, limit = 8 }: { mentions: Mention[]; limit?: number }) {
  // De-dupe: one tweet can mention several tickers; show each tweet once.
  const seen = new Set<string>();
  const unique = mentions.filter((m) => {
    if (seen.has(m.tweetId)) return false;
    seen.add(m.tweetId);
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest mentions</CardTitle>
        <CardDescription>Most recent posts containing ticker symbols</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {unique.slice(0, limit).map((m) => (
          <article
            key={m.tweetId}
            className="rounded-lg border border-border/70 bg-background/40 p-3"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={sentimentVariant(m.sentiment.label)}>
                {m.sentiment.label}
              </Badge>
              <time className="text-xs text-muted-foreground">
                {new Date(m.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              <a
                href={m.url}
                target="_blank"
                rel="noreferrer noopener"
                className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent"
              >
                Source <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <TweetText text={m.text} />
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Heart className="h-3 w-3" /> {formatCompact(m.stats.likes)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Repeat2 className="h-3 w-3" /> {formatCompact(m.stats.reposts)}
              </span>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
