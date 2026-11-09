import { z } from "zod";
export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().default(3333),
    WEB_ORIGIN: z.string().default("http://localhost:5173"),
    DATA_BACKEND: z.enum(["memory", "postgres"]).default("memory"),
    DATABASE_URL: z
      .string()
      .default("postgresql://pulseops:pulseops@localhost:5432/pulseops"),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    SESSION_SECRET: z
      .string()
      .min(32)
      .default("development-only-secret-change-me-1234"),
    LLM_PROVIDER: z.enum(["demo", "openai"]).default("demo"),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  })
  .superRefine((environment, context) => {
    if (
      environment.NODE_ENV === "production" &&
      environment.SESSION_SECRET.startsWith("development-only")
    )
      context.addIssue({
        code: "custom",
        path: ["SESSION_SECRET"],
        message: "Production requires a dedicated SESSION_SECRET",
      });
    if (environment.LLM_PROVIDER === "openai" && !environment.OPENAI_API_KEY)
      context.addIssue({
        code: "custom",
        path: ["OPENAI_API_KEY"],
        message: "OPENAI_API_KEY is required when LLM_PROVIDER=openai",
      });
  });
export type AppEnv = z.infer<typeof envSchema>;
