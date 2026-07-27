"use client";

import { useState } from "react";

type PortionMode = "tiny" | "small" | "regular" | "large" | "huge" | "grams";

function gramsFor(
  mode: PortionMode,
  servingGrams: number,
  customGrams: number,
) {
  if (mode === "tiny") return servingGrams * 0.5;
  if (mode === "small") return servingGrams * 0.75;
  if (mode === "large") return servingGrams * 1.5;
  if (mode === "huge") return servingGrams * 2;
  if (mode === "grams") return customGrams;
  return servingGrams;
}

export function PortionSelector({
  servingGrams,
  servingLabel = "1 serving",
  onGramsChange,
}: {
  servingGrams: number;
  servingLabel?: string;
  onGramsChange?: (grams: number) => void;
}) {
  const safeServingGrams = servingGrams > 0 ? servingGrams : 100;
  const [mode, setMode] = useState<PortionMode>("regular");
  const [customGrams, setCustomGrams] = useState(safeServingGrams);
  const grams = gramsFor(mode, safeServingGrams, customGrams);

  function updateMode(next: PortionMode) {
    setMode(next);
    onGramsChange?.(gramsFor(next, safeServingGrams, customGrams));
  }

  function updateCustom(value: number) {
    const next = Math.max(0.1, Math.min(10000, value || 0.1));
    setCustomGrams(next);
    onGramsChange?.(next);
  }

  return (
    <div className="portion-selector">
      <label>
        Portion
        <select
          value={mode}
          onChange={(event) => updateMode(event.target.value as PortionMode)}
        >
          <option value="tiny">
            Tiny ({(safeServingGrams * 0.5).toFixed(1)} g)
          </option>
          <option value="small">
            Small ({(safeServingGrams * 0.75).toFixed(1)} g)
          </option>
          <option value="regular">
            Regular ({servingLabel}, {safeServingGrams.toFixed(1)} g)
          </option>
          <option value="large">
            Large ({(safeServingGrams * 1.5).toFixed(1)} g)
          </option>
          <option value="huge">
            Huge ({(safeServingGrams * 2).toFixed(1)} g)
          </option>
          <option value="grams">Enter grams</option>
        </select>
      </label>
      {mode === "grams" ? (
        <label>
          Exact grams
          <input
            name="grams"
            type="number"
            value={customGrams}
            onChange={(event) => updateCustom(Number(event.target.value))}
            min="0.1"
            max="10000"
            step="0.1"
            required
          />
        </label>
      ) : (
        <>
          <input type="hidden" name="grams" value={grams} />
          <p className="muted">
            Nutrients will be calculated for {grams.toFixed(1)} g.
          </p>
        </>
      )}
    </div>
  );
}
