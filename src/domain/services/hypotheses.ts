import type { Pool } from "pg";
import { transaction } from "@/db";
import type { EvidenceStance } from "@/domain/types";
import { evidenceStanceSchema, nonEmpty, uuidSchema } from "@/domain/validation";
import { appendAudit } from "./audit";

export class HypothesisService {
  constructor(private readonly pool: Pool) {}

  async createDraft(input: {
    slug: string;
    title: string;
    proposition: string;
    scope: string;
    predictions?: string[];
    falsifiers?: string[];
    alternatives?: string[];
    actor?: string;
  }): Promise<string> {
    return transaction(this.pool, async (client) => {
      const result = await client.query<{ id: string }>(
        `INSERT INTO hypotheses (slug, title, proposition, scope, predicted_observations,
          falsifiers, alternatives, private_workspace)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,true) RETURNING id`,
        [nonEmpty.parse(input.slug), nonEmpty.parse(input.title), nonEmpty.parse(input.proposition),
          nonEmpty.parse(input.scope), JSON.stringify(input.predictions ?? []),
          JSON.stringify(input.falsifiers ?? []), JSON.stringify(input.alternatives ?? [])]);
      const id = result.rows[0].id;
      await appendAudit(client, { objectType: "hypothesis", objectId: id, action: "draft_created", actor: input.actor, after: input });
      return id;
    });
  }

  async addEvidence(input: {
    hypothesisId: string;
    claimId: string;
    stance: EvidenceStance;
    evidenceDomain: string;
    independenceCluster?: string;
    reviewerNote?: string;
    actor?: string;
  }): Promise<string> {
    uuidSchema.parse(input.hypothesisId);
    uuidSchema.parse(input.claimId);
    return transaction(this.pool, async (client) => {
      const result = await client.query<{ id: string }>(
        `INSERT INTO evidence_items (hypothesis_id, claim_id, stance, evidence_domain,
          independence_cluster, reviewer_note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [input.hypothesisId, input.claimId, evidenceStanceSchema.parse(input.stance),
          nonEmpty.parse(input.evidenceDomain), input.independenceCluster ?? null, input.reviewerNote ?? null]);
      const id = result.rows[0].id;
      await appendAudit(client, { objectType: "evidence_item", objectId: id, action: "created", actor: input.actor, after: input });
      return id;
    });
  }
}
