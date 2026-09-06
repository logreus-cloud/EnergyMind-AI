"use client";

import { AlertTriangle, Check, ChevronRight, ClipboardCheck, DatabaseZap, Search, Sparkles, Trash2, Upload, X } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { FloorPlan } from "../components/FloorPlan/FloorPlan";
import { KPIBar } from "../components/Dashboard/KPIBar";
import { Sidebar } from "../components/Layout/Sidebar";
import { TopBar } from "../components/Layout/TopBar";
import { RoomPanel } from "../components/RoomDetails/RoomPanel";
import { Button } from "../components/UI/Button";
import {
  clearDataset,
  createTask,
  getRecommendations,
  getTasks,
  getAnomalies,
  getBuilding,
  getDashboardMetrics,
  getRecommendation,
  getRoomConsumption,
  getRoomDevices,
  runAiAnalysis,
  uploadDataset,
} from "../lib/api";
import { EnergyChart } from "../components/RoomDetails/EnergyChart";
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
type AppPath = "/overview" | "/floor-plan" | "/analytics" | "/anomalies" | "/recommendations" | "/tasks";

function normalizePath(pathname: string): AppPath {
  const supported: AppPath[] = ["/overview", "/floor-plan", "/analytics", "/anomalies", "/recommendations", "/tasks"];
  return supported.includes(pathname as AppPath) ? (pathname as AppPath) : "/overview";
}

function AppLoadingState() {
  return (
    <div className="em-state-card" role="status">
      <div className="em-loading-pulse" />
      <strong>Подключаем данные объекта</strong>
      <span>Загружаем план, потребление и активные рекомендации.</span>
    </div>
  );
}

function AppNotificationPanel({
  anomalies,
  tasks,
  onClose,
}: {
  anomalies: Anomaly[];
  tasks: Task[];
  onClose: () => void;
}) {
  return (
    <aside className="em-popover em-notifications" aria-label="Уведомления">
      <div className="em-popover__head">
        <div>
          <strong>Сигналы системы</strong>
          <span>{anomalies.length + tasks.filter((task) => task.status === "open").length} событий требуют внимания</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Закрыть уведомления">
          <X size={15} />
        </button>
      </div>
      {anomalies.slice(0, 4).map((anomaly) => (
        <div className="em-notification" key={anomaly.id}>
          <AlertTriangle size={15} className={anomaly.severity === "critical" ? "is-critical" : "is-warning"} />
          <div>
            <strong>{anomaly.title}</strong>
            <span>{anomaly.roomId} · экономия до {anomaly.monthlyLossKzt.toLocaleString("ru-RU")} ₸</span>
          </div>
        </div>
      ))}
      {tasks.filter((task) => task.status === "open").slice(0, 3).map((task) => (
        <div className="em-notification" key={task.id}>
          <ClipboardCheck size={15} />
          <div>
            <strong>{task.title}</strong>
            <span>Открытая задача · {task.roomId}</span>
          </div>
        </div>
      ))}
      {anomalies.length === 0 && tasks.length === 0 && <p className="em-empty-copy">Новых событий нет.</p>}
    </aside>
  );
}

type AppSearchResult = {
  id: string;
  label: string;
  detail: string;
  kind: "room" | "anomaly" | "task";
  room?: Room;
};

function AppSearchResults({
  query,
  results,
  onSelect,
  onClose,
}: {
  query: string;
  results: AppSearchResult[];
  onSelect: (room?: Room) => void;
  onClose: () => void;
}) {
  return (
    <div className="em-search-results">
      <div className="em-search-results__head">
        <span>Поиск по объекту</span>
        <button type="button" onClick={onClose} aria-label="Очистить поиск">
          <X size={14} />
        </button>
      </div>
      {results.length > 0 ? results.map((result) => (
        <button key={`${result.kind}-${result.id}`} type="button" onClick={() => onSelect(result.room)}>
          <Search size={14} />
          <span><strong>{result.label}</strong><small>{result.detail}</small></span>
          <ChevronRight size={14} />
        </button>
      )) : <p className="em-empty-copy">По запросу «{query}» ничего не найдено.</p>}
    </div>
  );
}

