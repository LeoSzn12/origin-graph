import type { Pool } from "pg";
import { rows, transaction } from "@/db";
import type { Confidence, RightsLane } from "@/domain/types";
import { nonEmpty, rightsLaneSchema, uuidSchema } from "@/domain/validation";
import { appendAudit } from "./audit";

interface IdRecord { id: string }

export class CatalogService {
  constructor(private readonly pool: Pool) {}

  async createWitness(input: {
    workId: string;
    sourceEditionId?: string;
    witnessType: string;
    repositoryName?: string;
    repositoryIdentifier?: string;
    material?: string;
    description?: string;
    actor?: string;
  }): Promise<string> {
    uuidSchema.parse(input.workId);
    if (input.sourceEditionId) uuidSchema.parse(input.sourceEditionId);
    return this.insertAudited("witness", input.actor,
      `INSERT INTO witnesses (work_id, source_edition_id, witness_type, repository_name,
        repository_identifier, material, description) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [input.workId, input.sourceEditionId ?? null, nonEmpty.parse(input.witnessType),
        input.repositoryName ?? null, input.repositoryIdentifier ?? null, input.material ?? null,
        input.description ?? null]);
  }

  async createEntity(input: {
    entityType: string;
    preferredName: string;
    names?: unknown[];
    description?: string;
    actor?: string;
  }): Promise<string> {
    return this.insertAudited("entity", input.actor,
      `INSERT INTO entities (entity_type, preferred_name, names, description)
       VALUES ($1,$2,$3::jsonb,$4) RETURNING id`,
      [nonEmpty.parse(input.entityType), nonEmpty.parse(input.preferredName), JSON.stringify(input.names ?? []), input.description ?? null]);
  }

  async assertEntityRole(input: {
    entityId: string;
    roleKey: string;
    nativeLabel?: string;
    tradition: string;
    community?: string;
    sourceClaimId: string;
    confidence?: Confidence;
    actor?: string;
  }): Promise<string> {
    uuidSchema.parse(input.entityId);
    uuidSchema.parse(input.sourceClaimId);
    return this.insertAudited("entity_role_assertion", input.actor,
      `INSERT INTO entity_role_assertions (entity_id, role_key, native_label, tradition,
        community, source_claim_id, confidence) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [input.entityId, nonEmpty.parse(input.roleKey), input.nativeLabel ?? null,
        nonEmpty.parse(input.tradition), input.community ?? null, input.sourceClaimId,
        input.confidence ?? "medium"]);
  }

  async createPlace(input: {
    preferredName: string;
    placeKind: string;
    uncertaintyType: string;
    geometryWkt?: string;
    publicGeometryWkt?: string;
    sensitive?: boolean;
    uncertaintyNote?: string;
    actor?: string;
  }): Promise<string> {
    return this.insertAudited("place", input.actor,
      `INSERT INTO places (preferred_name, place_kind, uncertainty_type, geometry,
        public_geometry, sensitive, uncertainty_note)
       VALUES ($1,$2,$3,CASE WHEN $4::text IS NULL THEN NULL ELSE ST_GeomFromText($4,4326) END,
        CASE WHEN $5::text IS NULL THEN NULL ELSE ST_GeomFromText($5,4326) END,$6,$7) RETURNING id`,
      [nonEmpty.parse(input.preferredName), nonEmpty.parse(input.placeKind),
        nonEmpty.parse(input.uncertaintyType), input.geometryWkt ?? null, input.publicGeometryWkt ?? null,
        input.sensitive ?? false, input.uncertaintyNote ?? null]);
  }

  async createEvent(input: {
    title: string;
    eventType: string;
    description?: string;
    historicityStatus?: string;
    actor?: string;
  }): Promise<string> {
    return this.insertAudited("event", input.actor,
      `INSERT INTO events (title, event_type, description, historicity_status)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [nonEmpty.parse(input.title), nonEmpty.parse(input.eventType), input.description ?? null, input.historicityStatus ?? null]);
  }

  async createMotif(input: {
    slug: string;
    label: string;
    definition: string;
    broaderMotifId?: string;
    actor?: string;
  }): Promise<string> {
    if (input.broaderMotifId) uuidSchema.parse(input.broaderMotifId);
    return this.insertAudited("motif", input.actor,
      `INSERT INTO motifs (slug, label, definition, broader_motif_id) VALUES ($1,$2,$3,$4) RETURNING id`,
      [nonEmpty.parse(input.slug), nonEmpty.parse(input.label), nonEmpty.parse(input.definition), input.broaderMotifId ?? null]);
  }

  async createMediaSegment(input: {
    passageId: string;
    speakerEntityId?: string;
    startMs: number;
    endMs: number;
    transcriptProvenance: "official" | "creator_provided" | "user_provided" | "automated" | "edited" | "unknown";
    speakerConfidence?: number;
    textConfidence?: number;
    rightsLane?: RightsLane;
    actor?: string;
  }): Promise<string> {
    uuidSchema.parse(input.passageId);
    if (input.speakerEntityId) uuidSchema.parse(input.speakerEntityId);
    if (!Number.isInteger(input.startMs) || !Number.isInteger(input.endMs) || input.startMs < 0 || input.endMs < input.startMs) {
      throw new Error("Media segment timestamps must be non-negative integers with start <= end");
    }
    return this.insertAudited("media_segment", input.actor,
      `INSERT INTO media_segments (passage_id, speaker_entity_id, start_ms, end_ms,
        transcript_provenance, speaker_confidence, text_confidence, rights_lane)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [input.passageId, input.speakerEntityId ?? null, input.startMs, input.endMs,
        input.transcriptProvenance, input.speakerConfidence ?? null, input.textConfidence ?? null,
        rightsLaneSchema.parse(input.rightsLane ?? "yellow")]);
  }

  async createConnection(input: {
    fromType: string;
    fromId: string;
    toType: string;
    toId: string;
    connectionType: string;
    explanation: string;
    sourceClaimIds: string[];
    confidence?: Confidence;
    actor?: string;
  }): Promise<string> {
    uuidSchema.parse(input.fromId);
    uuidSchema.parse(input.toId);
    input.sourceClaimIds.forEach((id) => uuidSchema.parse(id));
    if (input.sourceClaimIds.length === 0) throw new Error("Connections require at least one source claim");
    return transaction(this.pool, async (client) => {
      const [connection] = await rows<IdRecord>(client,
        `INSERT INTO connections (from_type, from_id, to_type, to_id, connection_type,
          explanation, confidence) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [nonEmpty.parse(input.fromType), input.fromId, nonEmpty.parse(input.toType), input.toId,
          nonEmpty.parse(input.connectionType), nonEmpty.parse(input.explanation), input.confidence ?? "medium"]);
      for (const claimId of input.sourceClaimIds) {
        await client.query("INSERT INTO connection_source_claims (connection_id, claim_id) VALUES ($1,$2)", [connection.id, claimId]);
      }
      await appendAudit(client, { objectType: "connection", objectId: connection.id, action: "created", actor: input.actor, after: input });
      return connection.id;
    });
  }

  private async insertAudited(objectType: string, actor: string | undefined, sql: string, values: unknown[]): Promise<string> {
    return transaction(this.pool, async (client) => {
      const [record] = await rows<IdRecord>(client, sql, values);
      await appendAudit(client, { objectType, objectId: record.id, action: "created", actor, after: { id: record.id } });
      return record.id;
    });
  }
}
