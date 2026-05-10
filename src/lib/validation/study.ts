import { z } from "zod";

export const StudyVariantSchema = z.enum(["baseline", "adaptive"]).default("adaptive");

const interventionLevelField = z.coerce.number().int().min(0).max(3).optional();

/** Gast: kein User-Code nötig; Server vergibt nacheinander G01, G02 (max. zwei Gast-Konten). */
const GuestStartSchema = z.object({
  guest: z.literal(true),
  variant: z.enum(["baseline", "adaptive"]),
  interventionLevel: interventionLevelField,
});

const NamedStartSchema = z.object({
  pseudonym: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, _ and - allowed"),
  variant: StudyVariantSchema,
  interventionLevel: interventionLevelField,
});

export const StartStudySessionSchema = z.union([GuestStartSchema, NamedStartSchema]);

/** Aktive Session (Cookies): Variante und ggf. Eingriffsstufe anpassen — gleiche Logik wie beim Session-Start. */
export const UpdateStudySessionSchema = z.object({
  variant: z.enum(["baseline", "adaptive"]),
  interventionLevel: z.coerce.number().int().min(0).max(3).optional(),
});
