import { z } from "zod";

export const StudyVariantSchema = z.enum(["baseline", "adaptive"]).optional();

export const StartStudySessionSchema = z.object({
  pseudonym: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, _ and - allowed"),
  variant: StudyVariantSchema,
});

