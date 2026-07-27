"use client";
import { useMemo, useState } from "react";
import { logFood } from "@/app/app/diary/actions";
import type { NormalizedNutrient } from "@/providers/nutrition";
import { PortionSelector } from "@/features/foods/portion-selector";
import { localDateInputValue } from "@/lib/date/local-date";

export function LogFoodForm({
  foodId,
  defaultGrams,
  servingLabel,
  nutrients,
}: {
  foodId: string;
  defaultGrams: number;
  servingLabel?: string;
  nutrients: NormalizedNutrient[];
}) {
  const today = localDateInputValue();
  const [grams, setGrams] = useState(defaultGrams);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const values = useMemo(
    () =>
      nutrients.map((nutrient) => ({
        ...nutrient,
        auto:
          nutrient.amountPer100g === null
            ? ""
            : String(Math.round(nutrient.amountPer100g * grams) / 100),
      })),
    [nutrients, grams],
  );
  const overrides = Object.fromEntries(
    Object.entries(edits).filter(([, value]) => value.trim() !== ""),
  );
  return (
    <section className="card" id="add-to-diary">
      <h2>Add to food log</h2>
      <p className="muted">
        This is the final step. Logging the food here updates the dashboard for
        the selected date.
      </p>
      <form className="form" action={logFood}>
        <input type="hidden" name="food_id" value={foodId} />
        <input
          type="hidden"
          name="nutrient_overrides"
          value={JSON.stringify(overrides)}
        />
        <div className="form-grid">
          <PortionSelector
            servingGrams={defaultGrams}
            servingLabel={servingLabel}
            onGramsChange={setGrams}
          />
          <label>
            Meal
            <select name="meal_type" defaultValue="dinner">
              <option value="breakfast">Breakfast</option>
              <option value="morning_snack">Morning snack</option>
              <option value="lunch">Lunch</option>
              <option value="afternoon_snack">Afternoon snack</option>
              <option value="dinner">Dinner</option>
              <option value="evening_snack">Evening snack</option>
            </select>
          </label>
          <label>
            Date
            <input name="date" type="date" defaultValue={today} required />
          </label>
          <label>
            Time
            <input name="time" type="time" defaultValue="18:00" required />
          </label>
        </div>
        <details>
          <summary>Review or correct nutrients before adding</summary>
          <p className="muted">
            Values automatically match the serving above. Change only values you
            know; corrections are saved as user-entered data for this food log
            entry.
          </p>
          <div className="nutrient-edit-grid">
            {values.map((nutrient) => (
              <label key={nutrient.key}>
                {nutrient.name}
                <span>
                  {nutrient.unit} ·{" "}
                  {nutrient.classification.replaceAll("_", " ")}
                </span>
                <input
                  aria-label={`${nutrient.name} amount`}
                  type="number"
                  min="0"
                  max="10000000"
                  step="any"
                  placeholder={nutrient.auto || "Missing—enter if known"}
                  value={edits[nutrient.key] ?? ""}
                  onChange={(event) =>
                    setEdits((previous) => ({
                      ...previous,
                      [nutrient.key]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </details>
        <label>
          Notes (optional)
          <input name="notes" maxLength={500} />
        </label>
        <button className="button">Log food and update dashboard</button>
      </form>
    </section>
  );
}
