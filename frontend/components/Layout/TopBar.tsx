import { Bell, ChevronDown, Search, UserRound } from "lucide-react";
import { Button } from "../UI/Button";

interface TopBarProps {
  buildingName: string;
  activeFloor: number;
  mode: "live" | "simulation";
  onModeChange: (mode: "live" | "simulation") => void;
}

export function TopBar({ buildingName, activeFloor, mode, onModeChange }: TopBarProps) {
  return (
    <header className="em-topbar">
      <div className="em-topbar__left">
        <div className="em-topbar__title">
          <strong>EnergyMind AI</strong>
          <span>{buildingName}</span>
        </div>
        <button type="button" className="em-floor-select">
          Этаж {activeFloor}
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="em-topbar__right">
        <div className="em-search">
          <Search size={14} />
          <input type="text" placeholder="Поиск помещения или устройства" />
        </div>
        <div className="em-mode-toggle" role="tablist" aria-label="Режим данных">
          <Button
            type="button"
            variant={mode === "live" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onModeChange("live")}
          >
            LIVE
          </Button>
          <Button
            type="button"
            variant={mode === "simulation" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onModeChange("simulation")}
          >
            SIMULATION
          </Button>
        </div>
        <button type="button" className="em-icon-btn" aria-label="Уведомления">
          <Bell size={15} />
        </button>
        <button type="button" className="em-icon-btn" aria-label="Профиль">
          <UserRound size={15} />
        </button>
      </div>
    </header>
  );
}
