import { z } from "zod";
import { localDateInputValue } from "@/lib/date/local-date";
export const diaryEntrySchema = z.object({
  food_id: z.string().uuid(),
  grams: z.coerce.number().positive().max(10000),
  meal_type: z.enum([
    "breakfast",
    "morning_snack",
    "lunch",
    "afternoon_snack",
    "dinner",
    "evening_snack",
  ]),
  date: z.string().date(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  notes: z.string().trim().max(500).optional(),
});
export function validDiaryDate(value: string | undefined) {
  const today = localDateInputValue();
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value! : today;
}
