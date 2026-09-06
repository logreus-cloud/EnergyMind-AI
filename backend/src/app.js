import express from "express";
import multer from "multer";
import { analyzeConsumption } from "./analytics.js";
import { parseConsumptionCsv } from "./csv.js";
import { getTenantStore } from "./store.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});
const tariffKzt = Number(process.env.ENERGY_TARIFF_KZT ?? 25);

export const app = express();
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api", (request, response, next) => {
  const tenantId = request.header("X-Tenant-Id")?.trim();
  if (!tenantId) {
    return response.status(401).json({
      error: "Для доступа к данным объекта передайте заголовок X-Tenant-Id."
    });
  }

  request.tenantStore = getTenantStore(tenantId);
  return next();
});

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
    return response.status(201).json({
      id: dataset.id,
      fileName: dataset.fileName,
      measurementsCount: measurements.length
    });
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }
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

  const task = {
    id: crypto.randomUUID(),
    recommendationId,
    title,
    assignee: assignee ?? null,
    status: "open",
    createdAt: new Date().toISOString()
  };
  request.tenantStore.tasks.push(task);
  return response.status(201).json(task);
});

app.get("/api/tasks", (request, response) => {
  response.json(request.tenantStore.tasks);
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    return response.status(400).json({ error: "Размер CSV-файла не должен превышать 10 МБ." });
  }
  return response.status(500).json({ error: "Внутренняя ошибка сервера." });
});
