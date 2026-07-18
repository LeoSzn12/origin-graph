import type { Pool } from "pg";

export type QueryIntent = "factual_lookup" | "chronology" | "comparison" | "motif_search" | "evidence_assessment" | "source_request" | "hypothesis_exploration";

export interface EmbeddingProvider {
  readonly key: string;
  embed(text: string): Promise<number[] | null>;
}

export class DisabledEmbeddingProvider implements EmbeddingProvider {
  readonly key = "disabled";
  async embed(): Promise<null> { return null; }
}

const stopWords = new Set(["a", "an", "and", "are", "around", "about", "by", "do", "does", "for", "from", "how", "in", "is", "it", "not", "of", "on", "or", "say", "says", "report", "reports", "reported", "record", "records", "describe", "describes", "period", "scientific", "that", "the", "this", "to", "what", "when", "where", "which", "who", "why", "with", "definitely", "exist", "corpus", "reviewed", "edition", "editions", "passage", "passages", "source", "sources", "evidence"]);
const expansions: Record<string, string[]> = {
  atlantis: ["timaeus", "critias"], flood: ["deluge", "ark"], floods: ["deluge", "ark"],
  giant: ["giants", "nephilim", "enoch", "watchers"], giants: ["nephilim", "enoch", "watchers"],
  vimana: ["vimanam", "firmament"], vimanas: ["vimanam", "firmament"],
  weapon: ["weapons", "astra", "arjuna"], weapons: ["astra", "arjuna"],
  teacher: ["rabbi", "prophet", "sage"], teachers: ["rabbi", "prophet", "sage"],
  moses: ["exodus", "deuteronomy"], jesus: ["matthew", "luke", "john"],
};

export function analyzeQuestion(question: string): { intent: QueryIntent; terms: string[] } {
  const lower = question.toLocaleLowerCase();
  const intent: QueryIntent = /compare|difference|similar/.test(lower) ? "comparison"
    : /when|date|chronolog|timeline/.test(lower) ? "chronology"
      : /support|challenge|evidence|prove|disprove/.test(lower) ? "evidence_assessment"
        : /source|edition|citation|passage/.test(lower) ? "source_request"
          : /motif|pattern/.test(lower) ? "motif_search"
            : /hypoth|could|explain/.test(lower) ? "hypothesis_exploration" : "factual_lookup";
  const base = lower.normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").split(/\s+/)
    .filter((term) => term.length > 2 && !stopWords.has(term));
  const terms = [...new Set(base.flatMap((term) => [term, ...(expansions[term] ?? [])]))].slice(0, 24);
  return { intent, terms: terms.length ? terms : base.slice(0, 8) };
}

export class PostgresHybridRetriever {
  constructor(private readonly pool: Pool, private readonly embeddings: EmbeddingProvider = new DisabledEmbeddingProvider()) {}

  async retrieveClaimIds(question: string, limit = 48): Promise<{ claimIds: string[]; intent: QueryIntent; embeddingProvider: string }> {
    const analysis = analyzeQuestion(question);
    const safeTerms = analysis.terms.filter((term) => /^[\p{L}\p{N}]+$/u.test(term));
    if (!safeTerms.length) return { claimIds: [], intent: analysis.intent, embeddingProvider: this.embeddings.key };
    const tsQuery = safeTerms.map((term) => `${term}:*`).join(" | ");
    // The embedding hook is deliberately provider-neutral. V1 remains deterministic when disabled.
    await this.embeddings.embed(question);
    const result = await this.pool.query<{ claim_id: string }>(
      `WITH direct AS (
         SELECT c.id AS claim_id,
           greatest(ts_rank(c.search_vector, to_tsquery('simple', $1)),
             ts_rank(p.search_vector, to_tsquery('simple', $1))) + 1.0 AS score
           FROM claims c
           LEFT JOIN passages p ON p.id = c.passage_id
           LEFT JOIN source_editions se ON se.id = p.source_edition_id
          WHERE c.search_vector @@ to_tsquery('simple', $1)
             OR p.search_vector @@ to_tsquery('simple', $1)
             OR EXISTS (SELECT 1 FROM unnest($2::text[]) term WHERE se.title ILIKE '%' || term || '%')
       ), case_matches AS (
         SELECT cfo.object_id AS claim_id, 0.72 AS score
           FROM case_files cf JOIN case_file_objects cfo ON cfo.case_file_id = cf.id AND cfo.object_type = 'claim'
          WHERE EXISTS (SELECT 1 FROM unnest($2::text[]) term
                         WHERE cf.title ILIKE '%' || term || '%' OR cf.core_question ILIKE '%' || term || '%')
       ), motif_matches AS (
         SELECT con.from_id AS claim_id, 0.62 AS score
           FROM motifs m JOIN connections con ON con.to_type = 'motif' AND con.to_id = m.id AND con.from_type = 'claim'
          WHERE con.review_status IN ('approved','published')
            AND EXISTS (SELECT 1 FROM unnest($2::text[]) term
                         WHERE m.label ILIKE '%' || term || '%' OR m.definition ILIKE '%' || term || '%')
       ), entity_matches AS (
         SELECT c.id AS claim_id, 0.66 AS score
           FROM entities e JOIN claims c ON c.subject_entity_id = e.id
          WHERE EXISTS (SELECT 1 FROM unnest($2::text[]) term WHERE e.preferred_name ILIKE '%' || term || '%')
       ), ranked AS (
         SELECT claim_id, max(score) AS score FROM (
           SELECT * FROM direct UNION ALL SELECT * FROM case_matches
           UNION ALL SELECT * FROM motif_matches UNION ALL SELECT * FROM entity_matches
         ) matches GROUP BY claim_id
       )
       SELECT claim_id FROM ranked ORDER BY score DESC, claim_id LIMIT $3`,
      [tsQuery, safeTerms, limit],
    );
    return { claimIds: result.rows.map((row) => row.claim_id), intent: analysis.intent, embeddingProvider: this.embeddings.key };
  }
}
