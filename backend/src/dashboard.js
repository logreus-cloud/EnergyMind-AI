const DASHBOARD_BUILDING = {
  id: "main",
  name: "Главный корпус",
  address: "Алматы, проспект Абая 18",
  floors: [
    {
      id: "floor-1",
      label: "1",
      level: 1,
      width: 1200,
      height: 760,
      rooms: [
        createRoom("f1-a-201", "A-201", "Офис", 1, 42, 40, 40),
        createRoom("f1-a-202", "A-202", "Офис", 1, 38, 260, 40),
        createRoom("f1-lab-01", "Lab-01", "Лаборатория", 1, 48, 480, 40)
      ]
    },
    {
      id: "floor-2",
      label: "2",
      level: 2,
      width: 1200,
      height: 760,
      rooms: [
        createRoom("f2-a-203", "A-203", "Аудитория", 2, 54, 40, 40),
        createRoom("f2-a-205", "A-205", "Переговорная", 2, 46, 280, 40),
        createRoom("f2-b-303", "B-303", "Зона аналитики", 2, 41, 520, 40)
      ]
    }
  ]
};

function createRoom(id, name, type, floor, areaM2, x, y) {
  return {
    id,
    name,
    type,
    floor,
    areaM2,
    position: { x, y, width: 200, height: 120 },
    status: "normal",
    consumptionKwh: 0,
    baselineKwh: 0,
    deviationPercent: 0,
    occupancy: "Рабочие часы",
    hvacZone: "Контур A"
  };
}

export function getSourceRoomId(roomId) {
  const room = DASHBOARD_BUILDING.floors
    .flatMap((floor) => floor.rooms)
    .find((candidate) => candidate.id === roomId || candidate.name === roomId);
  return room?.name ?? roomId.replace(/^f\d+-/, "").toUpperCase();
}

function anomalyForRoom(analysis, roomName) {
  return analysis?.anomalies.find((anomaly) => anomaly.roomId === roomName);
}

function recommendationForRoom(analysis, roomName) {
  return analysis?.recommendations.find(
    (recommendation) => recommendation.roomId === roomName
  );
}

export function createDashboardBuilding(store) {
  const analysis = store.analysis;
  return {
    ...DASHBOARD_BUILDING,
    floors: DASHBOARD_BUILDING.floors.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => {
        const anomaly = anomalyForRoom(analysis, room.name);
        const recommendation = recommendationForRoom(analysis, room.name);
        const premise = store.premises.get(room.name);
        if (!anomaly) {
          return { ...room, occupancy: premise?.workingHours ?? room.occupancy };
        }

        return {
          ...room,
          status: anomaly.deviationPercent >= 50 ? "critical" : "warning",
          consumptionKwh: anomaly.consumptionKwh,
          baselineKwh: anomaly.expectedKwh,
          deviationPercent: anomaly.deviationPercent,
          occupancy: premise?.workingHours ?? room.occupancy,
          anomaly: {
            start: anomaly.timestamp.slice(11, 16),
            end: anomaly.timestamp.slice(11, 16),
            probableCause: anomaly.probableCause
          },
          recommendation: recommendation && {
            title: recommendation.action,
            expectedSavingKwh: recommendation.expectedSavingsKwh,
            expectedSavingKzt: recommendation.expectedSavingsKzt
          }
        };
      })
    }))
  };
}

export function createDashboardMetrics(store, tariffKzt) {
  const measurements = store.datasets.at(-1)?.measurements ?? [];
  const analysis = store.analysis;
  const latestDay = measurements.at(-1)?.timestamp.slice(0, 10);
  const energyTodayKwh = measurements
    .filter((measurement) => measurement.timestamp.startsWith(latestDay ?? ""))
    .reduce((sum, measurement) => sum + measurement.consumptionKwh, 0);

  return {
    energyTodayKwh: Number(energyTodayKwh.toFixed(2)),
    anomalies: analysis?.anomalies.length ?? 0,
    potentialSavingsKzt: Number(
      (analysis?.recommendations.reduce(
        (sum, recommendation) => sum + recommendation.expectedSavingsKzt,
        0
      ) ?? 0).toFixed(2)
    )
  };
}

