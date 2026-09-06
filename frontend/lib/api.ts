import type {
  AnalysisSummary,
  Anomaly,
  Building,
  ConsumptionPoint,
  DashboardMetrics,
  Device,
  DeviceStatus,
  Floor,
  Recommendation,
  Room,
  RoomStatus,
  Task,
} from "../types";

type RoomSeed = {
  code: string;
  type: string;
  areaM2: number;
  position: { x: number; y: number; width: number; height: number };
};

const roomSeeds: RoomSeed[] = [
  { code: "A-201", type: "Офис", areaM2: 42, position: { x: 40, y: 40, width: 180, height: 120 } },
  { code: "A-202", type: "Офис", areaM2: 38, position: { x: 230, y: 40, width: 170, height: 120 } },
  { code: "A-203", type: "Аудитория", areaM2: 54, position: { x: 410, y: 40, width: 220, height: 120 } },
  { code: "A-205", type: "Переговорная", areaM2: 46, position: { x: 640, y: 40, width: 170, height: 120 } },
  { code: "A-206", type: "Открытая зона", areaM2: 60, position: { x: 820, y: 40, width: 180, height: 120 } },
  { code: "Server-01", type: "Серверная", areaM2: 34, position: { x: 1010, y: 40, width: 150, height: 120 } },
  { code: "Lab-01", type: "Лаборатория", areaM2: 48, position: { x: 40, y: 170, width: 180, height: 120 } },
  { code: "Office-01", type: "Кабинет", areaM2: 40, position: { x: 40, y: 300, width: 180, height: 100 } },
  { code: "Storage-01", type: "Склад", areaM2: 30, position: { x: 40, y: 410, width: 180, height: 90 } },
  { code: "Tech-01", type: "Техпомещение", areaM2: 58, position: { x: 40, y: 510, width: 180, height: 150 } },
  { code: "Meeting-01", type: "Переговорная", areaM2: 44, position: { x: 1010, y: 170, width: 150, height: 120 } },
  { code: "Meeting-02", type: "Переговорная", areaM2: 39, position: { x: 1010, y: 300, width: 150, height: 100 } },
  { code: "HVAC-01", type: "Инженерная зона", areaM2: 50, position: { x: 1010, y: 410, width: 150, height: 120 } },
  { code: "A-204", type: "Офис", areaM2: 34, position: { x: 1010, y: 540, width: 150, height: 120 } },
  { code: "B-301", type: "Офис", areaM2: 36, position: { x: 230, y: 570, width: 170, height: 130 } },
  { code: "B-302", type: "Офис", areaM2: 36, position: { x: 410, y: 570, width: 170, height: 130 } },
  { code: "B-303", type: "Зона аналитики", areaM2: 41, position: { x: 590, y: 570, width: 170, height: 130 } },
  { code: "B-304", type: "Офис", areaM2: 35, position: { x: 770, y: 570, width: 170, height: 130 } },
  { code: "Lobby-01", type: "Лобби", areaM2: 64, position: { x: 280, y: 220, width: 160, height: 120 } },
  { code: "Stair-01", type: "Лестница", areaM2: 48, position: { x: 450, y: 220, width: 140, height: 120 } },
  { code: "Control-01", type: "Диспетчерская", areaM2: 52, position: { x: 600, y: 220, width: 160, height: 120 } },
  { code: "Electric-01", type: "Электрощитовая", areaM2: 43, position: { x: 770, y: 220, width: 130, height: 120 } },
  { code: "Ops-01", type: "Операционный центр", areaM2: 56, position: { x: 450, y: 350, width: 200, height: 120 } },
  { code: "Break-01", type: "Кухня", areaM2: 32, position: { x: 660, y: 350, width: 170, height: 120 } },
];

