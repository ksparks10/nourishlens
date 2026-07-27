export type ActivityLevel =
  "sedentary" | "light" | "moderate" | "very_active" | "extra_active";
export type Goal =
  | "maintain"
  | "lose"
  | "gain"
  | "build_muscle"
  | "diet_quality"
  | "micronutrients"
  | "custom";
export type BiologicalSex = "female" | "male" | "unspecified";
export interface TargetInput {
  age: number;
  heightCm: number;
  weightKg: number;
  biologicalSex: BiologicalSex;
  activityLevel: ActivityLevel;
  goal: Goal;
  customCalories?: number | null;
  customProtein?: number | null;
}
export interface CalculatedTarget {
  key: string;
  amount: number;
  minimum?: number;
  maximum?: number;
  unit: "kcal" | "g" | "mg" | "mcg";
  targetType: "minimum" | "range" | "maximum";
  methodology:
    | "application_energy_v1"
    | "application_macro_v1"
    | "us_daily_value"
    | "who_fat_guideline_2023"
    | "national_academies_dri";
  overridden: boolean;
}
const activity: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};
const round = (value: number, places = 0) => {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};
export function calculateTargets(input: TargetInput): CalculatedTarget[] {
  if (
    input.age < 13 ||
    input.age > 120 ||
    input.heightCm <= 0 ||
    input.weightKg <= 0
  )
    throw new Error("Invalid target inputs");
  const female = input.biologicalSex === "female";
  const sexOffset = input.biologicalSex === "male" ? 5 : female ? -161 : -78;
  const bmr =
    10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + sexOffset;
  const adjustment =
    input.goal === "lose"
      ? -400
      : input.goal === "gain" || input.goal === "build_muscle"
        ? 300
        : 0;
  const estimated = Math.max(
    1200,
    round(bmr * activity[input.activityLevel] + adjustment),
  );
  const calories = input.customCalories ?? estimated;
  const protein =
    input.customProtein ??
    round(input.weightKg * (input.goal === "build_muscle" ? 1.8 : 1.2), 1);
  const reference = (
    key: string,
    amount: number,
    unit: "mg" | "mcg",
    maximum?: number,
  ): CalculatedTarget => ({
    key,
    amount,
    minimum: amount,
    maximum,
    unit,
    targetType: maximum === undefined ? "minimum" : "range",
    methodology: "us_daily_value",
    overridden: false,
  });
  const minimum = (
    key: string,
    amount: number,
    unit: "g" | "mg" | "mcg",
    methodology: CalculatedTarget["methodology"],
  ): CalculatedTarget => ({
    key,
    amount,
    minimum: amount,
    unit,
    targetType: "minimum",
    methodology,
    overridden: false,
  });
  const maximum = (
    key: string,
    amount: number,
    unit: "g" | "mg",
    methodology: CalculatedTarget["methodology"],
  ): CalculatedTarget => ({
    key,
    amount,
    maximum: amount,
    unit,
    targetType: "maximum",
    methodology,
    overridden: false,
  });
  return [
    {
      key: "energy_kcal",
      amount: calories,
      unit: "kcal",
      targetType: "range",
      minimum: round(calories * 0.9),
      maximum: round(calories * 1.1),
      methodology: "application_energy_v1",
      overridden: input.customCalories != null,
    },
    {
      key: "protein",
      amount: protein,
      unit: "g",
      targetType: "minimum",
      minimum: protein,
      methodology: "application_macro_v1",
      overridden: input.customProtein != null,
    },
    {
      key: "carbohydrate",
      amount: round((calories * 0.5) / 4, 1),
      unit: "g",
      targetType: "range",
      minimum: round((calories * 0.45) / 4, 1),
      maximum: round((calories * 0.65) / 4, 1),
      methodology: "application_macro_v1",
      overridden: false,
    },
    {
      key: "fat",
      amount: round((calories * 0.3) / 9, 1),
      unit: "g",
      targetType: "range",
      minimum: round((calories * 0.2) / 9, 1),
      maximum: round((calories * 0.35) / 9, 1),
      methodology: "application_macro_v1",
      overridden: false,
    },
    {
      key: "fiber",
      amount: round((calories / 1000) * 14, 1),
      minimum: round((calories / 1000) * 14, 1),
      unit: "g",
      targetType: "minimum",
      methodology: "us_daily_value",
      overridden: false,
    },
    {
      key: "sodium",
      amount: 2300,
      unit: "mg",
      targetType: "maximum",
      maximum: 2300,
      methodology: "us_daily_value",
      overridden: false,
    },
    reference("vitamin_a", female ? 700 : 900, "mcg", 3000),
    reference("vitamin_c", female ? 75 : 90, "mg", 2000),
    reference("vitamin_d", 15, "mcg", 100),
    reference("vitamin_e", 15, "mg", 1000),
    reference("vitamin_k", female ? 90 : 120, "mcg"),
    reference("thiamin", female ? 1.1 : 1.2, "mg"),
    reference("riboflavin", female ? 1.1 : 1.3, "mg"),
    reference("niacin", female ? 14 : 16, "mg", 35),
    reference("pantothenic_acid", 5, "mg"),
    reference("vitamin_b6", 1.3, "mg", 100),
    reference("biotin", 30, "mcg"),
    reference("folate", 400, "mcg", 1000),
    reference("vitamin_b12", 2.4, "mcg"),
    reference("choline", female ? 425 : 550, "mg", 3500),
    reference("iron", female ? 18 : 8, "mg", 45),
    reference("calcium", input.age < 19 ? 1300 : 1000, "mg", 2500),
    reference("potassium", female ? 2600 : 3400, "mg"),
    reference("magnesium", female ? 320 : 420, "mg", 350),
    reference("zinc", female ? 8 : 11, "mg", 40),
    reference("phosphorus", 700, "mg", 4000),
    reference("selenium", 55, "mcg", 400),
    reference("copper", 0.9, "mg", 10),
    reference("manganese", female ? 1.8 : 2.3, "mg", 11),
    {
      key: "saturated_fat",
      amount: round((calories * 0.1) / 9, 1),
      minimum: 1,
      maximum: round((calories * 0.1) / 9, 1),
      unit: "g",
      targetType: "range",
      methodology: "who_fat_guideline_2023",
      overridden: false,
    },
    maximum(
      "trans_fat",
      round((calories * 0.01) / 9, 1),
      "g",
      "who_fat_guideline_2023",
    ),
    maximum("cholesterol", 300, "mg", "us_daily_value"),
    maximum("added_sugars", 50, "g", "us_daily_value"),
    minimum("ala", female ? 1100 : 1600, "mg", "national_academies_dri"),
    minimum(
      "omega_6",
      female
        ? input.age > 50
          ? 11000
          : 12000
        : input.age > 50
          ? 14000
          : 17000,
      "mg",
      "national_academies_dri",
    ),
    minimum(
      "leucine",
      round(input.weightKg * 0.042, 2),
      "g",
      "national_academies_dri",
    ),
    minimum(
      "lysine",
      round(input.weightKg * 0.038, 2),
      "g",
      "national_academies_dri",
    ),
    minimum(
      "tryptophan",
      round(input.weightKg * 0.005, 2),
      "g",
      "national_academies_dri",
    ),
    minimum(
      "threonine",
      round(input.weightKg * 0.02, 2),
      "g",
      "national_academies_dri",
    ),
    minimum(
      "isoleucine",
      round(input.weightKg * 0.019, 2),
      "g",
      "national_academies_dri",
    ),
    minimum(
      "valine",
      round(input.weightKg * 0.024, 2),
      "g",
      "national_academies_dri",
    ),
    minimum("iodine", 150, "mcg", "national_academies_dri"),
    minimum(
      "chromium",
      female ? (input.age > 50 ? 20 : 25) : input.age > 50 ? 30 : 35,
      "mcg",
      "national_academies_dri",
    ),
    minimum("molybdenum", 45, "mcg", "national_academies_dri"),
    minimum("fluoride", female ? 3 : 4, "mg", "national_academies_dri"),
    minimum("chloride", 2300, "mg", "national_academies_dri"),
    minimum("water", female ? 2700 : 3700, "g", "national_academies_dri"),
  ];
}
export function ageOnDate(birthDate: string, onDate = new Date()) {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  let age = onDate.getUTCFullYear() - birth.getUTCFullYear();
  if (
    onDate.getUTCMonth() < birth.getUTCMonth() ||
    (onDate.getUTCMonth() === birth.getUTCMonth() &&
      onDate.getUTCDate() < birth.getUTCDate())
  )
    age--;
  return age;
}
