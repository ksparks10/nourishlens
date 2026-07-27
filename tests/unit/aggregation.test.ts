import { describe, expect, it } from "vitest";
import { aggregateSnapshots } from "../../lib/nutrition/aggregation";
describe("diary aggregation", () => {
  const rows = [
    { nutrientKey: "iron", amount: 5, classification: "calculated" },
    {
      nutrientKey: "iron",
      amount: 2,
      classification: "projected",
      lowerBound: 1,
      upperBound: 3,
    },
    { nutrientKey: "iron", amount: null, classification: "not_reported" },
  ];
  it("keeps calculated and projected totals separate", () =>
    expect(aggregateSnapshots(rows).iron).toMatchObject({
      calculated: 5,
      projected: 2,
      excludingProjections: 5,
      includingProjections: 7,
      missingCount: 1,
    }));
  it("excludes projections on request", () =>
    expect(aggregateSnapshots(rows, false).iron?.includingProjections).toBe(5));
  it("calculates projected share", () =>
    expect(aggregateSnapshots(rows).iron?.projectedPercentage).toBe(28.6));
  it("aggregates uncertainty bounds", () =>
    expect(aggregateSnapshots(rows).iron).toMatchObject({
      lowerBound: 6,
      upperBound: 8,
    }));
  it("does not treat missing as zero-valued coverage", () =>
    expect(
      aggregateSnapshots([
        { nutrientKey: "zinc", amount: null, classification: "not_reported" },
      ]).zinc,
    ).toMatchObject({ includingProjections: 0, missingCount: 1 }));
});