const floor2Overrides: Record<string, Partial<Room>> = {
  "A-203": {
    status: "critical",
    consumptionKwh: 4.2,
    baselineKwh: 2.5,
    deviationPercent: 68,
    occupancy: "Учебные занятия до 21:00",
    hvacZone: "Климатический контур C",
    anomaly: {
      start: "22:00",
      end: "06:00",
      probableCause: "HVAC продолжает работать после окончания занятий.",
    },
    recommendation: {
      title: "Отключать HVAC после 21:00",
      expectedSavingKwh: 126,
      expectedSavingKzt: 3780,
    },
  },
  "A-205": {
    status: "warning",
    consumptionKwh: 3.1,
    baselineKwh: 2.37,
    deviationPercent: 31,
    occupancy: "Переговоры 09:00–19:00",
    hvacZone: "Климатический контур B",
    anomaly: {
      start: "12:00",
      end: "14:00",
      probableCause: "Оборудование в комнате запускается одновременно в пиковые часы.",
    },
    recommendation: {
      title: "Ограничить одновременный старт оборудования",
      expectedSavingKwh: 58,
      expectedSavingKzt: 1740,
    },
  },
  "Lab-01": {
    status: "forecast",
    consumptionKwh: 2.9,
    baselineKwh: 2.34,
    deviationPercent: 24,
    occupancy: "Лабораторные циклы",
    hvacZone: "Климатический контур D",
    recommendation: {
      title: "Перенести часть вычислительных задач на ночной тариф",
      expectedSavingKwh: 42,
      expectedSavingKzt: 1260,
    },
  },
  "Meeting-02": {
    status: "warning",
    consumptionKwh: 2.8,
    baselineKwh: 2.2,
    deviationPercent: 27,
  },
  "B-303": {
    status: "warning",
    consumptionKwh: 2.7,
    baselineKwh: 2.1,
    deviationPercent: 29,
  },
};

const floor1Overrides: Record<string, Partial<Room>> = {
  "Lab-01": { status: "normal", consumptionKwh: 2.2, baselineKwh: 2.3, deviationPercent: -4 },
  "A-205": { status: "normal", consumptionKwh: 2.2, baselineKwh: 2.1, deviationPercent: 5 },
  "B-303": { status: "warning", consumptionKwh: 2.6, baselineKwh: 2.2, deviationPercent: 18 },
  "Meeting-02": { status: "normal", consumptionKwh: 2.0, baselineKwh: 2.1, deviationPercent: -5 },
};

const floor3: Floor = {
  id: "floor-3",
  label: "3",
  level: 3,
  width: 1200,
  height: 760,
  rooms: [],
};

const floor4: Floor = {
  id: "floor-4",
  label: "4",
  level: 4,
  width: 1200,
  height: 760,
  rooms: [],
};

const floor1 = buildFloor(1, "1", floor1Overrides);
const floor2 = buildFloor(2, "2", floor2Overrides);

const mockBuilding: Building = {
  id: "main-building",
  name: "Главный корпус",
  address: "Алматы, проспект Абая 18",
  floors: [floor1, floor2, floor3, floor4],
};

const mockAnomalies: Anomaly[] = [
  {
    id: "anomaly-f2-a203",
    roomId: roomId(2, "A-203"),
    severity: "critical",
    title: "Ночное потребление выше базового профиля",
    start: "22:00",
    end: "06:00",
    probableCause: "HVAC продолжает работать после 21:00.",
    description: "Аудитория расходует энергию вне расписания занятий.",
    monthlyLossKzt: 3780,
  },
  {
    id: "anomaly-f2-a205",
    roomId: roomId(2, "A-205"),
    severity: "warning",
    title: "Пиковая дневная нагрузка",
    start: "12:00",
    end: "14:00",
    probableCause: "Одновременный запуск освещения и презентационного оборудования.",
    description: "В переговорной комнате повторяются пики в обеденный слот.",
    monthlyLossKzt: 1740,
  },
  {
    id: "anomaly-f2-b303",
    roomId: roomId(2, "B-303"),
    severity: "warning",
    title: "Стабильный перерасход в рабочие часы",
    start: "10:00",
    end: "18:00",
    probableCause: "Режим освещения и вентиляции не учитывает фактическую занятость.",
    description: "Зона аналитики работает с избыточной базовой нагрузкой.",
    monthlyLossKzt: 1320,
  },
];

const mockMetrics: DashboardMetrics = {
  energyTodayKwh: 8421,
  anomalies: 3,
  potentialSavingsKzt: 42800,
};

const mockAnalysisSummary: AnalysisSummary = {
  anomaliesDetected: 3,
  roomsNeedAttention: 2,
  potentialSavingsKzt: 42800,
  highestImpactRoomId: roomId(2, "A-203"),
};

const mockRecommendations: Record<string, Recommendation> = Object.fromEntries(
  [floor1, floor2]
    .flatMap((floor) => floor.rooms)
    .filter((room) => room.recommendation)
    .map((room) => [
      room.id,
      {
        id: `recommendation-${room.id}`,
        roomId: room.id,
        title: room.recommendation!.title,
        description:
          room.status === "critical"
            ? "Переключите HVAC в автоматический ночной сценарий и исключите работу после 21:00."
            : "Скорректируйте расписание оборудования по фактической занятости помещения.",
        expectedSavingKwh: room.recommendation!.expectedSavingKwh,
        expectedSavingKzt: room.recommendation!.expectedSavingKzt,
      },
    ]),
);

let taskSequence = 1;

