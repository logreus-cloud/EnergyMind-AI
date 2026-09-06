export type RoomStatus = "normal" | "warning" | "critical" | "forecast";
export type DeviceStatus = "on" | "standby" | "off";
export type DeviceKind = "climate" | "lighting" | "display" | "network" | "server";
export type LayerType = "energy" | "occupancy" | "hvac";

export interface Building {
  id: string;
  name: string;
  address: string;
  floors: Floor[];
}

export interface Floor {
  id: string;
  label: string;
  level: number;
  width: number;
  height: number;
  rooms: Room[];
}

export interface Room {
  id: string;
  name: string;
  type: string;
  floor: number;
  areaM2: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  status: RoomStatus;
  consumptionKwh: number;
  baselineKwh: number;
  deviationPercent: number;
  occupancy: string;
  hvacZone: string;
  anomaly?: {
    start: string;
    end: string;
    probableCause: string;
  };
  recommendation?: {
    title: string;
    expectedSavingKwh: number;
    expectedSavingKzt: number;
  };
}

export interface ConsumptionPoint {
  time: string;
  actualKwh: number;
  baselineKwh: number;
  anomalyPeriod: boolean;
}

export interface Anomaly {
  id: string;
  roomId: string;
  severity: "warning" | "critical";
  title: string;
  start: string;
  end: string;
  probableCause: string;
  description: string;
  monthlyLossKzt: number;
}

export interface ForecastPoint {
  time: string;
  value: number;
}

export interface Recommendation {
  id: string;
  roomId: string;
  title: string;
  description: string;
  expectedSavingKwh: number;
  expectedSavingKzt: number;
}

export interface Task {
  id: string;
  roomId: string;
  title: string;
  description: string;
  status: "open" | "done";
}

export interface Device {
  id: string;
  roomId: string;
  name: string;
  kind: DeviceKind;
  status: DeviceStatus;
  consumptionKwh: number;
  costKzt: number;
  sharePercent: number;
  recommendedAction?: string;
  recommendedToDisable: boolean;
  expectedSavingKwh: number;
  expectedSavingKzt: number;
}

export interface DashboardMetrics {
  energyTodayKwh: number;
  anomalies: number;
  potentialSavingsKzt: number;
}

export interface AnalysisSummary {
  anomaliesDetected: number;
  roomsNeedAttention: number;
  potentialSavingsKzt: number;
  highestImpactRoomId: string;
}
