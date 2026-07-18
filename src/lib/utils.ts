import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCompact(n: number): string {
  return Intl.NumberFormat("en", { notation: "compact" }).format(n);
}

export function sentimentColor(label: string): string {
  if (label === "bullish") return "text-bullish";
  if (label === "bearish") return "text-bearish";
  return "text-muted-foreground";
}
