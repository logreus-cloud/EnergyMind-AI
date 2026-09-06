"use client";

import { Check, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FloorPlan } from "../components/FloorPlan/FloorPlan";
import { KPIBar } from "../components/Dashboard/KPIBar";
import { Sidebar } from "../components/Layout/Sidebar";
import { TopBar } from "../components/Layout/TopBar";
import { RoomPanel } from "../components/RoomDetails/RoomPanel";
import { Button } from "../components/UI/Button";
import {
  createTask,
  getAnomalies,
  getBuilding,
  getDashboardMetrics,
  getRecommendation,
  getRoomConsumption,
  getRoomDevices,
  runAiAnalysis,
} from "../lib/api";
import type {
  AnalysisSummary,
  Anomaly,
  Building,
  ConsumptionPoint,
  DashboardMetrics,
  Device,
  DeviceStatus,
  LayerType,
  Recommendation,
  Room,
  Task,
} from "../types";

const analysisSteps = [
  "Загрузка данных потребления",
  "Построение профилей помещений",
  "Детекция аномалий",
  "Прогнозирование нагрузки",
  "Формирование рекомендаций",
];

type AnalysisState = "idle" | "running" | "complete";

export default function HomePage() {
  const [building, setBuilding] = useState<Building | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    energyTodayKwh: 0,
    anomalies: 0,
    potentialSavingsKzt: 0,
  });
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [activeFloor, setActiveFloor] = useState(2);
  const [selectedRoomId, setSelectedRoomId] = useState<string>();
  const [layer, setLayer] = useState<LayerType>("energy");
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [mode, setMode] = useState<"live" | "simulation">("simulation");

  const [consumption, setConsumption] = useState<ConsumptionPoint[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceStates, setDeviceStates] = useState<Record<string, DeviceStatus>>({});
  const [deviceFilter, setDeviceFilter] = useState<"all" | "recommended">("all");
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [createdTask, setCreatedTask] = useState<Task | null>(null);

  const [analysisState, setAnalysisState] = useState<AnalysisState>("complete");
  const [analysisProgress, setAnalysisProgress] = useState(analysisSteps.length);
  const [analysisSummary, setAnalysisSummary] = useState<AnalysisSummary | null>(null);
  const [focusRoomId, setFocusRoomId] = useState<string>();

  const [errorMessage, setErrorMessage] = useState<string>();
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentFloor = building?.floors.find((floor) => floor.level === activeFloor);
  const allRooms = useMemo(
    () => (building ? building.floors.flatMap((floor) => floor.rooms) : []),
    [building],
  );
  const selectedRoom = useMemo(
    () => currentFloor?.rooms.find((room) => room.id === selectedRoomId),
    [currentFloor?.rooms, selectedRoomId],
  );
  const selectedAnomaly = anomalies.find((anomaly) => anomaly.roomId === selectedRoomId);

  const highestAnomaly = useMemo(
    () =>
      [...anomalies].sort((left, right) => {
        const severityRank = { critical: 2, warning: 1 };
        if (severityRank[left.severity] !== severityRank[right.severity]) {
          return severityRank[right.severity] - severityRank[left.severity];
        }
        return right.monthlyLossKzt - left.monthlyLossKzt;
      })[0],
    [anomalies],
  );
  const highestRoom = highestAnomaly
    ? allRooms.find((room) => room.id === highestAnomaly.roomId)
    : undefined;

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [buildingData, metricsData, anomaliesData] = await Promise.all([
          getBuilding(),
          getDashboardMetrics(),
          getAnomalies(),
        ]);
        setBuilding(buildingData);
        setMetrics(metricsData);
        setAnomalies(anomaliesData);
        setAnalysisSummary({
          anomaliesDetected: metricsData.anomalies,
          roomsNeedAttention: 2,
          potentialSavingsKzt: metricsData.potentialSavingsKzt,
          highestImpactRoomId: anomaliesData[0]?.roomId ?? "",
        });

        const preferredRoom = anomaliesData[0]?.roomId;
        const fallbackRoom = buildingData.floors.find((floor) => floor.level === 2)?.rooms[0]?.id;
        const initialRoom = preferredRoom ?? fallbackRoom;
        if (initialRoom) {
          const room = buildingData.floors.flatMap((floor) => floor.rooms).find((item) => item.id === initialRoom);
          if (room) {
            setActiveFloor(room.floor);
            setSelectedRoomId(room.id);
            setFocusRoomId(room.id);
          }
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Ошибка загрузки данных");
      }
    };

    loadInitialData();

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!currentFloor) {
      return;
    }

    const roomExistsOnFloor = selectedRoomId
      ? currentFloor.rooms.some((room) => room.id === selectedRoomId)
      : false;
    if (!roomExistsOnFloor) {
      const firstRoom = currentFloor.rooms[0];
      setSelectedRoomId(firstRoom?.id);
      if (firstRoom) {
        setFocusRoomId(firstRoom.id);
      }
    }
  }, [activeFloor, currentFloor, selectedRoomId]);

  useEffect(() => {
    if (!selectedRoomId) {
      setConsumption([]);
      setDevices([]);
      setRecommendation(null);
      return;
    }

    const loadRoomData = async () => {
      try {
        const [consumptionData, devicesData, recommendationData] = await Promise.all([
          getRoomConsumption(selectedRoomId),
          getRoomDevices(selectedRoomId),
          getRecommendation(selectedRoomId),
        ]);
        setConsumption(consumptionData);
        setDevices(devicesData);
        setDeviceStates({});
        setDeviceFilter("all");
        setRecommendation(recommendationData);
        setCreatedTask(null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Ошибка загрузки данных комнаты");
      }
    };

    loadRoomData();
  }, [selectedRoomId]);

  const startAnalysis = async () => {
    if (analysisState === "running") {
      return;
    }
    setAnalysisState("running");
    setAnalysisProgress(0);
    setErrorMessage(undefined);

    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }
    progressTimerRef.current = setInterval(() => {
      setAnalysisProgress((currentValue) => {
        if (currentValue >= analysisSteps.length) {
          if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
          }
          return analysisSteps.length;
        }
        return currentValue + 1;
      });
    }, 420);

    try {
      const summary = await runAiAnalysis();
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      setAnalysisSummary(summary);
      setAnalysisProgress(analysisSteps.length);
      setAnalysisState("complete");
      setFocusRoomId(summary.highestImpactRoomId);
    } catch (error) {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      setAnalysisState("idle");
      setErrorMessage(error instanceof Error ? error.message : "Ошибка AI-анализа");
    }
  };

  const handleCreateTask = async () => {
    if (!selectedRoom) {
      return;
    }

    const title = `Проверить график HVAC в ${selectedRoom.name}`;
    const description =
      selectedAnomaly?.probableCause ??
      `Проверить сценарии энергопотребления в помещении ${selectedRoom.name}.`;
    try {
      const task = await createTask({
        roomId: selectedRoom.id,
        title,
        description,
      });
      setCreatedTask(task);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось создать задачу");
    }
  };

  const handleViewHighestImpact = () => {
    if (!highestAnomaly) {
      return;
    }
    const room = allRooms.find((candidate) => candidate.id === highestAnomaly.roomId);
    if (!room) {
      return;
    }
    setActiveFloor(room.floor);
    setSelectedRoomId(room.id);
    setFocusRoomId(room.id);
  };

  const handleToggleDevice = (deviceId: string) => {
    const device = devices.find((item) => item.id === deviceId);
    if (!device) {
      return;
    }
    setDeviceStates((current) => {
      const currentStatus = current[deviceId] ?? device.status;
      return { ...current, [deviceId]: currentStatus === "off" ? "on" : "off" };
    });
  };

  return (
    <main className="em-app">
      <Sidebar
        buildingName={building?.name ?? "Главный корпус"}
        floors={building?.floors ?? []}
        activeFloor={activeFloor}
        onSelectFloor={setActiveFloor}
        metrics={metrics}
      />

      <section className="em-main">
        <TopBar
          buildingName={building?.name ?? "Главный корпус"}
          activeFloor={activeFloor}
          mode={mode}
          onModeChange={setMode}
        />

        <div className="em-main__content">
          <KPIBar metrics={metrics} period={period} onPeriodChange={setPeriod} />

          <section className="em-analysis">
            <div className="em-analysis__head">
              <Button
                type="button"
                variant="primary"
                icon={<Sparkles size={14} />}
                onClick={startAnalysis}
                disabled={analysisState === "running"}
              >
                {analysisState === "running" ? "Анализируем здание..." : "Запустить AI-анализ"}
              </Button>
              {analysisState === "complete" && analysisSummary && (
                <div className="em-analysis__summary">
                  <span>
                    {analysisSummary.anomaliesDetected} аномалии обнаружены ·{" "}
                    {analysisSummary.roomsNeedAttention} помещения требуют внимания
                  </span>
                  <strong>{analysisSummary.potentialSavingsKzt.toLocaleString("ru-RU")} ₸ / месяц</strong>
                </div>
              )}
            </div>

            {analysisState === "running" && (
              <div className="em-analysis__progress">
                {analysisSteps.map((step, index) => {
                  const done = index < analysisProgress;
                  const active = index === analysisProgress;
                  return (
                    <span key={step} className={`${done ? "is-done" : ""} ${active ? "is-active" : ""}`}>
                      {done ? <Check size={12} /> : <i />}
                      {step}
                    </span>
                  );
                })}
              </div>
            )}
          </section>

          {errorMessage && <div className="em-error">{errorMessage}</div>}

          <div className="em-grid">
            <FloorPlan
              floor={currentFloor}
              floors={building?.floors ?? []}
              activeFloor={activeFloor}
              onSelectFloor={setActiveFloor}
              selectedRoomId={selectedRoom?.id}
              analysisReady={analysisState === "complete"}
              activeLayer={layer}
              onLayerChange={setLayer}
              onSelectRoom={(room) => {
                setSelectedRoomId(room.id);
                setFocusRoomId(room.id);
              }}
              focusRoomId={focusRoomId}
              insight={
                analysisState === "complete" && highestAnomaly && highestRoom
                  ? {
                      anomaliesDetected: metrics.anomalies,
                      topRoom: highestRoom.name,
                      deviationPercent: Math.max(highestRoom.deviationPercent, 0),
                      monthlyLossKzt: highestAnomaly.monthlyLossKzt,
                    }
                  : null
              }
              onViewInsight={handleViewHighestImpact}
            />

            <RoomPanel
              room={selectedRoom}
              anomaly={selectedAnomaly}
              consumption={consumption}
              devices={devices}
              deviceStates={deviceStates}
              deviceFilter={deviceFilter}
              onDeviceFilterChange={setDeviceFilter}
              onToggleDevice={handleToggleDevice}
              recommendation={recommendation}
              task={createdTask}
              onCreateTask={handleCreateTask}
              onClose={() => setSelectedRoomId(undefined)}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
