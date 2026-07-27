import { describe, expect, it } from "vitest";
import {
  centimetersToInches,
  centimetersToFeetInches,
  feetInchesToCentimeters,
  inchesToCentimeters,
  kilogramsToPounds,
  poundsToKilograms,
} from "../../lib/measurements";
describe("measurement conversion", () => {
  it("converts height", () => {
    expect(centimetersToInches(177.8)).toBe(70);
    expect(inchesToCentimeters(70)).toBe(177.8);
  });
  it("converts US height as feet and inches", () => {
    expect(centimetersToFeetInches(187.96)).toEqual({ feet: 6, inches: 2 });
    expect(feetInchesToCentimeters(6, 2)).toBe(187.96);
  });
  it("converts weight", () => {
    expect(kilogramsToPounds(90.72)).toBe(200);
    expect(poundsToKilograms(200)).toBeCloseTo(90.72, 1);
  });
});
