import { z } from "zod";

export const sourceInputSchema = z.discriminatedUnion("input_type", [
  z.object({ input_type: z.literal("url"), url: z.url(), title: z.string().trim().optional(), case_file_slugs: z.array(z.string()).default([]) }),
  z.object({ input_type: z.literal("doi"), doi: z.string().trim().min(3), case_file_slugs: z.array(z.string()).default([]) }),
  z.object({ input_type: z.literal("book_citation"), citation: z.string().trim().min(3), title: z.string().trim().min(1), safe_summary: z.string().trim().optional(), case_file_slugs: z.array(z.string()).default([]) }),
  z.object({ input_type: z.literal("manual_note"), note: z.string().trim().min(1), title: z.string().trim().min(1), case_file_slugs: z.array(z.string()).default([]) }),
  z.object({ input_type: z.literal("dataset_id"), dataset_id: z.string().trim().min(1), title: z.string().trim().min(1), case_file_slugs: z.array(z.string()).default([]) }),
  z.object({ input_type: z.literal("media_reference"), media_url: z.url(), title: z.string().trim().min(1), case_file_slugs: z.array(z.string()).default([]) })
]);

export const transcriptInputSchema = z.object({
  title: z.string().trim().min(1),
  episode_title: z.string().trim().min(1),
  show: z.string().trim().optional(),
  media_url: z.url().optional(),
  language: z.string().trim().min(2).default("en"),
  provenance: z.enum(["official", "creator_provided", "user_provided", "automated", "edited", "unknown"]),
  rights_lane: z.enum(["green", "yellow", "red"]).default("yellow"),
  segments: z.array(z.object({
    locator: z.string().trim().min(1),
    safe_summary: z.string().trim().min(1),
    start_ms: z.number().int().nonnegative(),
    end_ms: z.number().int().nonnegative(),
    speaker: z.string().trim().optional(),
    speaker_confidence: z.number().min(0).max(1).optional(),
    text_confidence: z.number().min(0).max(1).optional()
  }).refine((segment) => segment.end_ms >= segment.start_ms, "end_ms must be >= start_ms")).min(1),
  case_file_slugs: z.array(z.string()).default([])
});

export type SourceInput = z.infer<typeof sourceInputSchema>;
export type TranscriptInput = z.infer<typeof transcriptInputSchema>;

