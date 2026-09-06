import { ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "../UI/Button";

interface AIInsightProps {
  anomaliesDetected: number;
  topRoom: string;
  deviationPercent: number;
  monthlyLossKzt: number;
  onView: () => void;
}

export function AIInsight({
  anomaliesDetected,
  topRoom,
  deviationPercent,
  monthlyLossKzt,
  onView,
}: AIInsightProps) {
  return (
    <aside className="em-ai-insight">
      <div className="em-ai-insight__title">
        <Sparkles size={14} />
        <strong>AI ИНСАЙТЫ</strong>
      </div>
      <p>{anomaliesDetected} аномалии обнаружены</p>
      <div className="em-ai-insight__impact">
        <span>Наибольший эффект</span>
        <strong>{topRoom}</strong>
        <b>+{deviationPercent}%</b>
        <small>{monthlyLossKzt.toLocaleString("ru-RU")} ₸ / месяц</small>
      </div>
      <Button type="button" variant="secondary" size="sm" icon={<ArrowUpRight size={13} />} onClick={onView}>
        Показать
      </Button>
    </aside>
  );
}
