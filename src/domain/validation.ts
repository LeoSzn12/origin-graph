import { z } from "zod";
import { evidenceStances, reviewStatuses, rightsLanes, sourceEvidenceRoles, temporalRoles } from "./types";

export const uuidSchema = z.uuid();
export const nonEmpty = z.string().trim().min(1);
export const reviewStatusSchema = z.enum(reviewStatuses);
export const rightsLaneSchema = z.enum(rightsLanes);
export const evidenceRoleSchema = z.enum(sourceEvidenceRoles);
export const temporalRoleSchema = z.enum(temporalRoles);
export const evidenceStanceSchema = z.enum(evidenceStances);

export const dateIntervalSchema = z.object({
  earliestYear: z.number().int().nullable(),
  latestYear: z.number().int().nullable(),
  role: temporalRoleSchema,
  displayLabel: nonEmpty,
  eraSystem: nonEmpty,
  precision: nonEmpty,
  datingMethod: z.string().trim().nullable().optional(),
  chronologyModel: z.string().trim().nullable().optional(),
  calibrated: z.boolean().nullable().optional(),
  confidence: z.enum(["very_low", "low", "medium", "high", "very_high"]).default("medium"),
  sourceClaimId: uuidSchema.nullable().optional(),
  note: z.string().nullable().optional()
}).superRefine((value, context) => {
  if (value.earliestYear !== null && value.latestYear !== null && value.earliestYear > value.latestYear) {
    context.addIssue({ code: "custom", message: "earliestYear must be <= latestYear" });
  }
  if (value.role === "phenomenon_date" && !value.datingMethod) {
    context.addIssue({ code: "custom", message: "phenomenon_date requires a dating method" });
  }
});