async function requestApi<T>(endpoint: string, init?: RequestInit): Promise<T | null> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) {
    return null;
  }

  const response = await fetch(`${apiBase}${endpoint}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function getBuilding(): Promise<Building> {
  const remote = await requestApi<Building>("/buildings/main");
  return remote ?? mockBuilding;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const remote = await requestApi<DashboardMetrics>("/metrics/dashboard");
  return remote ?? mockMetrics;
}

export async function getAnomalies(): Promise<Anomaly[]> {
  const remote = await requestApi<Anomaly[]>("/anomalies");
  return remote ?? mockAnomalies;
}

export async function getRoomConsumption(roomIdValue: string): Promise<ConsumptionPoint[]> {
  const remote = await requestApi<ConsumptionPoint[]>(`/rooms/${roomIdValue}/consumption`);
  if (remote) {
    return remote;
  }

  const room = findRoom(roomIdValue);
  const baseline = room?.baselineKwh ?? 2.1;
  const status = room?.status ?? "normal";
  return buildConsumptionSeries(baseline, status);
}

export async function getRoomDevices(roomIdValue: string): Promise<Device[]> {
  const remote = await requestApi<Device[]>(`/rooms/${roomIdValue}/devices`);
  if (remote) {
    return remote;
  }
  return buildDeviceList(roomIdValue);
}

export async function getRecommendation(roomIdValue: string): Promise<Recommendation | null> {
  const remote = await requestApi<Recommendation>(`/rooms/${roomIdValue}/recommendation`);
  if (remote) {
    return remote;
  }
  return mockRecommendations[roomIdValue] ?? null;
}

export async function runAiAnalysis(): Promise<AnalysisSummary> {
  const remote = await requestApi<AnalysisSummary>("/analysis/run", { method: "POST" });
  if (remote) {
    return remote;
  }
  await wait(600);
  return mockAnalysisSummary;
}

export async function createTask(input: {
  roomId: string;
  title: string;
  description: string;
}): Promise<Task> {
  const remote = await requestApi<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (remote) {
    return remote;
  }

  const task: Task = {
    id: `task-${taskSequence}`,
    roomId: input.roomId,
    title: input.title,
    description: input.description,
    status: "open",
  };
  taskSequence += 1;
  await wait(200);
  return task;
}

function roomId(floor: number, code: string): string {
  return `f${floor}-${code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function buildFloor(level: number, label: string, overrides: Record<string, Partial<Room>>): Floor {
  return {
    id: `floor-${level}`,
    label,
    level,
    width: 1200,
    height: 760,
    rooms: roomSeeds.map((seed, index) => {
      const baseLoad = 1.9 + (index % 5) * 0.25;
      const baseline = Number(baseLoad.toFixed(2));
      const defaultConsumption = Number((baseline * (0.98 + ((index + level) % 3) * 0.04)).toFixed(2));
      const defaultDeviation = Math.round(((defaultConsumption - baseline) / baseline) * 100);
      const override = overrides[seed.code];
      const consumptionKwh = override?.consumptionKwh ?? defaultConsumption;
      const baselineKwh = override?.baselineKwh ?? baseline;
      const deviationPercent =
        override?.deviationPercent ?? Math.round(((consumptionKwh - baselineKwh) / baselineKwh) * 100);

      return {
        id: roomId(level, seed.code),
        name: seed.code,
        type: seed.type,
        floor: level,
        areaM2: seed.areaM2,
        position: seed.position,
        status: (override?.status as RoomStatus | undefined) ?? "normal",
        consumptionKwh,
        baselineKwh,
        deviationPercent: Number.isFinite(deviationPercent) ? deviationPercent : defaultDeviation,
        occupancy: override?.occupancy ?? defaultOccupancy(seed.type),
        hvacZone: override?.hvacZone ?? defaultHvacZone(seed.type),
        anomaly: override?.anomaly,
        recommendation: override?.recommendation,
      };
    }),
  };
}

function defaultOccupancy(type: string): string {
  if (type.includes("Переговор")) return "Встречи 09:00–19:00";
  if (type.includes("Аудитория")) return "Занятия до 21:00";
  if (type.includes("Сервер")) return "24/7";
  if (type.includes("Лаборатория")) return "Лаб-циклы 08:00–20:00";
  return "Рабочие часы";
}

function defaultHvacZone(type: string): string {
  if (type.includes("Сервер")) return "Контур Server";
  if (type.includes("Лаборатория")) return "Контур D";
  if (type.includes("Аудитория")) return "Контур C";
  if (type.includes("Инженер")) return "Контур Tech";
  return "Контур A";
}

function findRoom(roomIdValue: string): Room | undefined {
  return mockBuilding.floors.flatMap((floor) => floor.rooms).find((room) => room.id === roomIdValue);
}

function buildConsumptionSeries(base: number, status: RoomStatus): ConsumptionPoint[] {
  const slots = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "22:00", "23:00"];
  const baseline = slots.map((time, index) => {
    const slightShift = Math.sin(index / 1.7) * 0.12;
    return Number((base + slightShift).toFixed(2));
  });

  const criticalCurve = [3.8, 3.7, 3.3, 2.8, 3.4, 3.8, 4.0, 4.1, 4.2, 3.9];
  const warningCurve = [2.2, 2.1, 2.0, 2.3, 2.9, 3.1, 2.8, 2.4, 2.3, 2.2];
  const normalCurve = baseline.map((value, index) => Number((value * (0.96 + (index % 4) * 0.02)).toFixed(2)));
  const forecastCurve = baseline.map((value, index) => Number((value * (1.05 + (index % 3) * 0.03)).toFixed(2)));

  const actual =
    status === "critical"
      ? criticalCurve
      : status === "warning"
        ? warningCurve
        : status === "forecast"
          ? forecastCurve
          : normalCurve;

  return slots.map((time, index) => ({
    time,
    actualKwh: Number(actual[index].toFixed(2)),
    baselineKwh: Number(baseline[index].toFixed(2)),
    anomalyPeriod: time === "22:00" || time === "23:00" || time === "00:00" || time === "03:00" || time === "06:00",
  }));
}

function buildDeviceList(roomIdValue: string): Device[] {
  const room = findRoom(roomIdValue);
  if (!room) return [];

  const isCritical = room.status === "critical";
  const isWarning = room.status === "warning";
  const recommendedForLighting = room.status === "warning" && room.name !== "A-203";

  const baseDevices: Device[] = [
    {
      id: `${room.id}-hvac`,
      roomId: room.id,
      name: "HVAC модуль",
      kind: "climate",
      status: (isCritical ? "on" : "standby") as DeviceStatus,
      consumptionKwh: isCritical ? 2.6 : isWarning ? 1.3 : 0.8,
      costKzt: isCritical ? 78 : isWarning ? 39 : 24,
      sharePercent: isCritical ? 62 : isWarning ? 39 : 31,
      recommendedAction: isCritical ? "Отключить после 21:00" : undefined,
      recommendedToDisable: isCritical,
      expectedSavingKwh: isCritical ? 98 : 0,
      expectedSavingKzt: isCritical ? 2940 : 0,
    },
    {
      id: `${room.id}-light`,
      roomId: room.id,
      name: "Освещение",
      kind: "lighting",
      status: "on",
      consumptionKwh: isCritical ? 0.9 : isWarning ? 1.1 : 0.7,
      costKzt: isCritical ? 27 : isWarning ? 33 : 21,
      sharePercent: isCritical ? 21 : isWarning ? 35 : 28,
      recommendedAction: recommendedForLighting ? "Снизить яркость после 18:00" : undefined,
      recommendedToDisable: recommendedForLighting,
      expectedSavingKwh: recommendedForLighting ? 24 : 0,
      expectedSavingKzt: recommendedForLighting ? 720 : 0,
    },
    {
      id: `${room.id}-display`,
      roomId: room.id,
      name: "Презентационная панель",
      kind: "display",
      status: isCritical ? "standby" : "off",
      consumptionKwh: isCritical ? 0.5 : 0.1,
      costKzt: isCritical ? 15 : 3,
      sharePercent: isCritical ? 12 : 4,
      recommendedAction: isCritical ? "Выключить полностью после занятий" : undefined,
      recommendedToDisable: isCritical,
      expectedSavingKwh: isCritical ? 18 : 0,
      expectedSavingKzt: isCritical ? 540 : 0,
    },
    {
      id: `${room.id}-network`,
      roomId: room.id,
      name: "Сетевой модуль",
      kind: "network",
      status: "on",
      consumptionKwh: 0.3,
      costKzt: 9,
      sharePercent: 7,
      recommendedToDisable: false,
      expectedSavingKwh: 0,
      expectedSavingKzt: 0,
    },
    {
      id: `${room.id}-server`,
      roomId: room.id,
      name: "Локальный вычислительный узел",
      kind: "server",
      status: room.type.includes("Сервер") ? "on" : "standby",
      consumptionKwh: room.type.includes("Сервер") ? 1.7 : 0.4,
      costKzt: room.type.includes("Сервер") ? 51 : 12,
      sharePercent: room.type.includes("Сервер") ? 45 : 10,
      recommendedToDisable: false,
      expectedSavingKwh: 0,
      expectedSavingKzt: 0,
    },
  ];

  return baseDevices;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
