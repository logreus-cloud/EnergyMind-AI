import type { KeyboardEvent, MouseEvent } from "react";
import type { Room } from "../../types";

interface RoomShapeProps {
  room: Room;
  selected: boolean;
  dimmed: boolean;
  showAnomaly: boolean;
  onSelect: (room: Room) => void;
  onHover: (room: Room, event: MouseEvent<SVGGElement>) => void;
  onLeave: () => void;
}

const statusText: Record<Room["status"], string> = {
  normal: "Норма",
  warning: "Внимание",
  critical: "Критично",
  forecast: "Прогноз",
};

export function RoomShape({
  room,
  selected,
  dimmed,
  showAnomaly,
  onSelect,
  onHover,
  onLeave,
}: RoomShapeProps) {
  const statusClass = `em-room em-room--${room.status} ${selected ? "is-selected" : ""} ${
    dimmed ? "is-dimmed" : ""
  } ${showAnomaly ? "show-anomaly" : ""}`;
  const deviation = room.deviationPercent > 0 ? `+${room.deviationPercent}%` : `${room.deviationPercent}%`;
  const badgeX = room.position.x + 10;
  const badgeY = room.position.y + room.position.height - 24;

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(room);
    }
  };

  return (
    <g
      className={statusClass}
      data-room="true"
      role="button"
      tabIndex={0}
      aria-label={`${room.name}, ${statusText[room.status]}`}
      onMouseEnter={(event) => onHover(room, event)}
      onMouseMove={(event) => onHover(room, event)}
      onMouseLeave={onLeave}
      onClick={() => onSelect(room)}
      onKeyDown={handleKeyDown}
    >
      {showAnomaly && room.status === "critical" && (
        <rect
          x={room.position.x + 1}
          y={room.position.y + 1}
          width={room.position.width - 2}
          height={room.position.height - 2}
          rx={8}
          className="em-room__glow"
        />
      )}

      <rect
        x={room.position.x}
        y={room.position.y}
        width={room.position.width}
        height={room.position.height}
        rx={8}
        className="em-room__fill"
      />
      <rect
        x={room.position.x}
        y={room.position.y}
        width={room.position.width}
        height={room.position.height}
        rx={8}
        className="em-room__stroke"
      />

      <text x={room.position.x + 10} y={room.position.y + 18} className="em-room__name">
        {room.name}
      </text>
      <text x={room.position.x + 10} y={room.position.y + 34} className="em-room__type">
        {room.type}
      </text>

      {(showAnomaly || room.status === "critical") && room.status !== "normal" && (
        <g>
          <rect x={badgeX} y={badgeY} width={84} height={17} rx={8.5} className="em-room__badge-bg" />
          <text x={badgeX + 6} y={badgeY + 12} className="em-room__badge-text">
            {deviation}
          </text>
          <circle cx={badgeX + 70} cy={badgeY + 8.5} r={4.4} className="em-room__badge-dot" />
          <text x={badgeX + 68.4} y={badgeY + 11.3} className="em-room__badge-icon">
            !
          </text>
        </g>
      )}
    </g>
  );
}
