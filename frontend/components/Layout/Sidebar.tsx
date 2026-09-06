import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import type { DashboardMetrics, Floor } from "../../types";

interface SidebarProps {
  buildingName: string;
  floors: Floor[];
  activeFloor: number;
  onSelectFloor: (floor: number) => void;
  metrics: DashboardMetrics;
}

const navigationItems = [
  { id: "overview", label: "Обзор", icon: LayoutGrid },
  { id: "floor-plan", label: "План этажа", icon: Building2, active: true },
  { id: "analytics", label: "Аналитика", icon: BarChart3 },
  { id: "anomalies", label: "Аномалии", icon: AlertTriangle },
  { id: "recommendations", label: "Рекомендации", icon: Sparkles },
  { id: "tasks", label: "Задачи", icon: ClipboardCheck },
];

export function Sidebar({ buildingName, floors, activeFloor, onSelectFloor, metrics }: SidebarProps) {
  return (
    <aside className="em-sidebar">
      <div className="em-brand">
        <div className="em-brand__icon">E</div>
        <div>
          <strong>EnergyMind</strong>
          <span>AI</span>
        </div>
      </div>

      <nav className="em-nav" aria-label="Навигация">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`em-nav__item ${item.active ? "is-active" : ""}`}
            aria-current={item.active ? "page" : undefined}
          >
            <item.icon size={16} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="em-sidebar__block">
        <span className="em-sidebar__label">Объект</span>
        <button type="button" className="em-select">
          <Building2 size={15} />
          <span>{buildingName}</span>
        </button>
      </div>

      <div className="em-sidebar__block">
        <span className="em-sidebar__label">Этаж</span>
        <div className="em-floor-list">
          {floors.map((floor) => (
            <button
              key={floor.id}
              type="button"
              className={`em-floor-list__item ${floor.level === activeFloor ? "is-selected" : ""}`}
              onClick={() => onSelectFloor(floor.level)}
            >
              {floor.label}
            </button>
          ))}
        </div>
      </div>

      <div className="em-sidebar__metrics">
        <div className="em-sidebar-metric">
          <span>ПОТРЕБЛЕНИЕ СЕГОДНЯ</span>
          <strong>{metrics.energyTodayKwh.toLocaleString("ru-RU")} kWh</strong>
        </div>
        <div className="em-sidebar-metric">
          <span>АНОМАЛИИ</span>
          <strong>{metrics.anomalies}</strong>
        </div>
        <div className="em-sidebar-metric">
          <span>ПОТЕНЦИАЛ ЭКОНОМИИ</span>
          <strong>{metrics.potentialSavingsKzt.toLocaleString("ru-RU")} ₸ / месяц</strong>
        </div>
      </div>

      <div className="em-sidebar__footer">
        <CheckCircle2 size={14} />
        <span>Система в симуляции</span>
      </div>
    </aside>
  );
}
