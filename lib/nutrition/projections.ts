export type ConfidenceCategory = "high" | "moderate" | "low" | "experimental";
export interface ProjectionThresholds {
  high: number;
  moderate: number;
  low: number;
  minimumIncluded: number;
  experimentalEnabled: boolean;
}
export const defaultThresholds: ProjectionThresholds = {
  high: 0.85,
  moderate: 0.65,
  low: 0.4,
  minimumIncluded: 0.65,
  experimentalEnabled: false,
};
export function confidenceCategory(
  score: number,
  thresholds = defaultThresholds,
): ConfidenceCategory {
  if (score < 0 || score > 1)
    throw new Error("Confidence must be between 0 and 1");
  if (score >= thresholds.high) return "high";
  if (score >= thresholds.moderate) return "moderate";
  if (score >= thresholds.low) return "low";
  return "experimental";
}
export function isProjectionIncluded(
  input: {
    score: number;
    status: string;
    hasAuthoritativeValue: boolean;
    methodMinimum?: number;
    category?: ConfidenceCategory;
  },
  thresholds = defaultThresholds,
) {
  if (input.status !== "approved" || input.hasAuthoritativeValue) return false;
  const category =
    input.category ?? confidenceCategory(input.score, thresholds);
  if (category === "experimental" && !thresholds.experimentalEnabled)
    return false;
  return (
    input.score >=
    Math.max(thresholds.minimumIncluded, input.methodMinimum ?? 0)
  );
}
export function projectedShare(
  confirmed: number,
  calculated: number,
  projected: number,
  userEntered = 0,
) {
  const total = confirmed + calculated + projected + userEntered;
  return total > 0 ? Math.round((projected / total) * 1000) / 10 : 0;
}
export interface ProjectionCandidate {
  referenceCount: number;
  similarityScore: number | null;
  varianceRatio: number | null;
  servingWeightKnown: boolean;
  sourceComplete: boolean;
  highVariability: boolean;
  bioactive: boolean;
  foodSpeciesMatch?: boolean;
  preparationMatch?: boolean;
}
export function evaluateProjectionCandidate(candidate: ProjectionCandidate) {
  const reasons: string[] = [];
  if (!candidate.servingWeightKnown) reasons.push("serving weight is unknown");
  if (!candidate.sourceComplete) reasons.push("reference data is incomplete");
  if (candidate.referenceCount < 1) reasons.push("no reference records");
  if (candidate.similarityScore === null || candidate.similarityScore < 0.6)
    reasons.push("similarity is insufficient");
  if (candidate.highVariability) reasons.push("nutrient varies too widely");
  if (
    candidate.bioactive &&
    (!candidate.foodSpeciesMatch || !candidate.preparationMatch)
  )
    reasons.push("bioactive requires matching species and preparation");
  const score = reasons.length
    ? 0
    : Math.max(
        0,
        Math.min(
          1,
          (candidate.similarityScore ?? 0) * 0.7 +
            Math.min(candidate.referenceCount / 5, 1) * 0.2 +
            (candidate.varianceRatio === null
              ? 0.05
              : Math.max(0, 0.1 - candidate.varianceRatio * 0.1)),
        ),
      );
  return {
    eligible: reasons.length === 0 && score >= 0.4,
    score: Math.round(score * 10000) / 10000,
    reasons,
  };
}
