import { TrendingDown, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Quote, SignalBand } from "@/types";

const BAND_STYLE: Record<SignalBand, string> = {
  high: "border-bullish/40 bg-bullish/10 text-bullish",
  constructive: "border-primary/40 bg-primary/10 text-primary",
  mixed: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  weak: "border-border bg-muted/40 text-muted-foreground",
};

function bandOf(score: number): SignalBand {
  if (score >= 80) return "high";
  if (score >= 65) return "constructive";
  if (score >= 45) return "mixed";
  return "weak";
}

/** Deterministic Serenity signal score, shown as a colored 0-100 chip. */
export function SignalBadge({
  score,
  band,
  showBand = false,
  className,
}: {
  score?: number;
  band?: SignalBand;
  showBand?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  if (score == null) return <span className="text-muted-foreground">—</span>;
  const b = band ?? bandOf(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs font-medium tabular-nums",
        BAND_STYLE[b],
        className,
      )}
      title={`${t("signal.full")} — ${t(`signal.band.${b}`)}. ${t("signal.explain")}`}
    >
      {score.toFixed(0)}
      {showBand && <span className="font-normal">{t(`signal.band.${b}`)}</span>}
    </span>
  );
}

/** Indicative live price + intraday change, from quotes.json. */
export function PriceChip({ quote, className }: { quote?: Quote; className?: string }) {
  const { t } = useI18n();
  if (!quote) return null;
  const up = (quote.changePct ?? 0) >= 0;
  const cur = quote.currency && quote.currency !== "USD" ? ` ${quote.currency}` : "";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/50 px-1.5 py-0.5 text-xs tabular-nums",
        className,
      )}
      title={`${t("price.delayed")} · ${t("price.source")}: ${quote.source}${
        quote.asOf ? ` · ${t("price.asOf")} ${quote.asOf}` : ""
      }`}
    >
      <span className="font-medium text-foreground/90">
        {quote.price.toFixed(2)}
        {cur}
      </span>
      {quote.changePct != null && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5",
            up ? "text-bullish" : "text-bearish",
          )}
        >
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {up ? "+" : ""}
          {quote.changePct.toFixed(2)}%
        </span>
      )}
    </span>
  );
}
