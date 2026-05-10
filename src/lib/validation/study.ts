import { z } from "zod";

export const StudyVariantSchema = z.enum(["baseline", "adaptive"]).default("adaptive");

export const StartStudySessionSchema = z.object({
  pseudonym: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, _ and - allowed"),
  variant: StudyVariantSchema,
  /** Bei Variante „adaptive“: Eingriffsstufe 0–3 (fehlt sie, setzt der Server 2). */
  interventionLevel: z.coerce.number().int().min(0).max(3).optional(),
});

/** Aktive Session (Cookies): Variante und ggf. Eingriffsstufe anpassen — gleiche Logik wie beim Session-Start. */
export const UpdateStudySessionSchema = z.object({
  variant: z.enum(["baseline", "adaptive"]),
  interventionLevel: z.coerce.number().int().min(0).max(3).optional(),
});

