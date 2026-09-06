import test from "node:test";
import assert from "node:assert/strict";
import { analyzeConsumption } from "../src/analytics.js";

test("finds an after-hours consumption anomaly and produces a forecast", () => {
  const measurements = [
    { timestamp: "2026-09-01T10:00:00Z", roomId: "A-203", consumptionKwh: 2 },
    { timestamp: "2026-09-02T10:00:00Z", roomId: "A-203", consumptionKwh: 2.1 },
    { timestamp: "2026-09-03T10:00:00Z", roomId: "A-203", consumptionKwh: 1.9 },
    { timestamp: "2026-09-04T22:00:00Z", roomId: "A-203", consumptionKwh: 6 }
  ];
  const premises = new Map([
    [
      "A-203",
      {
        workingHours: "09-19",
        hasAirConditioning: true
      }
    ]
  ]);

  const result = analyzeConsumption({ measurements, premises, tariffKzt: 25 });

  assert.equal(result.anomalies.length, 1);
  assert.match(result.anomalies[0].probableCause, /вне установленного/);
  assert.equal(result.forecast.length, 7);
  assert.match(result.recommendations[0].action, /кондиционера/);
  assert.ok(result.recommendations[0].expectedSavingsKzt > 0);
});
