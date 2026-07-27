import { foodNameMatchScore } from "./search-query";

const nonFoodScenePattern =
  /\b(background|cardboard|cloth|countertop|fabric|fork|knife|napkin|packaging|placemat|spoon|tablecloth|tray|utensils?|wrapper)\b/i;

export function isLikelyEdibleDetection(name: string, preparation = "") {
  const description = `${name} ${preparation}`.trim();
  return Boolean(description) && !nonFoodScenePattern.test(description);
}

export function isPlausiblePhotoCatalogMatch(
  detectedFoodName: string,
  candidateFoodName: string,
) {
  const detected = detectedFoodName.toLowerCase();
  const candidate = candidateFoodName.toLowerCase();
  const componentTerms = [
    "dressing",
    "sauce",
    "gravy",
    "spread",
    "dip",
    "topping",
  ];
  const detectedComponent = componentTerms.find((term) =>
    detected.includes(term),
  );
  if (detectedComponent && !candidate.includes(detectedComponent)) return false;
  return foodNameMatchScore(detectedFoodName, candidateFoodName) > 0;
}
