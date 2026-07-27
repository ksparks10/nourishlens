"use client";
import { useMemo, useState } from "react";
import { ouncesToGrams, scaleNutrients } from "@/lib/nutrition/scaling";
import type { NormalizedNutrient } from "@/providers/nutrition";
export function ServingPreview({
  defaultGrams,
  nutrients,
}: {
  defaultGrams: number;
  nutrients: NormalizedNutrient[];
}) {
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState<"serving" | "g" | "oz">("serving");
  const grams =
    unit === "serving"
      ? amount * defaultGrams
      : unit === "oz"
        ? ouncesToGrams(amount)
        : amount;
  const scaled = useMemo(
    () => scaleNutrients(nutrients, grams),
    [nutrients, grams],
  );
  return (
    <section className="card">
      <h2>Nutrition preview</h2>
      <div className="serving-controls">
        <label>
          Amount
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) =>
              setAmount(Math.max(0.01, Number(event.target.value)))
            }
          />
        </label>
        <label>
          Unit
          <select
            value={unit}
            onChange={(event) => setUnit(event.target.value as typeof unit)}
          >
            <option value="serving">serving</option>
            <option value="g">grams</option>
            <option value="oz">ounces</option>
          </select>
        </label>
        <span>{grams.toFixed(1)} g</span>
      </div>
      <dl className="nutrient-grid">
        {scaled.map((nutrient) => (
          <div key={nutrient.key}>
            <dt>{nutrient.name}</dt>
            <dd>
              {nutrient.amount === null
                ? "Not reported"
                : `${nutrient.amount.toFixed(1)} ${nutrient.unit}`}
            </dd>
            <small>{nutrient.classification.replaceAll("_", " ")}</small>
          </div>
        ))}
      </dl>
      <p className="muted">
        “Not reported” is never counted as zero. Missing values can be entered
        from a product label before logging, while eligible projections remain
        clearly identified.
      </p>
    </section>
  );
}
