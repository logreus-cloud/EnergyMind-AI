import express from "express";
import multer from "multer";
import { analyzeConsumption } from "./analytics.js";
import { parseConsumptionCsv } from "./csv.js";
import { getTenantStore } from "./store.js";
import {
  createAnalysisSummary,
  createConsumptionSeries,
  createDashboardAnomalies,
  createDashboardBuilding,
  createDashboardMetrics,
  createDashboardRecommendation,
  createDevices,
  getSourceRoomId
} from "./dashboard.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});
const tariffKzt = Number(process.env.ENERGY_TARIFF_KZT ?? 25);

export const app = express();
app.use(express.json());
app.use((request, response, next) => {
  response.setHeader(
    "Access-Control-Allow-Origin",
    process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"
  );
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Tenant-Id");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  if (request.method === "OPTIONS") {
    return response.sendStatus(204);
  }
  return next();
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

function attachTenantStore(request, response, next) {
  const tenantId = request.header("X-Tenant-Id")?.trim();
  if (!tenantId) {
    return response.status(401).json({
      error: "Для доступа к данным объекта передайте заголовок X-Tenant-Id."
    });
  }

  request.tenantStore = getTenantStore(tenantId);
  return next();
}

app.use("/api", attachTenantStore);
app.use(
  ["/buildings", "/metrics", "/anomalies", "/rooms", "/analysis", "/tasks"],
  attachTenantStore
);

app.post("/api/premises", (request, response) => {
  const { id, type, areaM2, workingHours, hasAirConditioning, hasLighting } =
    request.body;
  if (!id || !type || !Number.isFinite(areaM2)) {
    return response.status(400).json({
      error: "Поля id, type и areaM2 обязательны."
    });
  }

  const premise = {
    id,
    type,
    areaM2,
    workingHours: workingHours ?? "09-19",
    hasAirConditioning: Boolean(hasAirConditioning),
    hasLighting: Boolean(hasLighting)
  };
  request.tenantStore.premises.set(id, premise);
  return response.status(201).json(premise);
});

app.get("/api/premises", (request, response) => {
  response.json([...request.tenantStore.premises.values()]);
});

app.post("/api/datasets", upload.single("file"), (request, response) => {
  if (!request.file) {
    return response.status(400).json({
      error: "Передайте CSV-файл в поле file."
    });
  }

  try {
    const measurements = parseConsumptionCsv(request.file.buffer.toString("utf8"));
    const dataset = {
      id: crypto.randomUUID(),
      fileName: request.file.originalname,
      uploadedAt: new Date().toISOString(),
      measurements
    };
    request.tenantStore.datasets.push(dataset);
    request.tenantStore.analysis = null;
    return response.status(201).json({
      id: dataset.id,
      fileName: dataset.fileName,
      measurementsCount: measurements.length
    });
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }
});

app.delete("/api/datasets", (request, response) => {
  request.tenantStore.datasets = [];
  request.tenantStore.analysis = null;
  return response.sendStatus(204);
});

app.post("/api/analyses", (request, response) => {
  const dataset = request.tenantStore.datasets.at(-1);
  if (!dataset) {
    return response.status(404).json({ error: "Сначала загрузите CSV с потреблением." });
  }

  try {
    const analysis = analyzeConsumption({
      measurements: dataset.measurements,
      premises: request.tenantStore.premises,
      tariffKzt
    });
    request.tenantStore.analysis = analysis;
    return response.json({ datasetId: dataset.id, ...analysis });
  } catch (error) {
    return response.status(422).json({ error: error.message });
  }
});

app.post("/api/tasks", (request, response) => {
  const { recommendationId, title, assignee } = request.body;
  if (!recommendationId || !title) {
    return response.status(400).json({
      error: "Поля recommendationId и title обязательны."
    });
  }

  const recommendation = request.tenantStore.analysis?.recommendations.find(
    (item) => item.id === recommendationId
  );
  const task = {
    id: crypto.randomUUID(),
    recommendationId,
    roomId: recommendation?.roomId ?? "",
    title,
    description: recommendation?.explanation ?? title,
    assignee: assignee ?? null,
    priority: "medium",
    status: "open",
    createdAt: new Date().toISOString()
  };
  request.tenantStore.tasks.push(task);
  return response.status(201).json(task);
});

app.get("/api/tasks", (request, response) => {
  response.json(request.tenantStore.tasks);
});

app.get("/buildings/main", (request, response) => {
  response.json(createDashboardBuilding(request.tenantStore));
});

app.get("/metrics/dashboard", (request, response) => {
  response.json(createDashboardMetrics(request.tenantStore, tariffKzt));
});

app.get("/anomalies", (request, response) => {
  response.json(createDashboardAnomalies(request.tenantStore, tariffKzt));
});

app.get("/rooms/:roomId/consumption", (request, response) => {
  response.json(createConsumptionSeries(request.tenantStore, request.params.roomId));
});

app.get("/rooms/:roomId/devices", (request, response) => {
  response.json(createDevices(request.tenantStore, request.params.roomId, tariffKzt));
});

app.get("/rooms/:roomId/recommendation", (request, response) => {
  response.json(
    createDashboardRecommendation(request.tenantStore, request.params.roomId)
  );
});

app.post("/analysis/run", (request, response) => {
  const dataset = request.tenantStore.datasets.at(-1);
  if (!dataset) {
    return response.status(404).json({ error: "Сначала загрузите CSV с потреблением." });
  }

  try {
    request.tenantStore.analysis = analyzeConsumption({
      measurements: dataset.measurements,
      premises: request.tenantStore.premises,
      tariffKzt
    });
    return response.json(createAnalysisSummary(request.tenantStore, tariffKzt));
  } catch (error) {
    return response.status(422).json({ error: error.message });
  }
});

app.post("/tasks", (request, response) => {
  const { roomId, title, description } = request.body;
  if (!roomId || !title || !description) {
    return response.status(400).json({
      error: "Поля roomId, title и description обязательны."
    });
  }

  const recommendation = request.tenantStore.analysis?.recommendations.find(
    (item) => item.roomId === getSourceRoomId(roomId)
  );
  const task = {
    id: crypto.randomUUID(),
    roomId,
    title,
    description,
    recommendationId: recommendation?.id,
    assignee: null,
    priority: "medium",
    createdAt: new Date().toISOString(),
    status: "open"
  };
  request.tenantStore.tasks.push(task);
  return response.status(201).json(task);
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    return response.status(400).json({ error: "Размер CSV-файла не должен превышать 10 МБ." });
  }
  return response.status(500).json({ error: "Внутренняя ошибка сервера." });
});
