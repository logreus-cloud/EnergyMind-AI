import { Bell, ChevronDown, Moon, Search, Sun, UserRound } from "lucide-react";
import { useState } from "react";
import type { Floor } from "../../types";
import { Button } from "../UI/Button";

interface TopBarProps {
  buildingName: string;
  activeFloor: number;
  floors: Floor[];
  mode: "live" | "simulation";
  onModeChange: (mode: "live" | "simulation") => void;
  onSelectFloor: (floor: number) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  notificationCount: number;
  onNotificationsOpen: () => void;
  theme: "dark" | "light";
  onThemeChange: (theme: "dark" | "light") => void;
}

export function TopBar({
  buildingName,
  activeFloor,
  floors,
  mode,
  onModeChange,
  onSelectFloor,
  searchValue,
  onSearchChange,
  notificationCount,
  onNotificationsOpen,
  theme,
  onThemeChange,
}: TopBarProps) {
  const [floorMenuOpen, setFloorMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="em-topbar">
      <div className="em-topbar__left">
        <div className="em-topbar__title">
          <strong>EnergyMind AI</strong>
          <span>{buildingName}</span>
        </div>
        <div className="em-topbar__menu">
          <button
            type="button"
            className="em-floor-select"
            onClick={() => setFloorMenuOpen((open) => !open)}
            aria-expanded={floorMenuOpen}
          >
            Этаж {activeFloor}
            <ChevronDown size={14} />
          </button>
          {floorMenuOpen && (
            <div className="em-menu em-floor-menu">
              {floors.map((floor) => (
                <button
                  key={floor.id}
                  type="button"
                  onClick={() => {
                    onSelectFloor(floor.level);
                    setFloorMenuOpen(false);
                  }}
                >
                  Этаж {floor.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="em-topbar__right">
        <div className="em-search">
          <Search size={14} />
          <input
            type="search"
            placeholder="Поиск помещения или устройства"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
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
        <button
          type="button"
          className="em-icon-btn em-icon-btn--notification"
          aria-label="Уведомления"
          onClick={onNotificationsOpen}
        >
          <Bell size={15} />
          {notificationCount > 0 && <span>{notificationCount}</span>}
        </button>
        <button
          type="button"
          className="em-icon-btn"
          aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
          title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <div className="em-topbar__menu">
          <button
            type="button"
            className="em-icon-btn"
            aria-label="Профиль"
            onClick={() => setUserMenuOpen((open) => !open)}
            aria-expanded={userMenuOpen}
          >
            <UserRound size={15} />
          </button>
          {userMenuOpen && (
            <div className="em-menu em-user-menu">
              <strong>Алина Ким</strong>
              <span>Энергоменеджер</span>
              <small>{mode === "simulation" ? "Режим симуляции" : "Live режим"}</small>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
