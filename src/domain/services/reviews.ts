import type { Pool } from "pg";
import { rows, transaction } from "@/db";
import type { ReviewStatus } from "@/domain/types";
import { nonEmpty, reviewStatusSchema, uuidSchema } from "@/domain/validation";
import { appendAudit } from "./audit";

const reviewableTables = {
  source_edition: "source_editions",
  witness: "witnesses",
  passage: "passages",
  claim: "claims",
  temporal_assertion: "temporal_assertions",
  place: "places",
  entity: "entities",
  entity_role_assertion: "entity_role_assertions",
  event: "events",
  motif: "motifs",
  connection: "connections",
  source_relationship: "source_relationships",
  media_segment: "media_segments",
  hypothesis: "hypotheses",
  evidence_item: "evidence_items",
  case_file: "case_files"
} as const;

type ReviewableType = keyof typeof reviewableTables;

const transitions: Record<ReviewStatus, ReviewStatus[]> = {
  inbox: ["fetched", "draft", "blocked"],
  fetched: ["parsed", "draft", "blocked"],
  parsed: ["draft", "in_review", "blocked"],
  draft: ["in_review", "blocked"],
  in_review: ["approved", "draft", "blocked"],
  approved: ["published", "draft"],
  published: ["superseded", "retracted"],
  superseded: [],
  retracted: [],
  blocked: ["draft", "in_review"]
};

export class ReviewService {
  constructor(private readonly pool: Pool) {}

  async transition(input: {
    objectType: ReviewableType;
    objectId: string;
    to: ReviewStatus;
    reviewer: string;
    note?: string;
  }): Promise<void> {
    uuidSchema.parse(input.objectId);
    const to = reviewStatusSchema.parse(input.to);
    const reviewer = nonEmpty.parse(input.reviewer);
    const table = reviewableTables[input.objectType];
    if (!table) throw new Error("Unsupported review object type");
    await transaction(this.pool, async (client) => {
      const [before] = await rows<{ review_status: ReviewStatus } & Record<string, unknown>>(
        client, `SELECT * FROM ${table} WHERE id = $1 FOR UPDATE`, [input.objectId]);
      if (!before) throw new Error(`${input.objectType} not found`);
      if (!transitions[before.review_status].includes(to)) {
        throw new Error(`Invalid review transition: ${before.review_status} -> ${to}`);
      }
      if (input.objectType === "source_edition" && to === "published") {
        const source = before as typeof before & { rights_reviewed_at: string | null; publication_allowed: boolean };
        if (!source.rights_reviewed_at || !source.publication_allowed) {
          throw new Error("SOURCE_RIGHTS_UNRESOLVED: source rights must be approved before publication");
        }
      }
      await client.query(`UPDATE ${table} SET review_status = $2 WHERE id = $1`, [input.objectId, to]);
      const decision = to === "published" ? "publish" : to === "approved" ? "approve" : to === "retracted" ? "retract" : "request_changes";
      await client.query(
        `INSERT INTO reviews (object_type, object_id, decision, reviewer, note) VALUES ($1,$2,$3,$4,$5)`,
        [input.objectType, input.objectId, decision, reviewer, input.note ?? null]);
      await appendAudit(client, {
        objectType: input.objectType,
        objectId: input.objectId,
        action: `review_status:${before.review_status}->${to}`,
        actor: reviewer,
        before,
        after: { ...before, review_status: to }
      });
    });
  }
}
