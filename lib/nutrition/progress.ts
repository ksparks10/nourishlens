export function averageAvailableProgress(
  items: Array<{ percent: number | null } | null>,
) {
  const percentages = items.flatMap((item) =>
    item !== null && item.percent !== null ? [item.percent] : [],
  );
  return percentages.length
    ? Math.round(
        percentages.reduce((sum, percent) => sum + percent, 0) /
          percentages.length,
      )
    : null;
}

type AlignmentTarget = {
  target_amount: number | null;
  minimum_amount: number | null;
  maximum_amount: number | null;
};

export function targetAlignmentPercent(value: number, target: AlignmentTarget) {
  const minimum =
    target.minimum_amount === null ? null : Number(target.minimum_amount);
  const maximum =
    target.maximum_amount === null ? null : Number(target.maximum_amount);

  if (minimum !== null && minimum > 0 && value < minimum)
    return Math.max(0, Math.round((value / minimum) * 100));
  if (maximum !== null && maximum > 0 && value > maximum)
    return Math.max(0, Math.round((maximum / value) * 100));
  if (minimum !== null || maximum !== null) return 100;

  const targetAmount = Number(target.target_amount ?? 0);
  if (targetAmount <= 0) return null;
  const ratio = value / targetAmount;
  return Math.max(0, Math.round((ratio <= 1 ? ratio : 1 / ratio) * 100));
}
