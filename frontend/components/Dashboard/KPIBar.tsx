import { AlertTriangle, Calendar, Coins, Zap } from "lucide-react";
import type { DashboardMetrics } from "../../types";

interface KPIBarProps {
  metrics: DashboardMetrics;
  period: "day" | "week" | "month";
  onPeriodChange: (period: "day" | "week" | "month") => void;
}

export function KPIBar({ metrics, period, onPeriodChange }: KPIBarProps) {
  return (
    <section className="em-kpi-bar" aria-label="Сводные показатели">
      <div className="em-kpi-bar__header">
        <div>
          <strong>Сегодня, 6 сентября</strong>
          <span>Показатели вторичны, основной контур — цифровой план здания</span>
        </div>
        <div className="em-period-toggle" role="tablist" aria-label="Период">
          <button
            type="button"
            className={period === "day" ? "is-active" : ""}
            onClick={() => onPeriodChange("day")}
          >
            День
          </button>
          <button
            type="button"
            className={period === "week" ? "is-active" : ""}
            onClick={() => onPeriodChange("week")}
          >
            Неделя
          </button>
          <button
            type="button"
            className={period === "month" ? "is-active" : ""}
            onClick={() => onPeriodChange("month")}
          >
            Месяц
          </button>
        </div>
      </div>

      <div className="em-kpi-cards">
        <article className="em-kpi-card">
          <div className="em-kpi-card__icon energy">
            <Zap size={15} />
          </div>
          <div>
            <span>Потребление</span>
            <strong>{metrics.energyTodayKwh.toLocaleString("ru-RU")} kWh</strong>
          </div>
        </article>
        <article className="em-kpi-card">
          <div className="em-kpi-card__icon alert">
            <AlertTriangle size={15} />
          </div>
          <div>
            <span>Аномалии</span>
            <strong>{metrics.anomalies}</strong>
          </div>
        </article>
        <article className="em-kpi-card">
          <div className="em-kpi-card__icon savings">
            <Coins size={15} />
          </div>
          <div>
            <span>Потенциал экономии</span>
            <strong>{metrics.potentialSavingsKzt.toLocaleString("ru-RU")} ₸</strong>
          </div>
        </article>
        <div className="em-kpi-meta">
          <Calendar size={14} />
          <span>Обновление данных каждые 15 минут</span>
        </div>
      </div>
    </section>
  );
}