export function createDashboardAnomalies(store, tariffKzt) {
  return (store.analysis?.anomalies ?? []).map((anomaly) => {
    const recommendation = recommendationForRoom(store.analysis, anomaly.roomId);
    return {
      id: anomaly.id,
      roomId: toDashboardRoomId(anomaly.roomId),
      severity: anomaly.deviationPercent >= 50 ? "critical" : "warning",
      title: "Потребление выше базового профиля",
      start: anomaly.timestamp.slice(11, 16),
      end: anomaly.timestamp.slice(11, 16),
      probableCause: anomaly.probableCause,
      description: `Потребление выше ожидаемого на ${anomaly.deviationPercent}%.`,
      monthlyLossKzt: recommendation?.expectedSavingsKzt ?? 0
    };
  });
}

export function createConsumptionSeries(store, dashboardRoomId) {
  const roomId = getSourceRoomId(dashboardRoomId);
  const measurements = (store.datasets.at(-1)?.measurements ?? []).filter(
    (measurement) => measurement.roomId === roomId
  );
  const analysis = store.analysis;
  const average =
    measurements.reduce((sum, measurement) => sum + measurement.consumptionKwh, 0) /
    (measurements.length || 1);
  const anomalousTimes = new Set(
    (analysis?.anomalies ?? [])
      .filter((anomaly) => anomaly.roomId === roomId)
      .map((anomaly) => anomaly.timestamp)
  );

  return measurements.map((measurement) => ({
    time: measurement.timestamp.slice(11, 16),
    actualKwh: measurement.consumptionKwh,
    baselineKwh: Number(average.toFixed(2)),
    anomalyPeriod: anomalousTimes.has(measurement.timestamp)
  }));
}

export function createDevices(store, dashboardRoomId, tariffKzt) {
  const roomId = getSourceRoomId(dashboardRoomId);
  const premise = store.premises.get(roomId);
  const consumption = createConsumptionSeries(store, dashboardRoomId);
  const totalKwh = consumption.reduce((sum, point) => sum + point.actualKwh, 0);
  const hasAirConditioning = premise?.hasAirConditioning ?? true;

  return [
    {
      id: `${dashboardRoomId}-hvac`,
      roomId: dashboardRoomId,
      name: "HVAC модуль",
      kind: "climate",
      status: "standby",
      consumptionKwh: Number((totalKwh * 0.62).toFixed(2)),
      costKzt: Number((totalKwh * 0.62 * tariffKzt).toFixed(2)),
      sharePercent: 62,
      recommendedAction: hasAirConditioning ? "Проверить расписание работы" : undefined,
      recommendedToDisable: hasAirConditioning,
      expectedSavingKwh: 0,
      expectedSavingKzt: 0
    },
    {
      id: `${dashboardRoomId}-light`,
      roomId: dashboardRoomId,
      name: "Освещение",
      kind: "lighting",
      status: "on",
      consumptionKwh: Number((totalKwh * 0.25).toFixed(2)),
      costKzt: Number((totalKwh * 0.25 * tariffKzt).toFixed(2)),
      sharePercent: 25,
      recommendedToDisable: false,
      expectedSavingKwh: 0,
      expectedSavingKzt: 0
    }
  ];
}

export function createDashboardRecommendation(store, dashboardRoomId) {
  const roomId = getSourceRoomId(dashboardRoomId);
  const recommendation = recommendationForRoom(store.analysis, roomId);
  if (!recommendation) {
    return null;
  }

  return {
    id: recommendation.id,
    roomId: dashboardRoomId,
    title: recommendation.action,
    description: recommendation.explanation,
    expectedSavingKwh: recommendation.expectedSavingsKwh,
    expectedSavingKzt: recommendation.expectedSavingsKzt
  };
}

export function createAnalysisSummary(store, tariffKzt) {
  const anomalies = createDashboardAnomalies(store, tariffKzt);
  const metrics = createDashboardMetrics(store, tariffKzt);
  return {
    anomaliesDetected: anomalies.length,
    roomsNeedAttention: new Set(anomalies.map((anomaly) => anomaly.roomId)).size,
    potentialSavingsKzt: metrics.potentialSavingsKzt,
    highestImpactRoomId: anomalies[0]?.roomId ?? ""
  };
}

function toDashboardRoomId(roomId) {
  const room = DASHBOARD_BUILDING.floors
    .flatMap((floor) => floor.rooms)
    .find((candidate) => candidate.name === roomId);
  return room?.id ?? roomId;
}
