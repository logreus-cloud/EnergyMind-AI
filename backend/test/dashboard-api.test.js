import assert from "node:assert/strict";
import test from "node:test";
import { app } from "../src/app.js";

test("serves CSV analysis through the frontend dashboard contract", async (context) => {
  const server = app.listen(0);
  context.after(() => server.close());

  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const apiUrl = `http://127.0.0.1:${port}`;
  const headers = { "X-Tenant-Id": `dashboard-test-${crypto.randomUUID()}` };

  const premiseResponse = await fetch(`${apiUrl}/api/premises`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "A-203",
      type: "classroom",
      areaM2: 54,
      workingHours: "09-19",
      hasAirConditioning: true
    })
  });
  assert.equal(premiseResponse.status, 201);

  const csv = [
    "timestamp,room_id,consumption_kwh",
    "2026-09-01T10:00:00Z,A-203,2",
    "2026-09-02T10:00:00Z,A-203,2.1",
    "2026-09-03T10:00:00Z,A-203,1.9",
    "2026-09-04T22:00:00Z,A-203,6"
  ].join("\n");
  const form = new FormData();
  form.append("file", new Blob([csv], { type: "text/csv" }), "sample.csv");

  const datasetResponse = await fetch(`${apiUrl}/api/datasets`, {
    method: "POST",
    headers,
    body: form
  });
  assert.equal(datasetResponse.status, 201);

  const analysisResponse = await fetch(`${apiUrl}/analysis/run`, {
    method: "POST",
    headers
  });
  const summary = await analysisResponse.json();
  assert.deepEqual(summary, {
    anomaliesDetected: 1,
    roomsNeedAttention: 1,
    potentialSavingsKzt: 2250,
    highestImpactRoomId: "f2-a-203"
  });

  const building = await fetch(`${apiUrl}/buildings/main`, { headers }).then(
    (response) => response.json()
  );
  const room = building.floors[1].rooms.find(
    (candidate) => candidate.id === "f2-a-203"
  );
  assert.equal(room.status, "critical");
  assert.equal(room.deviationPercent, 100);

  const recommendation = await fetch(
    `${apiUrl}/rooms/f2-a-203/recommendation`,
    { headers }
  ).then((response) => response.json());
  assert.equal(recommendation.roomId, "f2-a-203");
  assert.ok(recommendation.expectedSavingKzt > 0);

  const taskResponse = await fetch(`${apiUrl}/tasks`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      roomId: "f2-a-203",
      title: "Проверить HVAC",
      description: "Проверить расписание кондиционера."
    })
  });
  const task = await taskResponse.json();
  assert.equal(taskResponse.status, 201);
  assert.equal(task.recommendationId, recommendation.id);
  assert.equal(task.priority, "medium");
  assert.ok(task.createdAt);

  const tasks = await fetch(`${apiUrl}/api/tasks`, { headers }).then(
    (response) => response.json()
  );
  assert.deepEqual(tasks, [task]);

  const clearResponse = await fetch(`${apiUrl}/api/datasets`, {
    method: "DELETE",
    headers
  });
  assert.equal(clearResponse.status, 204);

  const metrics = await fetch(`${apiUrl}/metrics/dashboard`, { headers }).then(
    (response) => response.json()
  );
  assert.deepEqual(metrics, {
    energyTodayKwh: 0,
    anomalies: 0,
    potentialSavingsKzt: 0
  });
});
