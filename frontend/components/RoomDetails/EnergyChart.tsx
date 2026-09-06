"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ConsumptionPoint } from "../../types";

interface EnergyChartProps {
  data: ConsumptionPoint[];
  anomalyPeriod?: { start: string; end: string };
}

export function EnergyChart({ data, anomalyPeriod }: EnergyChartProps) {
  const resolvedStart = anomalyPeriod ? resolveTimeKey(data, anomalyPeriod.start, "start") : null;
  const resolvedEnd = anomalyPeriod ? resolveTimeKey(data, anomalyPeriod.end, "end") : null;
  const startIndex = resolvedStart ? data.findIndex((point) => point.time === resolvedStart) : -1;
  const endIndex = resolvedEnd ? data.findIndex((point) => point.time === resolvedEnd) : -1;
  const splitByMidnight = startIndex > endIndex && startIndex !== -1 && endIndex !== -1;

  return (
    <div className="em-energy-chart">
      <ResponsiveContainer width="100%" height={188}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
          <defs>
            <linearGradient id="actual-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#edf1f5" />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#718399" }} />
          <YAxis tick={{ fontSize: 11, fill: "#718399" }} />
          <RechartsTooltip
            formatter={(value: number) => `${value.toFixed(2)} kWh`}
            labelStyle={{ color: "#233243", fontWeight: 600 }}
            contentStyle={{ borderRadius: 12, borderColor: "#dae2ea" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {resolvedStart && resolvedEnd && !splitByMidnight && (
            <ReferenceArea
              x1={resolvedStart}
              x2={resolvedEnd}
              fill="#f59e0b"
              fillOpacity={0.12}
              strokeOpacity={0}
            />
          )}
          {resolvedStart && resolvedEnd && splitByMidnight && (
            <>
              <ReferenceArea
                x1={resolvedStart}
                x2={data[data.length - 1]?.time}
                fill="#f59e0b"
                fillOpacity={0.12}
                strokeOpacity={0}
              />
              <ReferenceArea
                x1={data[0]?.time}
                x2={resolvedEnd}
                fill="#f59e0b"
                fillOpacity={0.12}
                strokeOpacity={0}
              />
            </>
          )}
          <Area
            type="monotone"
            dataKey="actualKwh"
            name="Фактическое"
            stroke="#ef4444"
            strokeWidth={2.2}
            fill="url(#actual-fill)"
          />
          <Line
            type="monotone"
            dataKey="baselineKwh"
            name="Базовый профиль"
            stroke="#64748b"
            strokeWidth={1.8}
            dot={false}
            strokeDasharray="4 4"
          />
        </AreaChart>
      </ResponsiveContainer>
      {anomalyPeriod && (
        <p className="em-energy-chart__caption">
          Аномальный период: {anomalyPeriod.start} — {anomalyPeriod.end}
        </p>
      )}
    </div>
  );
}

function resolveTimeKey(
  data: ConsumptionPoint[],
  targetTime: string,
  mode: "start" | "end",
): string | null {
  if (data.length === 0) {
    return null;
  }
  if (data.some((point) => point.time === targetTime)) {
    return targetTime;
  }

  const targetMinutes = parseTimeToMinutes(targetTime);
  const sorted = data.map((point) => ({ key: point.time, minutes: parseTimeToMinutes(point.time) }));

  if (mode === "start") {
    const next = sorted.find((point) => point.minutes >= targetMinutes);
    return (next ?? sorted[0]).key;
  }

  const reversed = [...sorted].reverse();
  const previous = reversed.find((point) => point.minutes <= targetMinutes);
  return (previous ?? reversed[0]).key;
}

function parseTimeToMinutes(value: string): number {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw ?? "0");
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}
