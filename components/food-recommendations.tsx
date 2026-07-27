import Link from "next/link";
import type { FoodRecommendation } from "@/lib/nutrition/recommendations";
export function FoodRecommendations({
  foods,
  emptyMessage = "Log more foods to identify useful recommendations.",
}: {
  foods: FoodRecommendation[];
  emptyMessage?: string;
}) {
  if (!foods.length) return <p className="muted">{emptyMessage}</p>;
  return (
    <div className="recommendation-grid">
      {foods.map((food, index) => (
        <Link
          className="recommendation-card"
          href={`/app/foods/internal/${food.food_id}`}
          key={food.food_id}
        >
          <span className="recommendation-rank">{index + 1}</span>
          <div>
            <strong>{food.food_name}</strong>
            <p>
              {food.brand ?? "Generic"}
              {food.serving_label ? ` · ${food.serving_label}` : ""}
            </p>
            <div className="recommendation-tags">
              {food.contributions.slice(0, 3).map((item) => (
                <span key={item.key}>
                  {item.name}{" "}
                  {item.amountPer100g.toFixed(item.amountPer100g < 10 ? 1 : 0)}{" "}
                  {item.unit}/100g
                  {item.currentProgress !== undefined
                    ? ` · ${item.currentProgress}% now`
                    : ""}
                </span>
              ))}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
