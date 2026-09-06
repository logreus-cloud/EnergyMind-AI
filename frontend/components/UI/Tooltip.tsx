import type { ReactNode } from "react";

interface TooltipProps {
  visible: boolean;
  x: number;
  y: number;
  children: ReactNode;
}

export function Tooltip({ visible, x, y, children }: TooltipProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="em-tooltip" style={{ left: x, top: y }}>
      {children}
    </div>
  );
}
