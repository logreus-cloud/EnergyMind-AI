"use client";

import {
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Move } from "lucide-react";
import { AIInsight } from "../Dashboard/AIInsight";
import { Tooltip } from "../UI/Tooltip";
import { FloorControls } from "./FloorControls";
import { FloorLegend } from "./FloorLegend";
import { RoomShape } from "./Room";
import type { Floor, LayerType, Room } from "../../types";

interface FloorPlanProps {
  floor?: Floor;
  floors: Floor[];
  activeFloor: number;
  onSelectFloor: (level: number) => void;
  selectedRoomId?: string;
  analysisReady: boolean;
  activeLayer: LayerType;
  onLayerChange: (layer: LayerType) => void;
  onSelectRoom: (room: Room) => void;
  focusRoomId?: string;
  insight: {
    anomaliesDetected: number;
    topRoom: string;
    deviationPercent: number;
    monthlyLossKzt: number;
  } | null;
  onViewInsight: () => void;
}

const statusLabel: Record<Room["status"], string> = {
  normal: "Нормальное потребление",
  warning: "Повышенное потребление",
  critical: "Критическая аномалия",
  forecast: "Прогнозируемая нагрузка",
};

export function FloorPlan({
  floor,
  floors,
  activeFloor,
  onSelectFloor,
  selectedRoomId,
  analysisReady,
  activeLayer,
  onLayerChange,
  onSelectRoom,
  focusRoomId,
  insight,
  onViewInsight,
}: FloorPlanProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredRoom, setHoveredRoom] = useState<Room | null>(null);
  const [tooltipPoint, setTooltipPoint] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, [floor?.id]);

  useEffect(() => {
    if (!floor || !focusRoomId) {
      return;
    }
    const room = floor.rooms.find((candidate) => candidate.id === focusRoomId);
    if (!room) {
      return;
    }
    focusRoom(room);
  }, [focusRoomId, floor]);

  const selected = useMemo(
    () => floor?.rooms.find((room) => room.id === selectedRoomId),
    [floor?.rooms, selectedRoomId],
  );

  const handleZoomIn = () => setScale((value) => clamp(value + 0.12, 0.85, 2.2));
  const handleZoomOut = () => setScale((value) => clamp(value - 0.12, 0.85, 2.2));
  const handleReset = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const nextScale = event.deltaY < 0 ? scale + 0.12 : scale - 0.12;
    setScale(clamp(nextScale, 0.85, 2.2));
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    const targetElement = event.target as Element;
    if (targetElement.closest("[data-room='true']")) {
      return;
    }
    setIsDragging(true);
    dragOriginRef.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
  };

  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!floor) {
      return;
    }

    if (isDragging && dragOriginRef.current) {
      setPan({
        x: event.clientX - dragOriginRef.current.x,
        y: event.clientY - dragOriginRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragOriginRef.current = null;
  };

  const handleRoomHover = (room: Room, event: ReactMouseEvent<SVGGElement>) => {
    const viewportRect = viewportRef.current?.getBoundingClientRect();
    if (!viewportRect) {
      return;
    }
    setHoveredRoom(room);
    setTooltipPoint({
      x: clamp(event.clientX - viewportRect.left + 18, 18, viewportRect.width - 210),
      y: clamp(event.clientY - viewportRect.top + 14, 16, viewportRect.height - 190),
    });
  };

  const handleRoomLeave = () => setHoveredRoom(null);

  const focusRoom = (room: Room) => {
    if (!floor) {
      return;
    }
    const focusScale = 1.38;
    const centerX = room.position.x + room.position.width / 2;
    const centerY = room.position.y + room.position.height / 2;
    setScale(focusScale);
    setPan({
      x: floor.width / 2 - centerX * focusScale,
      y: floor.height / 2 - centerY * focusScale,
    });
  };

  if (!floor) {
    return (
      <section className="em-floor-area">
        <div className="em-floor-area__head">
          <h2>План этажа</h2>
        </div>
        <div className="em-floor-placeholder">Данные этажа недоступны</div>
      </section>
    );
  }

  return (
    <section className="em-floor-area">
      <div className="em-floor-area__head">
        <div>
          <span className="em-floor-area__caption">Интерактивный цифровой чертёж</span>
          <h2>Главный корпус · Этаж {floor.label}</h2>
        </div>
        <div className="em-floor-switch" role="tablist" aria-label="Переключение этажей">
          {floors.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.level === activeFloor ? "is-selected" : ""}
              onClick={() => onSelectFloor(item.level)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={viewportRef}
        className="em-floor-viewport"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {floor.rooms.length === 0 ? (
          <div className="em-floor-placeholder">
            <strong>План этажа {floor.label} в подготовке</strong>
            <span>Для MVP доступны 1 и 2 этажи с интерактивными зонами и AI-анализом.</span>
          </div>
        ) : (
          <>
            <svg className="em-floor-svg" viewBox={`0 0 ${floor.width} ${floor.height}`} role="img" aria-label="План здания">
              <defs>
                <pattern id="em-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e9edf3" strokeWidth="1" />
                </pattern>
                <filter id="em-critical-glow">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
              </defs>

              <rect x="0" y="0" width={floor.width} height={floor.height} fill="url(#em-grid)" />
              <rect x="14" y="14" width={floor.width - 28} height={floor.height - 28} className="em-blueprint__frame" />

              <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>
                <BlueprintDecor />

                {floor.rooms.map((room) => (
                  <RoomShape
                    key={room.id}
                    room={room}
                    selected={room.id === selectedRoomId}
                    dimmed={Boolean(selected && selected.id !== room.id)}
                    showAnomaly={analysisReady}
                    onSelect={(selectedRoom) => {
                      onSelectRoom(selectedRoom);
                      focusRoom(selectedRoom);
                    }}
                    onHover={handleRoomHover}
                    onLeave={handleRoomLeave}
                  />
                ))}
              </g>
            </svg>

            <Tooltip visible={Boolean(hoveredRoom)} x={tooltipPoint.x} y={tooltipPoint.y}>
              {hoveredRoom && (
                <div className="em-tooltip-card">
                  <strong>{hoveredRoom.name}</strong>
                  <span>{hoveredRoom.type}</span>
                  <div className="em-tooltip-row">
                    <span>Потребление</span>
                    <b>{hoveredRoom.consumptionKwh.toFixed(1)} kWh</b>
                  </div>
                  <div className="em-tooltip-row">
                    <span>Норма</span>
                    <b>{hoveredRoom.baselineKwh.toFixed(1)} kWh</b>
                  </div>
                  <div className="em-tooltip-row">
                    <span>Отклонение</span>
                    <b className={hoveredRoom.deviationPercent > 0 ? "is-alert" : ""}>
                      {hoveredRoom.deviationPercent > 0 ? "+" : ""}
                      {hoveredRoom.deviationPercent}%
                    </b>
                  </div>
                  <div className="em-tooltip-row">
                    <span>Статус</span>
                    <b>{statusLabel[hoveredRoom.status]}</b>
                  </div>
                </div>
              )}
            </Tooltip>

            <FloorControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleReset} />
            <div className="em-floor-hint">
              <Move size={13} />
              drag для перемещения · колесо для zoom
            </div>
            <FloorLegend activeLayer={activeLayer} onLayerChange={onLayerChange} />
            {insight && (
              <AIInsight
                anomaliesDetected={insight.anomaliesDetected}
                topRoom={insight.topRoom}
                deviationPercent={insight.deviationPercent}
                monthlyLossKzt={insight.monthlyLossKzt}
                onView={onViewInsight}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function BlueprintDecor() {
  const windowSegments = [
    { x1: 80, y1: 20, x2: 140, y2: 20 },
    { x1: 260, y1: 20, x2: 330, y2: 20 },
    { x1: 510, y1: 20, x2: 590, y2: 20 },
    { x1: 900, y1: 20, x2: 980, y2: 20 },
    { x1: 1178, y1: 120, x2: 1178, y2: 180 },
    { x1: 1178, y1: 290, x2: 1178, y2: 350 },
    { x1: 1178, y1: 490, x2: 1178, y2: 550 },
    { x1: 330, y1: 740, x2: 380, y2: 740 },
    { x1: 700, y1: 740, x2: 760, y2: 740 },
  ];

  const desks = [
    { x: 302, y: 250 },
    { x: 352, y: 250 },
    { x: 622, y: 252 },
    { x: 672, y: 252 },
    { x: 712, y: 380 },
    { x: 764, y: 380 },
    { x: 486, y: 380 },
    { x: 538, y: 380 },
  ];

  return (
    <g className="em-blueprint">
      <rect x="240" y="180" width="720" height="380" className="em-blueprint__corridor" />
      <line x1="240" y1="370" x2="960" y2="370" className="em-blueprint__axis" />
      <line x1="600" y1="180" x2="600" y2="560" className="em-blueprint__axis" />

      <g className="em-blueprint__doors">
        <path d="M 402 160 A 26 26 0 0 1 428 186" />
        <path d="M 636 160 A 26 26 0 0 1 662 186" />
        <path d="M 988 350 A 26 26 0 0 1 1014 376" />
        <path d="M 962 620 A 26 26 0 0 1 936 646" />
      </g>

      <g className="em-blueprint__windows">
        {windowSegments.map((segment) => (
          <line
            key={`${segment.x1}-${segment.y1}-${segment.x2}-${segment.y2}`}
            x1={segment.x1}
            y1={segment.y1}
            x2={segment.x2}
            y2={segment.y2}
          />
        ))}
      </g>

      <g className="em-blueprint__furniture">
        {desks.map((desk) => (
          <rect key={`${desk.x}-${desk.y}`} x={desk.x} y={desk.y} width="34" height="18" rx="4" />
        ))}
      </g>

      <g className="em-blueprint__hvac">
        <circle cx="840" cy="440" r="18" />
        <circle cx="840" cy="440" r="8" />
        <line x1="824" y1="440" x2="856" y2="440" />
        <line x1="840" y1="424" x2="840" y2="456" />
      </g>
    </g>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
