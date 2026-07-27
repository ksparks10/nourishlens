import { z } from "zod";
export const onboardingSchema = z.object({
  birth_date: z.string().date(),
  height_cm: z.coerce.number().min(80).max(260),
  weight_kg: z.coerce.number().min(25).max(500),
  measurement_system: z.enum(["metric", "us"]),
  biological_sex: z.enum(["female", "male", "unspecified"]),
  activity_level: z.enum([
    "sedentary",
    "light",
    "moderate",
    "very_active",
    "extra_active",
  ]),
  primary_goal: z.enum([
    "maintain",
    "lose",
    "gain",
    "build_muscle",
    "diet_quality",
    "micronutrients",
    "custom",
  ]),
  dietary_pattern: z.string().max(50).default("no_preference"),
  custom_calorie_target: z.preprocess(
    (value) => (value === "" ? null : value),
    z.coerce.number().min(1000).max(10000).nullable(),
  ),
  custom_protein_target: z.preprocess(
    (value) => (value === "" ? null : value),
    z.coerce.number().min(10).max(1000).nullable(),
  ),
});
