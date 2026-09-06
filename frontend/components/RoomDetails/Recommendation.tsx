import { Check, Lightbulb, Sparkles } from "lucide-react";
import { Badge } from "../UI/Badge";
import { Button } from "../UI/Button";
import type { Anomaly, Recommendation as RecommendationType, Task } from "../../types";

interface RecommendationProps {
  anomaly?: Anomaly;
  recommendation: RecommendationType | null;
  task: Task | null;
  onCreateTask: () => void;
}

export function Recommendation({ anomaly, recommendation, task, onCreateTask }: RecommendationProps) {
  if (!anomaly || !recommendation) {
    return (
      <div className="em-recommendation em-recommendation--normal">
        <Badge tone="normal">Норма</Badge>
        <p>AI не выявил критических сценариев для этого помещения.</p>
      </div>
    );
  }

  const badgeTone = anomaly.severity === "critical" ? "critical" : "warning";

  return (
    <section className="em-recommendation">
      <div className="em-recommendation__header">
        <Sparkles size={14} />
        <strong>AI-АНАЛИЗ</strong>
        <Badge tone={badgeTone}>{anomaly.severity === "critical" ? "Критическая аномалия" : "Предупреждение"}</Badge>
      </div>
      <p>{anomaly.description}</p>

      <div className="em-recommendation__cause">
        <span>Вероятная причина</span>
        <strong>{anomaly.probableCause}</strong>
      </div>

      <div className="em-recommendation__savings">
        <Lightbulb size={14} />
        <div>
          <span>Потенциальная экономия</span>
          <strong>{recommendation.expectedSavingKwh} kWh / месяц</strong>
          <b>≈ {recommendation.expectedSavingKzt.toLocaleString("ru-RU")} ₸ / месяц</b>
        </div>
      </div>

      <div className="em-recommendation__action">
        <h4>Рекомендация</h4>
        <p>{recommendation.title}</p>
        <small>{recommendation.description}</small>
        {task ? (
          <div className="em-task-created">
            <Check size={14} />
            <div>
              <strong>Задача создана</strong>
              <span>{task.title}</span>
            </div>
          </div>
        ) : (
          <Button type="button" variant="primary" onClick={onCreateTask}>
            Создать задачу
          </Button>
        )}
      </div>
    </section>
  );
}
