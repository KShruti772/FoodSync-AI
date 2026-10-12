from __future__ import annotations

from typing import Any

from app.core.store import store


class ImpactService:
    @staticmethod
    def summary() -> dict[str, Any]:
        logs = store.impact_logs.values()
        total_meals = sum(int(item["meals_rescued"]) for item in logs)
        total_weight = sum(float(item["food_weight_kg"]) for item in logs)
        total_co2 = sum(float(item["co2_savings_kg"]) for item in logs)
        return {
            "total_meals_rescued": total_meals,
            "total_food_weight_kg": round(total_weight, 2),
            "total_co2_savings_kg": round(total_co2, 2),
            "total_completed_donations": len(list(logs)),
        }

    @staticmethod
    def log_completion(donation: dict[str, Any], match: dict[str, Any]) -> dict[str, Any]:
        impact_id = f"impact_{len(store.impact_logs) + 1:06d}"
        meals = int(donation["quantity_meals"])
        weight = round(meals * 0.5, 2)
        co2 = round(weight * 2.5, 2)
        impact = {
            "id": impact_id,
            "donation_id": donation["id"],
            "match_id": match["id"],
            "meals_rescued": meals,
            "food_weight_kg": weight,
            "co2_savings_kg": co2,
        }
        store.impact_logs[impact_id] = impact
        store.sync_impact_logs()
        return impact
