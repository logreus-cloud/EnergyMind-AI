import type { ReactNode } from "react";

type BadgeTone = "normal" | "warning" | "critical" | "forecast";

interface BadgeProps {
  tone: BadgeTone;
  children: ReactNode;
}

export function Badge({ tone, children }: BadgeProps) {
  return <span className={`em-badge em-badge--${tone}`}>{children}</span>;
}