export default function HomePage() {
  const [currentPath, setCurrentPath] = useState<AppPath>("/overview");
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
  const [mode, setMode] = useState<"live" | "simulation">(
    process.env.NEXT_PUBLIC_USE_MOCKS === "true" ? "simulation" : "live",
  );
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const [consumption, setConsumption] = useState<ConsumptionPoint[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceStates, setDeviceStates] = useState<Record<string, DeviceStatus>>({});
  const [deviceFilter, setDeviceFilter] = useState<"all" | "recommended">("all");
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [createdTask, setCreatedTask] = useState<Task | null>(null);

  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisSummary, setAnalysisSummary] = useState<AnalysisSummary | null>(null);
  const [focusRoomId, setFocusRoomId] = useState<string>();

  const [errorMessage, setErrorMessage] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>();
  const [isUploading, setIsUploading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const path = normalizePath(window.location.pathname);
    setCurrentPath(path);
    const handlePopState = () => setCurrentPath(normalizePath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (path: string) => {
    const nextPath = normalizePath(path);
    window.history.pushState({}, "", nextPath);
    setCurrentPath(nextPath);
    setNotificationsOpen(false);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [buildingData, metricsData, anomaliesData, taskData] = await Promise.all([
          getBuilding(),
          getDashboardMetrics(),
          getAnomalies(),
          getTasks(),
        ]);
        setBuilding(buildingData);
        setMetrics(metricsData);
        setAnomalies(anomaliesData);
        setTasks(taskData);

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
        const recommendationsData = await getRecommendations(
          buildingData.floors.flatMap((floor) => floor.rooms).map((room) => room.id),
        );
        setRecommendations(recommendationsData);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Ошибка загрузки данных");
      } finally {
        setLoading(false);
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
      const [updatedBuilding, updatedMetrics, updatedAnomalies] = await Promise.all([
        getBuilding(),
        getDashboardMetrics(),
        getAnomalies(),
      ]);
      setBuilding(updatedBuilding);
      setMetrics(updatedMetrics);
      setAnomalies(updatedAnomalies);
      setRecommendations(
        await getRecommendations(
          updatedBuilding.floors.flatMap((floor) => floor.rooms).map((room) => room.id),
        ),
      );
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
      setTasks((currentTasks) => [task, ...currentTasks]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось создать задачу");
    }
  };

  const uploadConsumptionFile = async (file: File) => {
    setIsUploading(true);
    setErrorMessage(undefined);
    try {
      const dataset = await uploadDataset(file);
      setUploadedFileName(`${dataset.fileName}: ${dataset.measurementsCount} измерений`);
      setAnalysisState("idle");
      setAnalysisSummary(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось загрузить CSV");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDatasetUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadConsumptionFile(file);
    }
    event.target.value = "";
  };

  const handleDemoUpload = async () => {
    try {
      const response = await fetch("/demo-consumption.csv");
      if (!response.ok) {
        throw new Error("Не удалось загрузить демо-CSV.");
      }
      const file = new File(
        [await response.blob()],
        "demo-consumption.csv",
        { type: "text/csv" },
      );
      await uploadConsumptionFile(file);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось загрузить демо-CSV");
    }
  };

  const handleClearDataset = async () => {
    if (!window.confirm("Очистить загруженный CSV и результаты анализа для этого объекта?")) {
      return;
    }

    setIsClearing(true);
    setErrorMessage(undefined);
    try {
      await clearDataset();
      setMetrics({ energyTodayKwh: 0, anomalies: 0, potentialSavingsKzt: 0 });
      setAnomalies([]);
      setRecommendations([]);
      setConsumption([]);
      setDevices([]);
      setRecommendation(null);
      setAnalysisSummary(null);
      setAnalysisState("idle");
      setUploadedFileName(undefined);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось очистить данные");
    } finally {
      setIsClearing(false);
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

  const searchQuery = searchValue.trim().toLowerCase();
  const searchResults = searchQuery
    ? [
        ...allRooms
          .filter((room) => `${room.name} ${room.type}`.toLowerCase().includes(searchQuery))
          .map((room) => ({ id: room.id, label: room.name, detail: room.type, kind: "room" as const, room })),
        ...anomalies
          .filter((anomaly) => `${anomaly.title} ${anomaly.probableCause}`.toLowerCase().includes(searchQuery))
          .map((anomaly) => ({
            id: anomaly.id,
            label: anomaly.title,
            detail: `Аномалия · ${anomaly.roomId}`,
            kind: "anomaly" as const,
            room: allRooms.find((room) => room.id === anomaly.roomId),
          })),
        ...tasks
          .filter((task) => `${task.title} ${task.description}`.toLowerCase().includes(searchQuery))
          .map((task) => ({
            id: task.id,
            label: task.title,
            detail: "Задача",
            kind: "task" as const,
            room: allRooms.find((room) => room.id === task.roomId),
          })),
      ].slice(0, 8)
    : [];

  const selectSearchResult = (room?: Room) => {
    if (!room) return;
    setActiveFloor(room.floor);
    setSelectedRoomId(room.id);
    setFocusRoomId(room.id);
    setSearchValue("");
    navigate("/floor-plan");
  };

  const renderCurrentPage = () => {
    if (currentPath === "/analytics") {
      return (
        <AnalyticsView
          rooms={currentFloor?.rooms ?? []}
          selectedRoom={selectedRoom}
          consumption={consumption}
          onSelectRoom={selectSearchResult}
        />
      );
    }

    function AnalyticsView({
      rooms,
      selectedRoom,
      consumption,
      onSelectRoom,
    }: {
      rooms: Room[];
      selectedRoom?: Room;
      consumption: ConsumptionPoint[];
      onSelectRoom: (room?: Room) => void;
    }) {
      return (
        <section className="em-route-view">
          <div className="em-route-view__intro">
            <div>
              <span className="em-eyebrow">Энергопрофиль этажа</span>
              <h1>Аналитика нагрузки</h1>
              <p>Фактическое потребление и базовый профиль выбранного помещения.</p>
            </div>
            <div className="em-route-stat">
              <strong>{rooms.reduce((total, room) => total + room.consumptionKwh, 0).toFixed(1)} kWh</strong>
              <span>суммарная нагрузка этажа</span>
            </div>
          </div>
          <div className="em-analytics-layout">
            <div className="em-route-list">
              {rooms.map((room) => (
                <button
                  className={`em-route-list__item ${selectedRoom?.id === room.id ? "is-selected" : ""}`}
                  type="button"
                  key={room.id}
                  onClick={() => onSelectRoom(room)}
                >
                  <span className={`em-status-dot em-status-dot--${room.status}`} />
                  <span>
                    <strong>{room.name}</strong>
                    <small>{room.type}</small>
                  </span>
                  <b>{room.consumptionKwh.toFixed(1)} kWh</b>
                </button>
              ))}
            </div>
            <div className="em-route-chart">
              {selectedRoom && consumption.length > 0 ? (
                <>
                  <div className="em-panel-heading">
                    <div>
                      <span className="em-eyebrow">Помещение</span>
                      <h2>{selectedRoom.name}</h2>
                    </div>
                    <span className={`em-status-label em-status-label--${selectedRoom.status}`}>{selectedRoom.status}</span>
                  </div>
                  <EnergyChart data={consumption} anomalyPeriod={selectedRoom.anomaly} />
                </>
              ) : (
                <div className="em-state-card em-state-card--compact">
                  <strong>Выберите помещение</strong>
                  <span>График появится после загрузки его профиля.</span>
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }

    function AnomaliesView({
      anomalies,
      rooms,
      onSelectRoom,
    }: {
      anomalies: Anomaly[];
      rooms: Room[];
      onSelectRoom: (room?: Room) => void;
    }) {
      return (
        <section className="em-route-view">
          <div className="em-route-view__intro">
            <div>
              <span className="em-eyebrow">Приоритетный список</span>
              <h1>Аномалии энергопотребления</h1>
              <p>Сигналы отсортированы по серьёзности и потенциальным потерям.</p>
            </div>
            <div className="em-route-stat em-route-stat--alert">
              <strong>{anomalies.length}</strong>
              <span>активных сигналов</span>
            </div>
          </div>
          {anomalies.length > 0 ? (
            <div className="em-anomaly-list">
              {anomalies.map((anomaly) => {
                const room = rooms.find((item) => item.id === anomaly.roomId);
                return (
                  <article className={`em-anomaly-card em-anomaly-card--${anomaly.severity}`} key={anomaly.id}>
                    <div className="em-anomaly-card__icon"><AlertTriangle size={17} /></div>
                    <div className="em-anomaly-card__body">
                      <div className="em-anomaly-card__topline">
                        <span>{anomaly.severity === "critical" ? "Критическая" : "Повышенное потребление"}</span>
                        <b>{anomaly.roomId}</b>
                      </div>
                      <h2>{anomaly.title}</h2>
                      <p>{anomaly.description}</p>
                      <small>Вероятная причина: {anomaly.probableCause}</small>
                    </div>
                    <div className="em-anomaly-card__action">
                      <strong>{anomaly.monthlyLossKzt.toLocaleString("ru-RU")} ₸</strong>
                      <span>потенциал / месяц</span>
                      <Button type="button" variant="secondary" size="sm" onClick={() => onSelectRoom(room)}>
                        Открыть помещение
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="em-state-card"><Check size={20} /><strong>Аномалий не обнаружено</strong><span>Профиль объекта находится в пределах базовой линии.</span></div>
          )}
        </section>
      );
    }

    function RecommendationsView({
      recommendations,
      rooms,
      onSelectRoom,
    }: {
      recommendations: Recommendation[];
      rooms: Room[];
      onSelectRoom: (room?: Room) => void;
    }) {
      return (
        <section className="em-route-view">
          <div className="em-route-view__intro">
            <div>
              <span className="em-eyebrow">Следующий шаг</span>
              <h1>Рекомендации AI</h1>
              <p>Действия, которые сокращают расход без вмешательства в backend-сценарии.</p>
            </div>
            <div className="em-route-stat em-route-stat--saving">
              <strong>{recommendations.reduce((sum, item) => sum + item.expectedSavingKzt, 0).toLocaleString("ru-RU")} ₸</strong>
              <span>расчётная экономия / месяц</span>
            </div>
          </div>
          {recommendations.length > 0 ? (
            <div className="em-recommendation-grid">
              {recommendations.map((recommendation) => {
                const room = rooms.find((item) => item.id === recommendation.roomId);
                return (
                  <article className="em-recommendation-card" key={recommendation.id}>
                    <div className="em-recommendation-card__tag"><Sparkles size={13} /> AI recommendation</div>
                    <h2>{recommendation.title}</h2>
                    <p>{recommendation.description}</p>
                    <div className="em-recommendation-card__saving">
                      <strong>{recommendation.expectedSavingKwh} kWh</strong>
                      <span>≈ {recommendation.expectedSavingKzt.toLocaleString("ru-RU")} ₸ / месяц</span>
                    </div>
                    <Button type="button" variant="secondary" size="sm" onClick={() => onSelectRoom(room)}>
                      Посмотреть на плане
                    </Button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="em-state-card"><Sparkles size={20} /><strong>Рекомендации появятся после анализа</strong><span>Запустите AI-анализ, чтобы получить действия для помещений.</span></div>
          )}
        </section>
      );
    }

    function TasksView({ tasks, rooms }: { tasks: Task[]; rooms: Room[] }) {
      return (
        <section className="em-route-view">
          <div className="em-route-view__intro">
            <div>
              <span className="em-eyebrow">Контроль исполнения</span>
              <h1>Задачи энергоменеджера</h1>
              <p>Задачи создаются из рекомендаций и сохраняются в backend.</p>
            </div>
            <div className="em-route-stat">
              <strong>{tasks.filter((task) => task.status === "open").length}</strong>
              <span>открытых задач</span>
            </div>
          </div>
          {tasks.length > 0 ? (
            <div className="em-task-list">
              {tasks.map((task) => {
                const room = rooms.find((item) => item.id === task.roomId);
                return (
                  <article className="em-task-row" key={task.id}>
                    <div className={`em-task-row__status em-task-row__status--${task.status}`}><ClipboardCheck size={16} /></div>
                    <div className="em-task-row__body">
                      <strong>{task.title}</strong>
                      <span>{room?.name ?? task.roomId} · {task.description}</span>
                    </div>
                    <span className={`em-task-badge em-task-badge--${task.status}`}>{task.status === "open" ? "Открыта" : "Выполнена"}</span>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="em-state-card"><ClipboardCheck size={20} /><strong>Задач пока нет</strong><span>Создайте задачу из панели помещения после выбора рекомендации.</span></div>
          )}
        </section>
      );
    }
    if (currentPath === "/anomalies") {
      return (
        <AnomaliesView
          anomalies={anomalies}
          rooms={allRooms}
          onSelectRoom={selectSearchResult}
        />
      );
    }
    if (currentPath === "/recommendations") {
      return <RecommendationsView recommendations={recommendations} rooms={allRooms} onSelectRoom={selectSearchResult} />;
    }
    if (currentPath === "/tasks") {
      return <TasksView tasks={tasks} rooms={allRooms} />;
    }
    return (
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
            navigate("/floor-plan");
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
    );
  };

  return (
    <main className="em-app" data-theme={theme}>
      <Sidebar
        buildingName={building?.name ?? "Главный корпус"}
        floors={building?.floors ?? []}
        activeFloor={activeFloor}
        onSelectFloor={setActiveFloor}
        metrics={metrics}
        currentPath={currentPath}
        onNavigate={navigate}
        mode={mode}
      />

      <section className="em-main">
        <TopBar
          buildingName={building?.name ?? "Главный корпус"}
          activeFloor={activeFloor}
          floors={building?.floors ?? []}
          mode={mode}
          onModeChange={setMode}
          onSelectFloor={setActiveFloor}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          notificationCount={anomalies.length + tasks.filter((task) => task.status === "open").length}
          onNotificationsOpen={() => setNotificationsOpen((open) => !open)}
          theme={theme}
          onThemeChange={setTheme}
        />

        <div className="em-main__content">
          {notificationsOpen && (
            <AppNotificationPanel anomalies={anomalies} tasks={tasks} onClose={() => setNotificationsOpen(false)} />
          )}
          {searchQuery && (
            <AppSearchResults
              query={searchValue}
              results={searchResults}
              onSelect={selectSearchResult}
              onClose={() => setSearchValue("")}
            />
          )}
          {errorMessage && (
            <div className="em-error" role="alert">
              <strong>Не удалось обновить данные</strong>
              <span>{errorMessage}</span>
              <button type="button" onClick={() => window.location.reload()}>Повторить</button>
            </div>
          )}
          <KPIBar metrics={metrics} period={period} onPeriodChange={setPeriod} />

          <section className="em-analysis">
            <div className="em-analysis__head">
              <div className="em-analysis__actions">
                <input
                  ref={fileInputRef}
                  className="em-visually-hidden"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleDatasetUpload}
                />
                <Button
                  type="button"
                  variant="ghost"
                  icon={<Upload size={14} />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || analysisState === "running"}
                >
                  {isUploading ? "Загружаем CSV..." : "Загрузить CSV"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  icon={<DatabaseZap size={14} />}
                  onClick={handleDemoUpload}
                  disabled={isUploading || isClearing || analysisState === "running"}
                >
                  Загрузить демо
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  icon={<Sparkles size={14} />}
                  onClick={startAnalysis}
                  disabled={analysisState === "running"}
                >
                  {analysisState === "running" ? "Анализируем здание..." : "Запустить AI-анализ"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  icon={<Trash2 size={14} />}
                  onClick={handleClearDataset}
                  disabled={isUploading || isClearing || analysisState === "running"}
                >
                  {isClearing ? "Очищаем..." : "Очистить"}
                </Button>
                {uploadedFileName && <span className="em-analysis__dataset">{uploadedFileName}</span>}
              </div>
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

          {loading ? <AppLoadingState /> : renderCurrentPage()}
        </div>
      </section>
    </main>
  );
}
