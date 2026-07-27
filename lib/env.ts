import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
const optionalValue = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );

export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: optionalValue(z.string().min(20)),
    OWNER_BOOTSTRAP_SECRET: optionalValue(z.string().min(32)),
    USDA_FDC_API_KEY: optionalValue(z.string().min(1)),
    OPEN_FOOD_FACTS_USER_AGENT: optionalValue(z.string().min(10)),
    OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
    OLLAMA_VISION_MODEL: z.string().min(1).default("gemma3:4b"),
    STRIPE_BILLING_ENABLED: z.enum(["true", "false"]).default("false"),
    STRIPE_SECRET_KEY: optionalValue(z.string().startsWith("sk_")),
    STRIPE_WEBHOOK_SECRET: optionalValue(z.string().startsWith("whsec_")),
    STRIPE_MONTHLY_PRICE_ID: optionalValue(z.string().startsWith("price_")),
    STRIPE_ANNUAL_PRICE_ID: optionalValue(z.string().startsWith("price_")),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  },
  runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OWNER_BOOTSTRAP_SECRET: process.env.OWNER_BOOTSTRAP_SECRET,
    USDA_FDC_API_KEY: process.env.USDA_FDC_API_KEY,
    OPEN_FOOD_FACTS_USER_AGENT: process.env.OPEN_FOOD_FACTS_USER_AGENT,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    OLLAMA_VISION_MODEL: process.env.OLLAMA_VISION_MODEL,
    STRIPE_BILLING_ENABLED: process.env.STRIPE_BILLING_ENABLED,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_MONTHLY_PRICE_ID: process.env.STRIPE_MONTHLY_PRICE_ID,
    STRIPE_ANNUAL_PRICE_ID: process.env.STRIPE_ANNUAL_PRICE_ID,
  },
});
