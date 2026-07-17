import type { Pool } from "pg";
import { rows, transaction } from "@/db";
import type { Confidence, ReviewStatus, TemporalRole } from "@/domain/types";
import { dateIntervalSchema, nonEmpty, uuidSchema } from "@/domain/validation";
import { appendAudit } from "./audit";

export interface TemporalAssertionRecord {
  id: string;
  target_type: string;
  target_id: string;
  role: TemporalRole;
  earliest_year: number | null;
  latest_year: number | null;
  display_label: string;
  confidence: Confidence;
  review_status: ReviewStatus;
}

export class TemporalAssertionService {
  constructor(private readonly pool: Pool) {}

  async create(input: {
    targetType: string;
    targetId: string;
    earliestYear: number | null;
    latestYear: number | null;
    role: TemporalRole;
    displayLabel: string;
    eraSystem: string;
    precision: string;
    datingMethod?: string | null;
    chronologyModel?: string | null;
    calibrated?: boolean | null;
    confidence?: Confidence;
    sourceClaimId?: string | null;
    note?: string | null;
    actor?: string;
  }): Promise<TemporalAssertionRecord> {
    uuidSchema.parse(input.targetId);
    const targetType = nonEmpty.parse(input.targetType);
    const date = dateIntervalSchema.parse(input);
    return transaction(this.pool, async (client) => {
      const [assertion] = await rows<TemporalAssertionRecord>(client,
        `INSERT INTO temporal_assertions (target_type, target_id, role, earliest_year, latest_year,
          display_label, era_system, precision, dating_method, chronology_model, calibrated,
          confidence, source_claim_id, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id, target_type, target_id, role, earliest_year, latest_year,
           display_label, confidence, review_status`,
        [targetType, input.targetId, date.role, date.earliestYear, date.latestYear,
          date.displayLabel, date.eraSystem, date.precision, date.datingMethod ?? null,
          date.chronologyModel ?? null, date.calibrated ?? null, date.confidence,
          date.sourceClaimId ?? null, date.note ?? null]);
      await appendAudit(client, { objectType: "temporal_assertion", objectId: assertion.id, action: "created", actor: input.actor, after: assertion });
      return assertion;
    });
  }

  async forTarget(targetType: string, targetId: string): Promise<TemporalAssertionRecord[]> {
    return rows<TemporalAssertionRecord>(this.pool,
      `SELECT id, target_type, target_id, role, earliest_year, latest_year,
        display_label, confidence, review_status
       FROM temporal_assertions WHERE target_type=$1 AND target_id=$2 ORDER BY role, earliest_year`,
      [nonEmpty.parse(targetType), uuidSchema.parse(targetId)]);
  }
}
