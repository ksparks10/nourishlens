import { describe, expect, it } from "vitest";
import { ageOnDate, calculateTargets } from "../../lib/nutrition/targets";
describe("target engine", () => {
  const base = {
    age: 35,
    heightCm: 175,
    weightKg: 75,
    biologicalSex: "male" as const,
    activityLevel: "moderate" as const,
    goal: "maintain" as const,
  };
  it("uses age, body dimensions, sex input, activity and goal", () => {
    const sedentary = calculateTargets({
      ...base,
      activityLevel: "sedentary",
    })[0]!;
    const active = calculateTargets({
      ...base,
      activityLevel: "very_active",
    })[0]!;
    expect(active.amount).toBeGreaterThan(sedentary.amount);
  });
  it("applies goal adjustment", () => {
    const maintain = calculateTargets(base)[0]!.amount;
    const loss = calculateTargets({ ...base, goal: "lose" })[0]!.amount;
    expect(loss).toBeLessThan(maintain);
  });
  it("preserves user overrides", () => {
    const targets = calculateTargets({
      ...base,
      customCalories: 2400,
      customProtein: 160,
    });
    expect(targets[0]).toMatchObject({ amount: 2400, overridden: true });
    expect(targets[1]).toMatchObject({ amount: 160, overridden: true });
  });
  it("distinguishes minimum range and maximum targets", () => {
    const targets = calculateTargets(base);
    expect(targets.find((t) => t.key === "protein")?.targetType).toBe(
      "minimum",
    );
    expect(targets.find((t) => t.key === "energy_kcal")?.targetType).toBe(
      "range",
    );
    expect(targets.find((t) => t.key === "sodium")?.targetType).toBe("maximum");
  });
  it("creates the complete micronutrient target set", () => {
    const targets = calculateTargets(base);
    expect(targets).toHaveLength(47);
    expect(targets.find((t) => t.key === "vitamin_b12")).toMatchObject({
      amount: 2.4,
      unit: "mcg",
    });
    expect(targets.find((t) => t.key === "potassium")?.amount).toBe(3400);
  });
  it("calculates recognized advanced targets", () => {
    const targets = calculateTargets(base);
    expect(
      targets.find((target) => target.key === "saturated_fat"),
    ).toMatchObject({
      targetType: "range",
      minimum: 1,
      methodology: "who_fat_guideline_2023",
    });
    expect(targets.find((target) => target.key === "trans_fat")).toMatchObject({
      targetType: "maximum",
      methodology: "who_fat_guideline_2023",
    });
    expect(targets.find((target) => target.key === "leucine")?.amount).toBe(
      3.15,
    );
    expect(targets.find((target) => target.key === "ala")?.amount).toBe(1600);
  });
  it("uses sex-specific iron and magnesium references", () => {
    const male = calculateTargets(base),
      female = calculateTargets({ ...base, biologicalSex: "female" });
    expect(male.find((t) => t.key === "iron")?.amount).toBe(8);
    expect(female.find((t) => t.key === "iron")?.amount).toBe(18);
    expect(female.find((t) => t.key === "magnesium")?.amount).toBe(320);
  });
  it("calculates age at a date boundary", () =>
    expect(ageOnDate("2000-07-12", new Date("2026-07-11T00:00:00Z"))).toBe(25));
});
