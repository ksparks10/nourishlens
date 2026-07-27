import { describe, expect, it } from "vitest";
import {
  averageAvailableProgress,
  targetAlignmentPercent,
} from "../../lib/nutrition/progress";

describe("dashboard progress", () => {
  it("averages only macros with usable data", () => {
    expect(
      averageAvailableProgress([{ percent: 40 }, null, { percent: 80 }]),
    ).toBe(60);
  });

  it("ignores unavailable target percentages", () => {
    expect(averageAvailableProgress([{ percent: null }, null])).toBeNull();
  });

  it("gives full alignment anywhere inside an acceptable range", () => {
    expect(
      targetAlignmentPercent(858, {
        target_amount: 400,
        minimum_amount: 400,
        maximum_amount: 1000,
      }),
    ).toBe(100);
  });

  it("measures progress toward a minimum without rewarding excess", () => {
    const minimumTarget = {
      target_amount: 120,
      minimum_amount: 120,
      maximum_amount: null,
    };
    expect(targetAlignmentPercent(60, minimumTarget)).toBe(50);
    expect(targetAlignmentPercent(240, minimumTarget)).toBe(100);
  });

  it("reduces alignment only after a genuine maximum is exceeded", () => {
    const maximumTarget = {
      target_amount: 30,
      minimum_amount: null,
      maximum_amount: 30,
    };
    expect(targetAlignmentPercent(20, maximumTarget)).toBe(100);
    expect(targetAlignmentPercent(36, maximumTarget)).toBe(83);
  });
});
