import { z } from "zod";
import { structured, openQuestions } from "./questions";
export const safeUrl = (value: string) => {
  try {
    const u = new URL(value);
    return (
      ["http:", "https:"].includes(u.protocol) && !u.username && !u.password
    );
  } catch {
    return false;
  }
};
export const answerSchema = z
  .object({
    structured: z.record(z.string(), z.string()),
    open: z.record(z.string(), z.string().max(1200)),
  })
  .superRefine((a, ctx) => {
    for (const q of structured) {
      const v = a.structured[q.id];
      const valid =
        q.kind === "time"
          ? /^([01]\d|2[0-3]):[0-5]\d$/.test(v ?? "")
          : q.options?.some((_, i) => String(i) === v);
      if (!valid)
        ctx.addIssue({
          code: "custom",
          message: `Answer required: ${q.label}`,
        });
    }
    for (const q of openQuestions)
      if ((a.open[q.id]?.trim().length ?? 0) < 10)
        ctx.addIssue({
          code: "custom",
          message: `Write at least 10 characters for ${q.label}.`,
        });
  });
export const criteriaSchema = z
  .object({
    location: z.string().trim().min(2).max(100),
    minRent: z.number().int().min(500).max(15000),
    maxRent: z.number().int().min(500).max(15000),
    sample: z.boolean(),
  })
  .refine(
    (v) => v.minRent <= v.maxRent,
    "Minimum rent must not exceed maximum rent.",
  );
export const listingSchema = z
  .object({
    id: z.string().min(1),
    sourceListingId: z.string().optional(),
    title: z.string().min(1),
    neighborhood: z.string().optional(),
    address: z.string().optional(),
    monthlyRent: z.number().positive(),
    bedrooms: z.number().nonnegative().optional(),
    bathrooms: z.number().nonnegative().optional(),
    squareFeet: z.number().positive().optional(),
    imageUrls: z.array(z.string().refine(safeUrl)).max(20),
    originalUrl: z.string().refine(safeUrl).optional(),
    retrievedAt: z.iso.datetime(),
    sample: z.boolean(),
  })
  .refine(
    (v) => v.sample || !!v.originalUrl,
    "Live listings require the original source URL.",
  );
export const messageSchema = z.object({
  id: z.string().min(1).max(100),
  candidateId: z.string().min(1).max(100),
  speaker: z.enum(["user", "tenant", "facilitator"]),
  text: z.string().trim().min(1).max(6000),
  timestamp: z.iso.datetime(),
  status: z.enum(["pending", "sent", "failed"]),
});
export const chatSchema = z
  .object({
    candidateId: z.string().min(1).max(100),
    answers: answerSchema,
    history: z.array(messageSchema).max(30),
  })
  .refine(
    (v) => v.history.every((m) => m.candidateId === v.candidateId),
    "Conversation candidate mismatch.",
  );
