import type { Pool } from "pg";
import { rows, transaction } from "@/db";
import type { ClaimRecord } from "@/domain/types";
import { nonEmpty, uuidSchema } from "@/domain/validation";
import { appendAudit } from "./audit";

export class ClaimService {
  constructor(private readonly pool: Pool) {}

  async createDraft(input: {
    passageId: string;
    claimClass: string;
    statement: string;
    directness?: number;
    interpretationLevel?: number;
    createdBy?: string;
  }): Promise<ClaimRecord> {
    uuidSchema.parse(input.passageId);
    const statement = nonEmpty.parse(input.statement);
    return transaction(this.pool, async (client) => {
      const [claim] = await rows<ClaimRecord>(client,
        `INSERT INTO claims (passage_id, claim_class, evidence_role, statement, directness,
           interpretation_level, created_by)
         SELECT $1, $2, se.evidence_role, $3, $4, $5, $6
         FROM passages p JOIN source_editions se ON se.id = p.source_edition_id WHERE p.id = $1
         RETURNING id, passage_id, claim_class, evidence_role, statement, review_status`,
        [input.passageId, nonEmpty.parse(input.claimClass), statement, input.directness ?? 2,
          input.interpretationLevel ?? 0, input.createdBy ?? null]);
      if (!claim) throw new Error("Passage not found");
      await appendAudit(client, { objectType: "claim", objectId: claim.id, action: "draft_created", actor: input.createdBy, after: claim });
      return claim;
    });
  }
}
