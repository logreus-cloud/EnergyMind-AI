import { LocateFixed, Minus, Plus } from "lucide-react";

interface FloorControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function FloorControls({ onZoomIn, onZoomOut, onReset }: FloorControlsProps) {
  return (
    <div className="em-floor-controls" aria-label="Контроль масштаба плана">
      <button type="button" onClick={onZoomIn} aria-label="Увеличить">
        <Plus size={14} />
      </button>
      <button type="button" onClick={onZoomOut} aria-label="Уменьшить">
        <Minus size={14} />
      </button>
      <button type="button" onClick={onReset} aria-label="Сбросить позицию">
        <LocateFixed size={14} />
      </button>
    </div>
  );
}
