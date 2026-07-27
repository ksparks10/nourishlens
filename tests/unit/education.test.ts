import { describe, expect, it } from "vitest";
import { getNutrientEducation } from "../../lib/nutrition/education";

describe("nutrient education", () => {
  it("provides complete education for a specific compound", () => {
    const education = getNutrientEducation(
      "vitamin_c",
      "Vitamin C",
      "vitamins",
    );
    expect(education.roles.length).toBeGreaterThan(1);
    expect(education.foodSources.length).toBeGreaterThan(1);
    expect(education.chemistry).toContain("C₆H₈O₆");
    expect(education.chemicalQuery).toBe("ascorbic acid");
  });

  it("does not pretend an aggregate has one chemical structure", () => {
    const education = getNutrientEducation(
      "total_polyphenols",
      "Total polyphenols",
      "polyphenols",
    );
    expect(education.chemistry).toContain("many molecules");
    expect(education.chemicalQuery).toBeUndefined();
  });

  it("provides a PubChem structure query for individual amino acids", () => {
    const education = getNutrientEducation("leucine", "Leucine", "amino_acids");
    expect(education.chemicalQuery).toBe("Leucine");
  });
});
