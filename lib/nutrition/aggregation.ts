export interface SnapshotAmount {
  nutrientKey: string;
  amount: number | null;
  classification: string;
  lowerBound?: number | null;
  upperBound?: number | null;
}
export interface NutrientAggregate {
  confirmed: number;
  calculated: number;
  projected: number;
  userEntered: number;
  excludingProjections: number;
  includingProjections: number;
  projectedPercentage: number;
  lowerBound: number;
  upperBound: number;
  missingCount: number;
}
const add = (a: number, b: number) => Math.round((a + b) * 1e6) / 1e6;
export function aggregateSnapshots(
  rows: SnapshotAmount[],
  includeProjections = true,
) {
  const output: Record<string, NutrientAggregate> = {};
  for (const row of rows) {
    const total = output[row.nutrientKey] ?? {
      confirmed: 0,
      calculated: 0,
      projected: 0,
      userEntered: 0,
      excludingProjections: 0,
      includingProjections: 0,
      projectedPercentage: 0,
      lowerBound: 0,
      upperBound: 0,
      missingCount: 0,
    };
    if (row.amount === null) {
      total.missingCount++;
      output[row.nutrientKey] = total;
      continue;
    }
    if (
      ["measured", "provider_reported", "confirmed_zero"].includes(
        row.classification,
      )
    )
      total.confirmed = add(total.confirmed, row.amount);
    else if (row.classification === "calculated")
      total.calculated = add(total.calculated, row.amount);
    else if (row.classification === "projected")
      total.projected = add(total.projected, row.amount);
    else if (row.classification === "user_entered")
      total.userEntered = add(total.userEntered, row.amount);
    if (row.classification !== "projected")
      total.excludingProjections = add(total.excludingProjections, row.amount);
    if (row.classification !== "projected" || includeProjections)
      total.includingProjections = add(total.includingProjections, row.amount);
    total.lowerBound = add(total.lowerBound, row.lowerBound ?? row.amount);
    total.upperBound = add(total.upperBound, row.upperBound ?? row.amount);
    total.projectedPercentage =
      total.includingProjections > 0
        ? Math.round((total.projected / total.includingProjections) * 1000) / 10
        : 0;
    output[row.nutrientKey] = total;
  }
  return output;
}
