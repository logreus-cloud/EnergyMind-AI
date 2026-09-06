const HOURS_IN_DAY = 24;
const FORECAST_DAYS = 7;

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values, average) {
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
      values.length
  );
}

function isOutsideWorkingHours(timestamp, premise) {
  if (!premise?.workingHours) {
    return false;
  }

  const hour = new Date(timestamp).getUTCHours();
  const [start, end] = premise.workingHours.split("-").map(Number);
  return hour < start || hour >= end;
}

function buildForecast(measurements) {
  const dailyValues = new Map();
  for (const measurement of measurements) {
    const day = measurement.timestamp.slice(0, 10);
    dailyValues.set(
      day,
      (dailyValues.get(day) ?? 0) + measurement.consumptionKwh
    );
  }

  const history = [...dailyValues.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  );
  const baseline = mean(history.slice(-7).map(([, value]) => value));
  const lastDate = new Date(`${history.at(-1)[0]}T00:00:00.000Z`);

  return Array.from({ length: FORECAST_DAYS }, (_, index) => {
    const date = new Date(lastDate);
    date.setUTCDate(date.getUTCDate() + index + 1);
    return {
      date: date.toISOString().slice(0, 10),
      consumptionKwh: round(baseline)
    };
  });
}

export function analyzeConsumption({ measurements, premises, tariffKzt }) {
  if (measurements.length < 3) {
    throw new Error("Для анализа требуется минимум три измерения.");
  }

  const valuesByRoom = Map.groupBy(measurements, ({ roomId }) => roomId);
  const anomalies = [];

  for (const [roomId, roomMeasurements] of valuesByRoom) {
    const values = roomMeasurements.map(({ consumptionKwh }) => consumptionKwh);
    const average = mean(values);
    const deviation = standardDeviation(values, average);
    const threshold = average + Math.max(deviation * 1.5, average * 0.2);

    for (const measurement of roomMeasurements) {
      if (measurement.consumptionKwh <= threshold) {
        continue;
      }

      const premise = premises.get(roomId);
      const outsideWorkingHours = isOutsideWorkingHours(
        measurement.timestamp,
        premise
      );
      const excessKwh = measurement.consumptionKwh - average;
      anomalies.push({
        id: `${roomId}-${measurement.timestamp}`,
        roomId,
        timestamp: measurement.timestamp,
        consumptionKwh: round(measurement.consumptionKwh),
        expectedKwh: round(average),
        deviationPercent: round((excessKwh / average) * 100),
        probableCause: outsideWorkingHours
          ? "Оборудование работает вне установленного времени работы."
          : "Нетипичный пик потребления; требуется проверка оборудования.",
        source: "Загруженный CSV: сравнение с профилем потребления помещения."
      });
    }
  }

  anomalies.sort((left, right) => right.deviationPercent - left.deviationPercent);
  const recommendations = anomalies.slice(0, 5).map((anomaly) => {
    const premise = premises.get(anomaly.roomId);
    const action = premise?.hasAirConditioning
      ? `Проверить и настроить отключение кондиционера в помещении ${anomaly.roomId} вне рабочего времени.`
      : `Проверить источники нагрузки в помещении ${anomaly.roomId} и отключать их вне рабочего времени.`;
    const monthlySavingsKwh = anomaly.expectedKwh * 30;

    return {
      id: `recommendation-${anomaly.id}`,
      roomId: anomaly.roomId,
      action,
      explanation: `Потребление ${anomaly.consumptionKwh} кВт·ч в ${new Date(anomaly.timestamp).toLocaleString("ru-RU", { timeZone: "UTC" })} на ${anomaly.deviationPercent}% выше обычного профиля (${anomaly.expectedKwh} кВт·ч). ${anomaly.probableCause}`,
      expectedSavingsKwh: round(monthlySavingsKwh),
      expectedSavingsKzt: round(monthlySavingsKwh * tariffKzt),
      paybackPeriodMonths: 0,
      source: anomaly.source,
      requiresConfirmation: true
    };
  });

  return {
    analyzedAt: new Date().toISOString(),
    measurementsAnalyzed: measurements.length,
    anomalies,
    forecast: buildForecast(measurements),
    recommendations
  };
}
