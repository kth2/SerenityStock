import { Activity, Languages, WifiOff, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import type { MentionsData } from "@/types";

interface HeaderProps {
  data: MentionsData | null;
  offline: boolean;
}

export function Header({ data, offline }: HeaderProps) {
  const { t, lang, toggle } = useI18n();
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold leading-tight">
              Serenity Stock Tracker
            </h1>
            <p className="truncate text-xs text-muted-foreground">{t("app.subtitle")}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {offline && (
            <Badge variant="warning" className="gap-1">
              <WifiOff className="h-3 w-3" /> {t("badge.offline")}
            </Badge>
          )}
          {data?.isSample && (
            <Badge variant="accent" className="gap-1" title={t("badge.sample")}>
              <FlaskConical className="h-3 w-3" /> {t("badge.sample")}
            </Badge>
          )}
          {data && (
            <span className="hidden text-xs text-muted-foreground sm:block">
              {t("app.updated")} {new Date(data.updatedAt).toLocaleDateString()}
            </span>
          )}
          <button
            onClick={toggle}
            aria-label={lang === "en" ? "切换到中文" : "Switch to English"}
            title={lang === "en" ? "切换到中文" : "Switch to English"}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border/70 bg-background/50 px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Languages className="h-3.5 w-3.5" />
            {t("lang.toggle")}
          </button>
        </div>
      </div>
    </header>
  );
}
