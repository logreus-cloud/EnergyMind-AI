import type { LayerType } from "../../types";

interface FloorLegendProps {
  activeLayer: LayerType;
  onLayerChange: (layer: LayerType) => void;
}

export function FloorLegend({ activeLayer, onLayerChange }: FloorLegendProps) {
  return (
    <div className="em-floor-legend">
      <div className="em-floor-legend__status">
        <span>
          <i className="normal" />
          Норма
        </span>
        <span>
          <i className="warning" />
          Внимание
        </span>
        <span>
          <i className="critical" />
          Критическая аномалия
        </span>
        <span>
          <i className="forecast" />
          Прогноз
        </span>
      </div>

      <div className="em-layer-toggle">
        <button
          type="button"
          className={activeLayer === "energy" ? "is-active" : ""}
          onClick={() => onLayerChange("energy")}
        >
          Энергия
        </button>
        <button type="button" className={activeLayer === "occupancy" ? "is-active" : ""} disabled>
          Занятость
        </button>
        <button type="button" className={activeLayer === "hvac" ? "is-active" : ""} disabled>
          HVAC
        </button>
      </div>
    </div>
  );
}
