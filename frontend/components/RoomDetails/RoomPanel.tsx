"use client";

import { Activity, Cpu, Fan, Lightbulb, Monitor, Power, Server, X } from "lucide-react";
import { EnergyChart } from "./EnergyChart";
import { Recommendation } from "./Recommendation";
import { Button } from "../UI/Button";
import type {
  Anomaly,
  ConsumptionPoint,
  Device,
  DeviceStatus,
  Recommendation as RecommendationType,
  Room,
  Task,
} from "../../types";

interface RoomPanelProps {
  room?: Room;
  anomaly?: Anomaly;
  consumption: ConsumptionPoint[];
  devices: Device[];
  deviceStates: Record<string, DeviceStatus>;
  deviceFilter: "all" | "recommended";
  onDeviceFilterChange: (filter: "all" | "recommended") => void;
  onToggleDevice: (deviceId: string) => void;
  recommendation: RecommendationType | null;
  task: Task | null;
  onCreateTask: () => void;
  onClose: () => void;
}

const statusLabel: Record<Room["status"], string> = {
  normal: "Норма",
  warning: "Внимание",
  critical: "Критично",
  forecast: "Прогноз",
};

export function RoomPanel({
  room,
  anomaly,
  consumption,
  devices,
  deviceStates,
  deviceFilter,
  onDeviceFilterChange,
  onToggleDevice,
  recommendation,
  task,
  onCreateTask,
  onClose,
}: RoomPanelProps) {
  if (!room) {
    return (
      <aside className="em-room-panel em-room-panel--empty">
        <strong>Выберите помещение на плане</strong>
        <p>Кликните по комнате, чтобы увидеть причину отклонения, устройства и действия.</p>
      </aside>
    );
  }

  const visibleDevices =
    deviceFilter === "recommended" ? devices.filter((device) => device.recommendedToDisable) : devices;

  const activeDevices = devices.filter((device) => resolvedStatus(deviceStates, device) !== "off").length;
  const totalLoad = devices.reduce((sum, device) => sum + currentLoad(deviceStates, device), 0);
  const totalCost = devices.reduce((sum, device) => sum + currentCost(deviceStates, device), 0);

  return (
    <aside className="em-room-panel">
      <div className="em-room-panel__head">
        <div>
          <span className={`em-room-panel__status em-room-panel__status--${room.status}`}>
            {statusLabel[room.status]}
          </span>
          <h3>{room.name}</h3>
          <p>
            {room.type} · {room.areaM2} м²
          </p>
        </div>
        <button type="button" className="em-icon-btn" onClick={onClose} aria-label="Закрыть">
          <X size={14} />
        </button>
      </div>

      <section className="em-device-block">
        <div className="em-device-block__head">
          <div>
            <strong>Устройства в помещении</strong>
            <span>
              {devices.length} устройств · {activeDevices} активны
            </span>
          </div>
          <div className="em-filter-tabs">
            <button
              type="button"
              className={deviceFilter === "all" ? "is-active" : ""}
              onClick={() => onDeviceFilterChange("all")}
            >
              Все
            </button>
            <button
              type="button"
              className={deviceFilter === "recommended" ? "is-active" : ""}
              onClick={() => onDeviceFilterChange("recommended")}
            >
              Отключить {devices.filter((device) => device.recommendedToDisable).length}
            </button>
          </div>
        </div>
        <div className="em-device-totals">
          <span>
            Нагрузка: <strong>{totalLoad.toFixed(1)} kWh</strong>
          </span>
          <span>
            Стоимость: <strong>{Math.round(totalCost)} ₸</strong>
          </span>
        </div>
        <div className="em-device-list">
          {visibleDevices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              status={resolvedStatus(deviceStates, device)}
              onToggle={() => onToggleDevice(device.id)}
            />
          ))}
        </div>
      </section>

      <section className="em-energy-section">
        <div className="em-energy-section__head">
          <span>ПОТРЕБЛЕНИЕ</span>
          <strong>{room.consumptionKwh.toFixed(1)} kWh</strong>
          <b className={room.deviationPercent > 0 ? "is-alert" : ""}>
            {room.deviationPercent > 0 ? "+" : ""}
            {room.deviationPercent}% к базовой норме
          </b>
        </div>
        <EnergyChart data={consumption} anomalyPeriod={anomaly ? { start: anomaly.start, end: anomaly.end } : undefined} />
      </section>

      <Recommendation anomaly={anomaly} recommendation={recommendation} task={task} onCreateTask={onCreateTask} />

      <footer className="em-room-panel__foot">
        <span>Занятость: {room.occupancy}</span>
        <span>HVAC: {room.hvacZone}</span>
      </footer>
    </aside>
  );
}

function DeviceCard({
  device,
  status,
  onToggle,
}: {
  device: Device;
  status: DeviceStatus;
  onToggle: () => void;
}) {
  const Icon =
    device.kind === "climate"
      ? Fan
      : device.kind === "lighting"
        ? Lightbulb
        : device.kind === "display"
          ? Monitor
          : device.kind === "server"
            ? Server
            : Cpu;

  const off = status === "off";
  const canDisable = device.recommendedToDisable;

  return (
    <article className={`em-device-card ${canDisable ? "is-recommended" : ""} ${off ? "is-off" : ""}`}>
      <div className={`em-device-card__icon kind-${device.kind}`}>
        <Icon size={14} />
      </div>
      <div className="em-device-card__info">
        <strong>{device.name}</strong>
        <span>
          {statusLabelFromDeviceStatus(status)} · {device.sharePercent}% нагрузки
        </span>
        {device.recommendedAction && (
          <small>
            <Activity size={12} />
            {device.recommendedAction}
          </small>
        )}
      </div>
      <div className="em-device-card__meta">
        <strong>{off ? "0.0" : device.consumptionKwh.toFixed(1)} kWh</strong>
        <span>{off ? "сэкономлено" : `${device.costKzt} ₸`}</span>
      </div>
      {canDisable ? (
        <Button
          type="button"
          variant={off ? "ghost" : "secondary"}
          size="sm"
          icon={<Power size={12} />}
          onClick={onToggle}
        >
          {off ? "Включить" : "Отключить"}
        </Button>
      ) : (
        <div className="em-device-card__ok">Норма</div>
      )}
    </article>
  );
}

function resolvedStatus(states: Record<string, DeviceStatus>, device: Device): DeviceStatus {
  return states[device.id] ?? device.status;
}

function currentLoad(states: Record<string, DeviceStatus>, device: Device): number {
  return resolvedStatus(states, device) === "off" ? 0 : device.consumptionKwh;
}

function currentCost(states: Record<string, DeviceStatus>, device: Device): number {
  return resolvedStatus(states, device) === "off" ? 0 : device.costKzt;
}

function statusLabelFromDeviceStatus(status: DeviceStatus): string {
  if (status === "on") return "Включено";
  if (status === "standby") return "Ожидание";
  return "Отключено";
}
