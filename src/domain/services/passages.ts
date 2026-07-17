import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { rows, transaction } from "@/db";
import type { PassageRecord } from "@/domain/types";
import { nonEmpty, uuidSchema } from "@/domain/validation";
import { appendAudit } from "./audit";

export class PassageService {
  constructor(private readonly pool: Pool) {}

  async create(input: {
    sourceEditionId: string;
    witnessId?: string;
    locatorType: string;
    locatorValue: string;
    originalText?: string;
    transliteration?: string;
    translationText?: string;
    safeSummary?: string;
    actor?: string;
  }): Promise<PassageRecord> {
    uuidSchema.parse(input.sourceEditionId);
    if (input.witnessId) uuidSchema.parse(input.witnessId);
    const locatorType = nonEmpty.parse(input.locatorType);
    const locatorValue = nonEmpty.parse(input.locatorValue);
    const hashPayload = [input.originalText, input.transliteration, input.translationText, input.safeSummary].filter(Boolean).join("\n");
    const textHash = createHash("sha256").update(hashPayload || `${locatorType}:${locatorValue}`).digest("hex");
    return transaction(this.pool, async (client) => {
      const [passage] = await rows<PassageRecord>(client,
        `INSERT INTO passages (source_edition_id, witness_id, locator_type, locator_value,
           original_text, transliteration, translation_text, safe_summary, text_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, source_edition_id, locator_type, locator_value, review_status`,
        [input.sourceEditionId, input.witnessId ?? null, locatorType, locatorValue,
          input.originalText ?? null, input.transliteration ?? null, input.translationText ?? null,
          input.safeSummary ?? null, textHash]);
      await appendAudit(client, { objectType: "passage", objectId: passage.id, action: "created", actor: input.actor, after: passage });
      return passage;
    });
  }
}
