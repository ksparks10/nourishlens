import { describe, expect, it } from "vitest";
import {
  confidenceCategory,
  evaluateProjectionCandidate,
  isProjectionIncluded,
  projectedShare,
} from "../../lib/nutrition/projections";
describe("projection confidence", () => {
  it("classifies threshold boundaries", () => {
    expect(confidenceCategory(0.85)).toBe("high");
    expect(confidenceCategory(0.65)).toBe("moderate");
    expect(confidenceCategory(0.4)).toBe("low");
    expect(confidenceCategory(0.3999)).toBe("experimental");
  });
  it("includes only approved sufficiently confident missing values", () => {
    expect(
      isProjectionIncluded({
        score: 0.78,
        status: "approved",
        hasAuthoritativeValue: false,
      }),
    ).toBe(true);
    expect(
      isProjectionIncluded({
        score: 0.9,
        status: "approved",
        hasAuthoritativeValue: true,
      }),
    ).toBe(false);
    expect(
      isProjectionIncluded({
        score: 0.64,
        status: "approved",
        hasAuthoritativeValue: false,
      }),
    ).toBe(false);
    expect(
      isProjectionIncluded({
        score: 0.9,
        status: "pending",
        hasAuthoritativeValue: false,
      }),
    ).toBe(false);
  });
  it("excludes experimental values by default", () =>
    expect(
      isProjectionIncluded({
        score: 0.3,
        status: "approved",
        hasAuthoritativeValue: false,
        category: "experimental",
      }),
    ).toBe(false));
  it("calculates projected share", () =>
    expect(projectedShare(4, 4, 2)).toBe(20));
});
describe("projection restrictions", () => {
  it("rejects unknown serving weights", () =>
    expect(
      evaluateProjectionCandidate({
        referenceCount: 2,
        similarityScore: 0.9,
        varianceRatio: 0.1,
        servingWeightKnown: false,
        sourceComplete: true,
        highVariability: false,
        bioactive: false,
      }),
    ).toMatchObject({ eligible: false }));
  it("requires matching species and preparation for bioactives", () =>
    expect(
      evaluateProjectionCandidate({
        referenceCount: 2,
        similarityScore: 0.9,
        varianceRatio: 0.1,
        servingWeightKnown: true,
        sourceComplete: true,
        highVariability: false,
        bioactive: true,
        foodSpeciesMatch: true,
        preparationMatch: false,
      }).reasons,
    ).toContain("bioactive requires matching species and preparation"));
  it("accepts a well-supported candidate", () =>
    expect(
      evaluateProjectionCandidate({
        referenceCount: 3,
        similarityScore: 0.9,
        varianceRatio: 0.1,
        servingWeightKnown: true,
        sourceComplete: true,
        highVariability: false,
        bioactive: false,
      }).eligible,
    ).toBe(true));
});
